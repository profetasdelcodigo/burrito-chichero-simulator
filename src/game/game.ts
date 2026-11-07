import * as THREE from 'three'
import type { Audio } from '../engine/audio'
import { Assets } from '../engine/assets'
import type { Renderer } from '../engine/renderer'
import { Arena } from './arena'
import { ArenaCamera } from './camera'
import { Accessory, BurritoView, PLAYER_COLORS } from './balls'
import type { RoomPlayer } from '../net/room'

export type PlayerProfile = { name: string; color: string; accessory: Accessory }
export type GameHooks = { event(kind: 'mission' | 'jump' | 'interact'): void }
type RemoteActor = { view: BurritoView; target: THREE.Vector3; velocity: THREE.Vector2; jumping: boolean; profileKey: string }

export class Game {
  readonly arena: Arena
  readonly cameraController = new ArenaCamera()
  readonly player = new BurritoView(PLAYER_COLORS[0])
  readonly companions = PLAYER_COLORS.slice(1).map((color, index) => ({ view: new BurritoView(color), x: 8 + index * 4, z: 13 - index * 6, color }))
  reducedMotion = false
  profile: PlayerProfile = { name: 'Chicherito', color: PLAYER_COLORS[0], accessory: 'pañuelo' }
  private readonly assets = new Assets()
  private readonly remotePlayers = new Map<string, RemoteActor>()
  private modelSource?: THREE.Object3D
  private modelAnimations: THREE.AnimationClip[] = []
  private readonly audio: Audio
  private readonly hooks: GameHooks
  private readonly velocity = new THREE.Vector3()
  private input = { x: 0, z: 0 }
  private jumpRequested = false
  private interactRequested = false
  private sprint = false
  private y = 0
  private vy = 0
  private grounded = true
  private time = 0
  private missionStep = 0
  private missionPulse = 0

  constructor(private readonly renderer: Renderer, audio: Audio, hooks: GameHooks) {
    this.audio = audio
    this.hooks = hooks
    this.arena = new Arena(renderer.shadowMapSize)
    this.cameraController.setFraming(3.8, 6.8)
    this.arena.scene.add(this.player.root)
    for (const companion of this.companions) this.arena.scene.add(companion.view.root)
    this.player.setOwn(true)
    this.player.setAccessory(this.profile.accessory)
  }

  async loadAssets(): Promise<void> {
    try {
      const gltf = await this.assets.gltf('/assets/models/burrito-player-animated.glb')
      this.modelSource = gltf.scene
      this.modelAnimations = gltf.animations
      this.player.setModel(gltf.scene, gltf.animations)
      for (const actor of this.remotePlayers.values()) actor.view.setModel(gltf.scene, gltf.animations)
      for (const companion of this.companions) companion.view.setModel(gltf.scene, gltf.animations)
    } catch {
      // The procedural fallback remains visible when the generated model is still being registered.
    }
  }

  configure(profile: PlayerProfile): void {
    this.profile = { ...profile, name: profile.name.trim().slice(0, 18) || 'Chicherito' }
    this.player.setColor(profile.color)
    this.player.setAccessory(profile.accessory)
  }

  setPlayerSpawn(position: { x: number; y: number; z: number }): void {
    this.player.root.position.set(
      THREE.MathUtils.clamp(position.x, -49, 49),
      THREE.MathUtils.clamp(position.y, 0, 10),
      THREE.MathUtils.clamp(position.z, -49, 49),
    )
    this.y = this.player.root.position.y
    this.vy = 0
    this.velocity.set(0, 0, 0)
    this.grounded = this.y === 0
  }

  setRemotePlayers(players: readonly RoomPlayer[]): void {
    const seen = new Set<string>()
    for (const player of players) {
      if (!player.playerId || player.playerId.length > 80) continue
      seen.add(player.playerId)
      const profile = player.profile
      const profileKey = `${profile.name}|${profile.color}|${profile.accessory}`
      let actor = this.remotePlayers.get(player.playerId)
      if (!actor) {
        const view = new BurritoView(profile.color)
        view.setColor(profile.color)
        view.setOwn(true)
        view.setAccessory(profile.accessory)
        if (this.modelSource) view.setModel(this.modelSource, this.modelAnimations)
        this.arena.scene.add(view.root)
        actor = {
          view,
          target: new THREE.Vector3(player.pose.x, player.pose.y, player.pose.z),
          velocity: new THREE.Vector2(player.pose.vx, player.pose.vz),
          jumping: player.pose.jump,
          profileKey,
        }
        view.root.position.copy(actor.target)
        this.remotePlayers.set(player.playerId, actor)
      } else {
        if (actor.profileKey !== profileKey) {
          actor.view.setColor(profile.color)
          actor.view.setAccessory(profile.accessory)
          actor.profileKey = profileKey
        }
        actor.target.set(
          THREE.MathUtils.clamp(player.pose.x, -49, 49),
          THREE.MathUtils.clamp(player.pose.y, 0, 10),
          THREE.MathUtils.clamp(player.pose.z, -49, 49),
        )
        actor.velocity.set(
          THREE.MathUtils.clamp(player.pose.vx, -20, 20),
          THREE.MathUtils.clamp(player.pose.vz, -20, 20),
        )
        actor.jumping = player.pose.jump
      }
    }

    for (const [id, actor] of this.remotePlayers) {
      if (seen.has(id)) continue
      this.arena.scene.remove(actor.view.root)
      this.remotePlayers.delete(id)
    }
  }

  clearRemotePlayers(): void {
    for (const actor of this.remotePlayers.values()) this.arena.scene.remove(actor.view.root)
    this.remotePlayers.clear()
  }

  setInput(x: number, z: number): void {
    this.input.x = x
    this.input.z = z
  }

  setActions(jump: boolean, sprint: boolean, interact: boolean): void {
    this.jumpRequested ||= jump
    this.sprint = sprint
    this.interactRequested ||= interact
  }

  step(dt: number): void {
    this.time += dt
    const inputLength = Math.min(1, Math.hypot(this.input.x, this.input.z))
    const topSpeed = this.sprint ? 9.2 : 6.4
    const targetX = this.input.x * topSpeed
    const targetZ = this.input.z * topSpeed
    const accel = this.grounded ? 22 : 10
    this.velocity.x += (targetX - this.velocity.x) * Math.min(1, accel * dt)
    this.velocity.z += (targetZ - this.velocity.z) * Math.min(1, accel * dt)
    if (inputLength < 0.05) {
      this.velocity.x *= Math.max(0, 1 - dt * 8)
      this.velocity.z *= Math.max(0, 1 - dt * 8)
    }

    if (this.jumpRequested && this.grounded) {
      this.vy = 8.8
      this.grounded = false
      this.audio.play('go')
      this.hooks.event('jump')
    }
    this.jumpRequested = false
    this.vy -= 21 * dt
    this.y += this.vy * dt
    if (this.y <= 0) {
      this.y = 0
      this.vy = 0
      this.grounded = true
    }

    this.player.root.position.x = THREE.MathUtils.clamp(this.player.root.position.x + this.velocity.x * dt, -49, 49)
    this.player.root.position.z = THREE.MathUtils.clamp(this.player.root.position.z + this.velocity.z * dt, -49, 49)
    this.player.update({ x: this.player.root.position.x, y: this.y, z: this.player.root.position.z }, { x: this.velocity.x, z: this.velocity.z }, dt, this.time, !this.grounded)
    for (const actor of this.remotePlayers.values()) {
      const blend = 1 - Math.exp(-dt * 14)
      actor.view.root.position.lerp(actor.target, blend)
      const position = actor.view.root.position
      actor.view.update(
        { x: position.x, y: position.y, z: position.z },
        { x: actor.velocity.x, z: actor.velocity.y },
        dt,
        this.time,
        actor.jumping,
      )
    }
    for (const companion of this.companions) {
      const drift = Math.sin(this.time * 0.45 + companion.x) * 0.4
      companion.view.update({ x: companion.x + drift, y: 0, z: companion.z }, { x: 0, z: 0 }, dt, this.time)
    }

    const p = this.player.root.position
    const startDistance = Math.hypot(p.x - this.arena.start.x, p.z - this.arena.start.z)
    const chichaDistance = Math.hypot(p.x - this.arena.chicha.x, p.z - this.arena.chicha.z)
    if (this.missionStep === 0 && startDistance < 4) this.missionStep = 1
    if (this.missionStep === 1 && chichaDistance < 5 && this.interactRequested) {
      this.missionStep = 2
      this.missionPulse = 2.2
      this.audio.play('join')
      this.hooks.event('mission')
    }
    this.interactRequested = false
    this.missionPulse = Math.max(0, this.missionPulse - dt)
  }

  render(frameSeconds: number): void {
    if (this.player.root.visible) this.cameraController.update(this.player.root.position, { x: this.velocity.x, z: this.velocity.z }, frameSeconds, this.reducedMotion)
    else this.cameraController.orbit(frameSeconds)
    this.arena.update(this.time)
    this.renderer.render(this.arena.scene, this.cameraController.camera)
  }

  titlePreview(): void {
    this.player.root.visible = true
    this.player.root.position.set(-17, 0, 15)
    this.player.update(this.player.root.position, { x: 0, z: 0 }, 0, this.time)
  }

  startExploration(): void {
    this.player.root.visible = true
    this.player.root.position.set(-17, 0, 15)
    this.velocity.set(0, 0, 0)
    this.y = 0
    this.grounded = true
    this.missionStep = 0
  }

  setQuality(quality: import('../engine/save').Quality): void {
    this.renderer.applyQuality(quality)
  }

  leave(): void {
    this.player.root.visible = true
    this.titlePreview()
  }

  get mission(): { step: number; text: string; progress: string; pulse: boolean } {
    if (this.missionStep === 0) return { step: 0, text: 'Llega al punto INICIO', progress: '0/2', pulse: false }
    if (this.missionStep === 1) return { step: 1, text: 'Busca la mesa de CHICHA', progress: '1/2', pulse: false }
    return { step: 2, text: '¡Actividad completada! La jarra está lista', progress: '2/2', pulse: this.missionPulse > 0 }
  }

  get networkPose(): { x: number; y: number; z: number; vx: number; vz: number; jump: boolean } {
    return {
      x: this.player.root.position.x,
      y: this.y,
      z: this.player.root.position.z,
      vx: this.velocity.x,
      vz: this.velocity.z,
      jump: !this.grounded,
    }
  }

  get playerPosition(): { x: number; z: number; y: number } {
    return { x: this.player.root.position.x, z: this.player.root.position.z, y: this.y }
  }

  get isGrounded(): boolean { return this.grounded }
}
