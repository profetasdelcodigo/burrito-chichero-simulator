import type { Audio } from '../engine/audio'
import type { Input } from '../engine/input'
import type { Quality, SaveData, SaveStore } from '../engine/save'
import { PLAYER_COLORS, type Accessory } from '../game/balls'
import type { Game, PlayerProfile } from '../game/game'

export type Screen = 'boot' | 'title' | 'hud' | 'menu' | 'settings'
export type UiActions = {
  play(profile: PlayerProfile): void
  menu(open: boolean): void
  leave(): void
  invite(): void
  settings(patch: Partial<SaveData>): void
}

export class Ui {
  screen: Screen = 'boot'
  private readonly root: HTMLElement
  private noticeUntil = 0

  constructor(private readonly save: SaveStore, private readonly audio: Audio, private readonly input: Input, private readonly actions: UiActions) {
    this.root = document.getElementById('ui')!
    this.root.innerHTML = this.template()
    this.root.addEventListener('click', event => this.onClick(event))
    this.root.addEventListener('input', event => this.onInput(event))
    window.addEventListener('keydown', event => {
      if (event.code === 'Escape' && this.screen === 'hud') this.actions.menu(true)
      if (event.code === 'Escape' && this.screen === 'menu') this.actions.menu(false)
    })
    this.refreshSettings()
  }

  show(screen: Screen): void {
    this.screen = screen
    for (const element of this.root.querySelectorAll<HTMLElement>('[data-screen]')) {
      const active = element.dataset.screen === screen
      element.classList.toggle('is-active', active)
      element.setAttribute('aria-hidden', String(!active))
    }
    this.root.dataset.activeScreen = screen
    if (screen === 'title') this.root.querySelector<HTMLInputElement>('.name-input')?.focus()
  }

  setBootProgress(progress: number): void {
    const bar = this.root.querySelector<HTMLElement>('.boot-bar i')
    if (bar) bar.style.transform = `scaleX(${Math.max(0.04, Math.min(1, progress))})`
  }

  updateHud(game: Game): void {
    const mission = game.mission
    this.setText('.hud-name', game.profile.name)
    this.setText('.hud-mission', mission.text)
    this.setText('.hud-progress', mission.progress)
    this.setText('.hud-coords', `${game.playerPosition.x.toFixed(0)}, ${game.playerPosition.z.toFixed(0)}`)
    this.root.querySelector('.hud-mission')?.classList.toggle('pulse', mission.pulse)
  }

  notify(kind: 'mission' | 'jump' | 'interact'): void {
    if (kind === 'mission') {
      this.noticeUntil = performance.now() + 2600
      this.setText('.hud-toast', '¡La chicha está lista!')
    }
  }

  showRoomNotice(): void {
    this.noticeUntil = performance.now() + 2200
    this.setText('.title-note', 'Cloudflare pendiente: la sala online está diseñada para 10 jugadores, pero esta beta local no finge conexión.')
    this.setText('.hud-toast', 'Conectando con la sala PIURA1')
  }

  setRoomStatus(status: 'offline' | 'connecting' | 'online' | 'full', count = 0): void {
    const label = status === 'online' ? `ONLINE · ${Math.max(1, count)} / 10` : status === 'connecting' ? 'CONECTANDO · SALA PIURA1' : status === 'full' ? 'SALA LLENA · 10 / 10' : 'MODO LOCAL · ONLINE PENDIENTE'
    this.setText('.room-status', label)
    if (status === 'online') this.setText('.title-note', 'Sala Cloudflare conectada: hasta 10 burritos pueden compartir esta ruta.')
  }

  refreshSettings(): void {
    const d = this.save.data
    const set = (name: string, value: string) => { const el = this.root.querySelector<HTMLInputElement>(`[name="${name}"]`); if (el) el.value = value }
    set('musicVolume', String(d.musicVolume))
    set('sfxVolume', String(d.sfxVolume))
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('.toggle')) {
      const setting = button.dataset.setting as 'muted' | 'reducedMotion'
      button.setAttribute('aria-pressed', String(d[setting]))
      const label = button.querySelector('span')
      if (label) label.textContent = d[setting] ? 'Activado' : 'Desactivado'
    }
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('.quality button')) button.setAttribute('aria-pressed', String(button.dataset.value === d.quality))
  }

  frame(_seconds: number): void {
    this.root.classList.toggle('input-touch', this.input.method === 'touch')
    if (this.noticeUntil > 0 && performance.now() > this.noticeUntil) {
      this.noticeUntil = 0
      this.setText('.hud-toast', '')
    }
  }

  private onClick(event: MouseEvent): void {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action], .color-choice, .toggle, .quality button')
    if (!target) return
    this.audio.unlock()
    if (target.matches('.color-choice')) {
      for (const item of this.root.querySelectorAll('.color-choice')) item.classList.remove('selected')
      target.classList.add('selected')
      return
    }
    if (target.matches('.toggle')) {
      const setting = target.dataset.setting as 'muted' | 'reducedMotion'
      this.actions.settings({ [setting]: !this.save.data[setting] })
      return
    }
    if (target.matches('.quality button')) {
      this.actions.settings({ quality: target.dataset.value as Quality })
      return
    }
    switch (target.dataset.action) {
      case 'play': this.play(); break
      case 'menu': this.actions.menu(true); break
      case 'continue': this.actions.menu(false); break
      case 'leave': this.actions.leave(); break
      case 'invite': this.actions.invite(); break
      case 'settings': this.show('settings'); break
      case 'back': this.show('menu'); break
    }
  }

  private onInput(event: Event): void {
    const input = event.target as HTMLInputElement
    if (input.type === 'range') this.actions.settings({ [input.name]: Number(input.value) } as Partial<SaveData>)
  }

  private play(): void {
    const name = this.root.querySelector<HTMLInputElement>('.name-input')?.value ?? 'Chicherito'
    const color = this.root.querySelector<HTMLElement>('.color-choice.selected')?.dataset.color ?? PLAYER_COLORS[0]
    const accessory = (this.root.querySelector<HTMLSelectElement>('.accessory-select')?.value ?? 'pañuelo') as Accessory
    this.actions.play({ name, color, accessory })
  }

  private setText(selector: string, value: string): void {
    const el = this.root.querySelector<HTMLElement>(selector)
    if (el) el.textContent = value
  }

  private template(): string {
    const colors = PLAYER_COLORS.map((color, index) => `<button class="color-choice ${index === 0 ? 'selected' : ''}" data-color="${color}" style="--swatch:${color}" aria-label="Color ${index + 1}"></button>`).join('')
    return `
<section class="screen screen-boot is-active" data-screen="boot"><div class="boot-content"><p class="eyebrow">BETA 0.1 · LA LEGUA, PIURA</p><h1 class="boot-logo">BURRITO<br>CHICHERO</h1><div class="boot-bar"><i></i></div><p class="boot-label">Cargando mundo 3D…</p></div></section>
<section class="screen screen-title" data-screen="title"><div class="title-vignette"></div><div class="title-block"><p class="eyebrow">SIMULADOR 3D · BETA ABIERTA</p><h1 class="logo-text">BURRITO<br><span>CHICHERO</span></h1><p class="tagline">Explora La Legua, completa la Ruta Chichera y comparte la sala PIURA1 con hasta 10 burritos.</p><div class="profile-card"><label>Nombre del burrito<input class="name-input" maxlength="18" value="Chicherito" autocomplete="nickname"></label><div class="profile-row"><div><span class="field-label">Color</span><div class="colors">${colors}</div></div><label class="accessory-label">Accesorio<select class="accessory-select"><option value="pañuelo">Pañuelo rojo</option><option value="sombrero">Sombrero de paja</option><option value="ninguno">Sin accesorio</option></select></label></div></div><div class="menu-row"><button class="btn btn-primary" data-action="play"><span>EMPEZAR BETA</span></button><button class="btn btn-ghost" data-action="invite"><span>SALA 1 / 10</span></button></div><p class="title-note">Beta local lista: Cloudflare y Supabase se activan al desplegar y probar el backend.</p></div><div class="title-badge"><b>INICIO</b><span>La Legua-San Jacinto</span><small>Catacaos · Piura</small></div><footer class="bottom-bar"><span>WASD / joystick · ESPACIO saltar · E interactuar</span><small>WebGL · Three.js · materiales PBR · sombras reales</small></footer></section>
<section class="screen screen-hud" data-screen="hud"><div class="hud-top-left"><div class="hud-panel"><span class="status-dot"></span><div><b class="hud-name">Chicherito</b><small class="room-status">MODO LOCAL · SALA DISPONIBLE</small></div></div><div class="mission-card"><span class="eyebrow">CAMPAÑA 01 · CHICHA</span><strong class="hud-mission">Llega al punto INICIO</strong><span class="hud-progress">0/2</span></div></div><div class="hud-top-right"><button class="hud-pause" data-action="menu" aria-label="Abrir menú">☰</button></div><div class="hud-bottom-left"><span>WASD / joystick · ESPACIO saltar · E interactuar</span><small class="hud-coords">0, 0</small></div><div class="hud-toast"></div><div class="touch"><div class="touch-stick"><i></i></div><div class="touch-action"><button data-touch-action="jump">▲</button><button data-touch-action="interact">E</button></div></div></section>
<section class="screen screen-menu screen-modal" data-screen="menu"><div class="modal"><p class="eyebrow">PAUSA</p><h2 class="modal-title">Tu aventura sigue</h2><p class="modal-note">La escena continúa preparada para el modo colaborativo.</p><nav class="menu"><button class="btn btn-primary" data-action="continue"><span>CONTINUAR</span></button><button class="btn" data-action="invite"><span>VER SALA · 10 PLAZAS</span></button><button class="btn" data-action="settings"><span>AJUSTES</span></button><button class="btn btn-danger" data-action="leave"><span>VOLVER A PORTADA</span></button></nav></div></section>
<section class="screen screen-settings screen-modal" data-screen="settings"><div class="modal"><p class="eyebrow">CONFIGURACIÓN</p><h2 class="modal-title">Ajustes</h2><div class="settings-grid"><label>Volumen música<input type="range" name="musicVolume" min="0" max="1" step="0.05"></label><label>Volumen efectos<input type="range" name="sfxVolume" min="0" max="1" step="0.05"></label><div class="setting-row"><span>Silenciar</span><button class="toggle" data-setting="muted" aria-pressed="false"><i></i><span>Desactivado</span></button></div><div class="setting-row"><span>Reducir movimiento</span><button class="toggle" data-setting="reducedMotion" aria-pressed="false"><i></i><span>Desactivado</span></button></div><div class="setting-row quality"><span>Calidad</span><div><button data-value="low">Baja</button><button data-value="medium">Media</button><button data-value="high">Alta</button></div></div></div><button class="btn" data-action="back"><span>VOLVER</span></button></div></section>
<div class="portrait-warning"><strong>Gira tu celular</strong><span>Esta beta se juega en horizontal.</span></div>`
  }
}
