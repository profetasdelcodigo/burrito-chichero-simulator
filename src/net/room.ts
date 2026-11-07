import { getRoomAccessToken } from './supabase'

export type RoomStatus = 'offline' | 'connecting' | 'online' | 'full'
export type RoomPlayer = {
  playerId: string
  profile: { name: string; color: string; accessory: 'pañuelo' | 'sombrero' | 'ninguno' }
  pose: { x: number; y: number; z: number; vx: number; vz: number; jump: boolean }
  joinedAt: number
}

type Hooks = { status(status: RoomStatus, count?: number): void; players(players: RoomPlayer[]): void }
const DEFAULT_URL = ''

export class RoomClient {
  private socket?: WebSocket
  private lastSent = 0
  private generation = 0
  private playerId = ''
  private readonly url = (import.meta.env.VITE_ROOM_URL as string | undefined) || DEFAULT_URL

  constructor(private readonly hooks: Hooks) {}

  connect(room: string, profile: { name: string; color: string; accessory: 'pañuelo' | 'sombrero' | 'ninguno' }): void {
    this.close()
    if (!this.url || !/^[A-Z0-9]{4,8}$/.test(room.trim().toUpperCase())) {
      this.hooks.status('offline')
      return
    }
    this.hooks.status('connecting')
    const attempt = this.generation
    void this.connectAuthenticated(room.trim().toUpperCase(), profile, attempt)
  }

  private async connectAuthenticated(
    room: string,
    profile: { name: string; color: string; accessory: 'pañuelo' | 'sombrero' | 'ninguno' },
    attempt: number,
  ): Promise<void> {
    const accessToken = await getRoomAccessToken()
    if (attempt !== this.generation) return
    if (!accessToken) {
      this.hooks.status('offline')
      return
    }

    let socket: WebSocket
    try {
      socket = new WebSocket(`${this.url}?room=${encodeURIComponent(room)}`)
    } catch {
      this.hooks.status('offline')
      return
    }
    this.socket = socket

    socket.onopen = () => {
      if (attempt !== this.generation) return socket.close()
      socket.send(JSON.stringify({ type: 'auth', accessToken }))
    }
    socket.onmessage = event => {
      if (attempt !== this.generation || typeof event.data !== 'string') return
      try {
        const message = JSON.parse(event.data) as {
          type?: string
          players?: RoomPlayer[]
          count?: number
          code?: string
          playerId?: string
        }
        if (message.type === 'welcome') {
          this.playerId = typeof message.playerId === 'string' ? message.playerId : ''
          this.hooks.status('online', message.count)
          socket.send(JSON.stringify({ type: 'profile', ...profile }))
        }
        if (message.type === 'room_state' && Array.isArray(message.players)) {
          const players = message.players.filter(player =>
            player && typeof player.playerId === 'string' &&
            player.profile && typeof player.profile.name === 'string' &&
            player.pose && [player.pose.x, player.pose.y, player.pose.z, player.pose.vx, player.pose.vz].every(Number.isFinite),
          )
          this.hooks.players(players.filter(player => player.playerId !== this.playerId))
          this.hooks.status('online', message.count ?? message.players.length)
        }
        if (message.type === 'error' && message.code === 'room_full') this.hooks.status('full', message.count)
      } catch { /* ignore malformed packets */ }
    }
    socket.onclose = event => {
      if (attempt === this.generation) {
        this.playerId = ''
        this.hooks.players([])
        this.hooks.status(event.code === 1013 ? 'full' : 'offline')
      }
    }
    socket.onerror = () => {
      if (attempt === this.generation) this.hooks.status('offline')
    }
  }

  sendPose(pose: { x: number; y: number; z: number; vx: number; vz: number; jump: boolean }): void {
    const now = performance.now()
    if (now - this.lastSent < 50 || this.socket?.readyState !== WebSocket.OPEN) return
    this.lastSent = now
    this.socket.send(JSON.stringify({
      type: 'pose',
      x: pose.x, y: pose.y, z: pose.z,
      vx: pose.vx, vz: pose.vz, jump: pose.jump,
    }))
  }

  close(): void {
    this.generation += 1
    this.socket?.close(1000)
    this.socket = undefined
    this.playerId = ''
    this.hooks.players([])
    this.hooks.status('offline')
  }
}
