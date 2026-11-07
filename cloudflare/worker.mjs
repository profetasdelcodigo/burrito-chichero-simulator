const MAX_PLAYERS = 10
const ROOM_RE = /^[A-Z0-9]{4,8}$/
const PROFILE_NAME_MAX = 18
const ALLOWED_ACCESSORIES = new Set(['pañuelo', 'sombrero', 'ninguno'])
const ALLOWED_COLORS = new Set(['#e86b5a', '#e9b44c', '#55a7a3', '#7c78c2', '#d889b8'])
const MAX_INPUT_RATE = 30

function json(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload))
}

function safeProfile(raw) {
  const name = typeof raw?.name === 'string' ? raw.name.trim().slice(0, PROFILE_NAME_MAX) : ''
  const color = typeof raw?.color === 'string' && ALLOWED_COLORS.has(raw.color) ? raw.color : '#e86b5a'
  const accessory = typeof raw?.accessory === 'string' && ALLOWED_ACCESSORIES.has(raw.accessory) ? raw.accessory : 'pañuelo'
  return { name: name || 'Chicherito', color, accessory }
}

function safeRoom(value) {
  const room = String(value || '').toUpperCase()
  return ROOM_RE.test(room) ? room : ''
}

export class GameRoom {
  constructor(state) {
    this.state = state
    this.sessions = new Map()
    this.lastInput = new Map()
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('WebSocket upgrade required', { status: 426 })
    const pair = new WebSocketPair()
    const client = pair[0]
    const server = pair[1]
    const id = crypto.randomUUID()
    server.accept()
    if (this.sessions.size >= MAX_PLAYERS) {
      json(server, { type: 'error', code: 'room_full', count: this.sessions.size, capacity: MAX_PLAYERS })
      server.close(1013, 'room full')
      return new Response(null, { status: 101, webSocket: client })
    }
    this.sessions.set(id, { socket: server, id, profile: safeProfile(null), input: { x: 0, z: 0, jump: false }, joinedAt: Date.now() })
    server.addEventListener('message', event => this.onMessage(id, event.data))
    server.addEventListener('close', () => this.leave(id))
    server.addEventListener('error', () => this.leave(id))
    json(server, { type: 'welcome', playerId: id, count: this.sessions.size, capacity: MAX_PLAYERS })
    this.broadcast()
    return new Response(null, { status: 101, webSocket: client })
  }

  onMessage(id, raw) {
    if (typeof raw !== 'string' || raw.length > 4096) return
    let message
    try { message = JSON.parse(raw) } catch { return }
    const session = this.sessions.get(id)
    if (!session || !message || typeof message.type !== 'string') return
    if (message.type === 'profile') {
      session.profile = safeProfile(message)
      this.broadcast()
      return
    }
    if (message.type !== 'input') return
    const now = Date.now()
    const previous = this.lastInput.get(id) || 0
    if (now - previous < 1000 / MAX_INPUT_RATE) return
    this.lastInput.set(id, now)
    const x = Number(message.x)
    const z = Number(message.z)
    session.input = {
      x: Number.isFinite(x) ? Math.max(-1, Math.min(1, x)) : 0,
      z: Number.isFinite(z) ? Math.max(-1, Math.min(1, z)) : 0,
      jump: message.jump === true,
    }
    this.broadcast()
  }

  leave(id) {
    if (!this.sessions.delete(id)) return
    this.lastInput.delete(id)
    this.broadcast()
  }

  broadcast() {
    const players = [...this.sessions.values()].map(session => ({
      playerId: session.id,
      profile: session.profile,
      input: session.input,
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
    const id = env.GAME_ROOM.idFromName(room)
    return env.GAME_ROOM.get(id).fetch(request)
  },
}
