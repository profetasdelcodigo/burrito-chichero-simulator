export type RoomStatus = 'offline' | 'connecting' | 'online' | 'full'
export type RoomPlayer = { playerId: string; profile: { name: string; color: string; accessory: string }; joinedAt: number }

type Hooks = { status(status: RoomStatus, count?: number): void; players(players: RoomPlayer[]): void }
const DEFAULT_URL = 'wss://burritochichero-room.burritochichero.workers.dev/ws'

export class RoomClient {
  private socket?: WebSocket
  private lastSent = 0
  private readonly url = (import.meta.env.VITE_ROOM_URL as string | undefined) || DEFAULT_URL
  constructor(private readonly hooks: Hooks) {}
  connect(room: string, profile: { name: string; color: string; accessory: string }): void {
    this.close()
    this.hooks.status('connecting')
    let socket: WebSocket
    try { socket = new WebSocket(`${this.url}?room=${encodeURIComponent(room)}`) } catch { this.hooks.status('offline'); return }
    this.socket = socket
    socket.onopen = () => { this.hooks.status('online'); socket.send(JSON.stringify({ type: 'profile', ...profile })) }
    socket.onmessage = event => {
      if (typeof event.data !== 'string') return
      try {
        const message = JSON.parse(event.data) as { type?: string; players?: RoomPlayer[]; count?: number }
        if (message.type === 'welcome') this.hooks.status('online', message.count)
        if (message.type === 'room_state' && Array.isArray(message.players)) this.hooks.players(message.players)
      } catch { /* ignore malformed packets */ }
    }
    socket.onclose = event => this.hooks.status(event.code === 1013 ? 'full' : 'offline')
    socket.onerror = () => this.hooks.status('offline')
  }
  sendInput(x: number, z: number, jump: boolean): void {
    const now = performance.now()
    if (now - this.lastSent < 45 || this.socket?.readyState !== WebSocket.OPEN) return
    this.lastSent = now
    this.socket.send(JSON.stringify({ type: 'input', x: Math.max(-100, Math.min(100, x)), z: Math.max(-100, Math.min(100, z)), jump }))
  }
  close(): void { this.socket?.close(1000); this.socket = undefined; this.hooks.status('offline') }
}
