import * as THREE from 'three'
import type { Role, Seat } from '../net/protocol'
import { CONFIG } from './config'

export type Point = { x: number; z: number }

export function cameraSide(role: Role, spawn: Record<Seat, Point>): Point {
  if (role === 'spectator') return { x: Math.SQRT1_2, z: Math.SQRT1_2 }
  const point = spawn[role]
  const length = Math.hypot(point.x, point.z)
  return length > 1e-6 ? { x: point.x / length, z: point.z / length } : { x: 0, z: 1 }
}

export function stickToWorld(side: Point, x: number, y: number): Point {
  const fx = -side.x, fz = -side.z
  const rx = -fz, rz = fx
  const wx = rx * x + fx * y
  const wz = rz * x + fz * y
  const length = Math.hypot(wx, wz)
  return length > 1 ? { x: wx / length, z: wz / length } : { x: wx, z: wz }
}

export class ArenaCamera {
  readonly camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1, 0.1, 500)
  private readonly focus = new THREE.Vector3()
  private side: Point = { x: 0, z: 1 }
  private time = 0
  private shake = 0
  private followHeight?: number
  private followDistance?: number
  private heading = 0

  setSide(side: Point): void { this.side = side; this.heading = Math.atan2(side.x, side.z) }
  setFraming(height: number, distance: number): void { this.followHeight = height; this.followDistance = distance }
  addShake(amount: number): void { this.shake = Math.min(1, this.shake + amount) }

  orbit(seconds: number): void {
    this.time += seconds
    const t = this.time * 0.055
    this.camera.position.set(Math.sin(t) * 31, 12 + Math.sin(this.time * 0.22), Math.cos(t) * 31)
    this.camera.lookAt(-2, 1.2, 1)
    this.camera.fov = 52
    this.camera.updateProjectionMatrix()
  }

  update(target: { x: number; y?: number; z: number } | null, velocity: { x: number; z: number }, seconds: number, reducedMotion: boolean): void
  update(target: { x: number; z: number } | null, seconds: number, reducedMotion: boolean): void
  update(target: { x: number; y?: number; z: number } | null, velocityOrSeconds: { x: number; z: number } | number, secondsOrReduced: number | boolean, reducedMotionArg?: boolean): void {
    const legacy = typeof velocityOrSeconds === 'number'
    const seconds = legacy ? velocityOrSeconds : secondsOrReduced as number
    const reducedMotion = legacy ? secondsOrReduced as boolean : reducedMotionArg ?? false
    const velocity = legacy ? { x: 0, z: 0 } : velocityOrSeconds
    this.time += seconds
    const speed = Math.hypot(velocity.x, velocity.z)
    const targetHeading = speed > 0.05 ? Math.atan2(velocity.x, velocity.z) : Math.atan2(this.side.x, this.side.z)
    const delta = Math.atan2(Math.sin(targetHeading - this.heading), Math.cos(targetHeading - this.heading))
    this.heading += delta * (1 - Math.exp(-seconds * 3.2))
    const behind = new THREE.Vector3(Math.sin(this.heading) * (this.followDistance ?? CONFIG.camera.distance), this.followHeight ?? CONFIG.camera.height, Math.cos(this.heading) * (this.followDistance ?? CONFIG.camera.distance))
    const point = target ?? { x: 0, y: 0, z: 0 }
    const desired = new THREE.Vector3(point.x + behind.x, (point.y ?? 0) + behind.y, point.z + behind.z)
    const k = 1 - Math.exp(-seconds * 5)
    if (legacy) {
      this.focus.set(point.x, (point.y ?? 0) + 0.8, point.z)
      this.camera.position.copy(desired)
    } else {
      this.focus.lerp(new THREE.Vector3(point.x, (point.y ?? 0) + 0.8, point.z), k)
      this.camera.position.lerp(desired, k)
    }
    this.camera.lookAt(this.focus.x, this.focus.y, this.focus.z)
    if (this.shake > 0 && !reducedMotion) {
      const amount = this.shake * this.shake * 0.18
      this.camera.position.x += Math.sin(this.time * 61) * amount
      this.camera.position.y += Math.sin(this.time * 47 + 1) * amount
    }
    this.shake = Math.max(0, this.shake - seconds * 2.5)
    this.camera.fov = CONFIG.camera.fov
    this.camera.updateProjectionMatrix()
  }
}
