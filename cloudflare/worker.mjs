const MAX_PLAYERS = 10
const ROOM_RE = /^[A-Z0-9]{4,8}$/
const PROFILE_NAME_MAX = 18
const ALLOWED_ACCESSORIES = new Set(['pañuelo', 'sombrero', 'ninguno'])
const ALLOWED_COLORS = new Set(['#d97d4f', '#4d91b8', '#6eaa63', '#c9a348', '#a96ca8'])
const MAX_INPUT_RATE = 20
const AUTH_TIMEOUT_MS = 5000
const MAX_TOKEN_LENGTH = 8192

function json(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload))
}

export function safeProfile(raw) {
  const name = typeof raw?.name === 'string' ? raw.name.trim().slice(0, PROFILE_NAME_MAX) : ''
  const color = typeof raw?.color === 'string' && ALLOWED_COLORS.has(raw.color) ? raw.color : '#d97d4f'
  const accessory = typeof raw?.accessory === 'string' && ALLOWED_ACCESSORIES.has(raw.accessory) ? raw.accessory : 'pañuelo'
  return { name: name || 'Chicherito', color, accessory }
}

export function safeRoom(value) {
  const room = String(value || '').toUpperCase()
  return ROOM_RE.test(room) ? room : ''
}


export function clampPose(raw, fallback = { x: -17, y: 0, z: 15, vx: 0, vz: 0, jump: false }) {
  const bounded = (value, min, max, previous = 0) => {
    const number = Number(value)
    return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : previous
  }
  return {
    x: bounded(raw?.x, -49, 49, fallback.x),
    y: bounded(raw?.y, 0, 10),
    z: bounded(raw?.z, -49, 49, fallback.z),
    vx: bounded(raw?.vx, -20, 20),
    vz: bounded(raw?.vz, -20, 20),
    jump: raw?.jump === true,
  }
}

async function verifySupabaseToken(token, env) {
  if (typeof token !== 'string' || token.length < 20 || token.length > MAX_TOKEN_LENGTH) return null
  const baseUrl = String(env.SUPABASE_URL || '').replace(/\/+$/, '')
  const apiKey = env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY
  if (!baseUrl || !apiKey) return null

  try {
    const response = await fetch(`${baseUrl}/auth/v1/user`, {
      headers: { apikey: apiKey, Authorization: `Bearer ${token}` },
    })
    if (!response.ok) return null
    const user = await response.json()
    return typeof user?.id === 'string' && user.id.length > 0 ? user.id : null
  } catch {
    return null
  }
}

export class GameRoom {
  constructor(state, env) {
    this.state = state
    this.env = env
    this.sessions = new Map()
    this.pending = new Map()
    this.lastPose = new Map()
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('WebSocket upgrade required', { status: 426 })
    if (!this.env.SUPABASE_URL || !(this.env.SUPABASE_ANON_KEY || this.env.SUPABASE_PUBLISHABLE_KEY)) {
      return new Response('Room authentication is not configured', { status: 503 })
    }

    const pair = new WebSocketPair()
    const client = pair[0]
    const server = pair[1]
    const id = crypto.randomUUID()
    server.accept()

    if (this.sessions.size + this.pending.size >= MAX_PLAYERS) {
      json(server, { type: 'error', code: 'room_full', count: this.sessions.size, capacity: MAX_PLAYERS })
      server.close(1013, 'room full')
      return new Response(null, { status: 101, webSocket: client })
    }

    const pending = { socket: server, authenticating: false, timer: null }
    pending.timer = setTimeout(() => {
      if (!this.pending.delete(id)) return
      json(server, { type: 'error', code: 'auth_timeout' })
      server.close(1008, 'authentication timeout')
    }, AUTH_TIMEOUT_MS)
    this.pending.set(id, pending)

    server.addEventListener('message', event => { void this.onMessage(id, event.data) })
    server.addEventListener('close', () => this.leave(id))
    server.addEventListener('error', () => this.leave(id))
    return new Response(null, { status: 101, webSocket: client })
  }

  async onMessage(id, raw) {
    if (typeof raw !== 'string' || raw.length > MAX_TOKEN_LENGTH + 128) return
    let message
    try { message = JSON.parse(raw) } catch { return }
    if (!message || typeof message.type !== 'string') return

    const pending = this.pending.get(id)
    if (pending) {
      if (message.type !== 'auth' || pending.authenticating) {
        json(pending.socket, { type: 'error', code: 'auth_required' })
        pending.socket.close(1008, 'authentication required')
        return
      }
      pending.authenticating = true
      const userId = await verifySupabaseToken(message.accessToken, this.env)
      if (this.pending.get(id) !== pending) return
      if (!userId) {
        clearTimeout(pending.timer)
        this.pending.delete(id)
        json(pending.socket, { type: 'error', code: 'auth_required' })
        pending.socket.close(1008, 'invalid access token')
        return
      }

      clearTimeout(pending.timer)
      this.pending.delete(id)
      const slot = this.sessions.size
      const spawn = { x: Math.max(-17, Math.min(5.5, -17 + slot * 2.5)), y: 0, z: 15 }
      this.sessions.set(id, {
        socket: pending.socket,
        id,
        userId,
        profile: safeProfile(null),
        pose: { ...spawn, vx: 0, vz: 0, jump: false },
        joinedAt: Date.now(),
      })
      json(pending.socket, { type: 'welcome', playerId: id, spawn, count: this.sessions.size, capacity: MAX_PLAYERS })
      this.broadcast()
      return
    }

    const session = this.sessions.get(id)
    if (!session) return
    if (message.type === 'profile') {
      session.profile = safeProfile(message)
      this.broadcast()
      return
    }
    if (message.type !== 'pose') return

    const now = Date.now()
    const previous = this.lastPose.get(id) || 0
    if (now - previous < 1000 / MAX_INPUT_RATE) return
    this.lastPose.set(id, now)
    session.pose = clampPose(message, session.pose)
    this.broadcast()
  }

  leave(id) {
    const pending = this.pending.get(id)
    if (pending) {
      clearTimeout(pending.timer)
      this.pending.delete(id)
      return
    }
    if (!this.sessions.delete(id)) return
    this.lastPose.delete(id)
    this.broadcast()
  }

  broadcast() {
    const players = [...this.sessions.values()].map(session => ({
      playerId: session.id,
      profile: session.profile,
      pose: session.pose,
      joinedAt: session.joinedAt,
    }))
    const message = { type: 'room_state', count: players.length, capacity: MAX_PLAYERS, players }
    for (const session of this.sessions.values()) json(session.socket, message)
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname !== '/ws') return new Response('Burrito Chichero room service', { status: 200 })

    const room = safeRoom(url.searchParams.get('room'))
    if (!room) return new Response('Invalid room. Use 4-8 alphanumeric characters.', { status: 400 })

    const allowedOrigins = String(env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean)
    const origin = request.headers.get('Origin')
    if (!origin || !allowedOrigins.includes(origin)) return new Response('Origin not allowed', { status: 403 })

    if (!env.SUPABASE_URL || !(env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY)) {
      return new Response('Room authentication is not configured', { status: 503 })
    }

    const id = env.GAME_ROOM.idFromName(room)
    return env.GAME_ROOM.get(id).fetch(request)
  },
}
