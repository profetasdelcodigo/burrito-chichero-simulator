import * as THREE from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { Pose } from '../net/protocol'
import { CONFIG } from './config'

export const PLAYER_COLORS = ['#d97d4f', '#4d91b8', '#6eaa63', '#c9a348', '#a96ca8'] as const
export type Accessory = 'sombrero' | 'pañuelo' | 'ninguno'

export class RemoteTrack {
  x = 0
  z = 0
  vx = 0
  vz = 0
  private last: { x: number; z: number; vx: number; vz: number; at: number; lead: number; seq: number } | null = null
  private offsetX = 0
  private offsetZ = 0

  place(x: number, z: number): void { Object.assign(this, { x, z, vx: 0, vz: 0, offsetX: 0, offsetZ: 0 }); this.last = null }
  push(pose: Pose, latency: number, now: number): void {
    const previous = this.last
    if (previous && pose.seq <= previous.seq) return
    const shown = previous ? this.estimate(previous, now) : { x: this.x, z: this.z }
    this.last = { x: pose.x, z: pose.z, vx: pose.vx, vz: pose.vz, at: now, lead: pose.lat / 1000 + latency, seq: pose.seq }
    const target = this.estimate(this.last, now)
    this.offsetX = shown.x + (previous ? this.offsetX : 0) - target.x
    this.offsetZ = shown.z + (previous ? this.offsetZ : 0) - target.z
    if (Math.hypot(this.offsetX, this.offsetZ) > CONFIG.net.snapDistance) this.offsetX = this.offsetZ = 0
  }
  update(now: number, seconds: number): void {
    if (!this.last) return
    const keep = Math.exp(-Math.max(seconds, 0) / Math.max(CONFIG.net.smoothTime, 1e-3))
    this.offsetX *= keep; this.offsetZ *= keep
    const target = this.estimate(this.last, now)
    this.x = target.x + this.offsetX; this.z = target.z + this.offsetZ
    this.vx = this.last.vx; this.vz = this.last.vz
  }
  reportedOutside(radius: number): boolean { return !!this.last && Math.hypot(this.last.x, this.last.z) > radius }
  private estimate(last: { x: number; z: number; vx: number; vz: number; at: number; lead: number }, now: number): { x: number; z: number } {
    const lead = Math.min(last.lead + now - last.at, CONFIG.net.maxLead)
    return { x: last.x + last.vx * lead, z: last.z + last.vz * lead }
  }
}

function makeFallback(color: string): THREE.Group {
  const root = new THREE.Group()
  const coat = new THREE.MeshStandardMaterial({ color, roughness: 0.78 })
  const dark = new THREE.MeshStandardMaterial({ color: '#40352f', roughness: 0.92 })
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 1.3, 8, 20), coat)
  body.rotation.z = Math.PI / 2
  body.position.y = 1.12
  body.castShadow = true
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.58, 24, 16), coat)
  head.position.set(0.98, 1.56, 0)
  head.scale.set(1, 1.12, 0.88)
  head.castShadow = true
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 10), dark)
  muzzle.position.set(1.36, 1.43, 0)
  muzzle.scale.set(1.2, 0.68, 0.74)
  muzzle.castShadow = true
  root.add(body, head, muzzle)
  for (const [x, z] of [[-0.38, -0.35], [-0.38, 0.35], [0.45, -0.35], [0.45, 0.35]] as const) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.82, 6, 12), dark)
    leg.position.set(x, 0.47, z)
    leg.castShadow = true
    root.add(leg)
  }
  for (const z of [-0.2, 0.2]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.62, 8), coat)
    ear.position.set(1.02, 2.15, z)
    ear.rotation.z = z > 0 ? -0.1 : 0.1
    ear.castShadow = true
    root.add(ear)
  }
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.55, 5, 10), dark)
  tail.position.set(-1.1, 1.2, 0)
  tail.rotation.z = -0.45
  tail.castShadow = true
  root.add(tail)
  return root
}

function accessoryMesh(accessory: Accessory): THREE.Object3D | null {
  if (accessory === 'sombrero') {
    const group = new THREE.Group()
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.08, 28), new THREE.MeshStandardMaterial({ color: '#d7ad63', roughness: 0.8 }))
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.42, 20), new THREE.MeshStandardMaterial({ color: '#d7ad63', roughness: 0.8 }))
    brim.position.y = 2.18
    crown.position.y = 2.42
    group.add(brim, crown)
    return group
  }
  if (accessory === 'pañuelo') {
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.09, 8, 24), new THREE.MeshStandardMaterial({ color: '#c7473b', roughness: 0.72 }))
    scarf.rotation.x = Math.PI / 2
    scarf.position.set(0.85, 1.35, 0)
    return scarf
  }
  return null
}

export class BurritoView {
  readonly root = new THREE.Group()
  private readonly fallback: THREE.Group
  private readonly shadow: THREE.Mesh
  private readonly marker: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>
  private model?: THREE.Object3D
  private accessory?: THREE.Object3D
  private mixer?: THREE.AnimationMixer
  private phase = Math.random() * Math.PI * 2

  constructor(color: string = PLAYER_COLORS[0]) {
    this.fallback = makeFallback(color)
    this.root.add(this.fallback)
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.95, 32), new THREE.MeshBasicMaterial({ color: '#2b1c18', transparent: true, opacity: 0.34, depthWrite: false }))
    this.shadow.rotation.x = -Math.PI / 2
    this.shadow.position.y = 0.02
    this.marker = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.22, 36), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }))
    this.marker.rotation.x = -Math.PI / 2
    this.marker.position.y = 0.03
    this.marker.visible = false
    this.root.add(this.shadow, this.marker)
  }

  setModel(source: THREE.Object3D, animations: THREE.AnimationClip[] = []): void {
    this.model?.parent?.remove(this.model)
    this.model = clone(source)
    this.model.scale.setScalar(1.28)
    this.model.position.y = 0
    this.model.traverse(object => {
      const mesh = object as THREE.Mesh
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })
    this.mixer = animations.length > 0 ? new THREE.AnimationMixer(this.model) : undefined
    if (this.mixer && animations[0]) this.mixer.clipAction(animations[0]).play()
    this.root.add(this.model)
    this.fallback.visible = false
    if (this.accessory) this.root.add(this.accessory)
  }

  setAccessory(accessory: Accessory): void {
    this.accessory?.parent?.remove(this.accessory)
    this.accessory = accessoryMesh(accessory) ?? undefined
    if (this.accessory) this.root.add(this.accessory)
  }

  setOwn(own: boolean): void {
    this.marker.visible = own
  }

  setColor(color: string): void {
    this.marker.material.color.set(color)
    this.fallback.traverse(object => {
      const mesh = object as THREE.Mesh
      if (!mesh.isMesh) return
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of materials) {
        if ('color' in material && material.color instanceof THREE.Color && material !== this.marker.material) {
          material.color.set(color)
        }
      }
    })
  }

  update(position: { x: number; y: number; z: number }, velocity: { x: number; z: number }, dt: number, time: number, jumping = false): void {
    this.mixer?.update(dt)
    this.root.position.set(position.x, position.y, position.z)
    const speed = Math.hypot(velocity.x, velocity.z)
    if (speed > 0.04) {
      this.root.rotation.y = Math.atan2(velocity.x, velocity.z)
      this.phase += dt * Math.min(14, 4 + speed)
    }
    const bob = speed > 0.04 ? Math.abs(Math.sin(this.phase)) * 0.065 : Math.sin(time * 1.6 + this.phase) * 0.018
    if (this.model) this.model.position.y = bob
    else this.fallback.position.y = bob
    if (jumping) this.root.rotation.z = Math.sin(time * 10) * 0.025
    else this.root.rotation.z *= Math.max(0, 1 - dt * 8)
    this.shadow.scale.set(1 + Math.min(speed * 0.02, 0.2), 1 + Math.min(speed * 0.02, 0.2), 1)
    this.marker.material.opacity = 0.54 + Math.sin(time * 5) * 0.26
  }
}
