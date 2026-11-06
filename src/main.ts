import './styles/main.css'
import { Audio } from './engine/audio'
import { Input } from './engine/input'
import { GameLoop } from './engine/loop'
import { SAVE_KEY, SaveStore } from './engine/save'
import { stickToWorld } from './game/camera'
import { Game, type PlayerProfile } from './game/game'
import { Renderer, suggestQuality } from './engine/renderer'
import { RoomClient } from './net/room'
import { ensureAnonymousSession, savePlayerProfile } from './net/supabase'
import { TouchControls } from './ui/touch'
import { Ui } from './ui/ui'

async function boot(): Promise<void> {
  document.documentElement.lang = 'es'
  const canvas = document.querySelector<HTMLCanvasElement>('#game')!
  const save = new SaveStore()
  const input = new Input(canvas)
  const audio = new Audio()
  const renderer = new Renderer(canvas, save.data.quality)
  let game: Game
  let active = false

  const ui = new Ui(save, audio, input, {
    play: (profile: PlayerProfile) => {
      audio.unlock()
      audio.startMusic()
      game.configure(profile)
      game.startExploration()
      void savePlayerProfile(profile)
      room.connect('PIURA1', profile)
      active = true
      ui.show('hud')
    },
    menu: open => ui.show(open ? 'menu' : 'hud'),
    leave: () => {
      active = false
      room.close()
      game.leave()
      ui.show('title')
    },
    invite: () => ui.showRoomNotice(),
    settings: patch => {
      const qualityChanged = patch.quality !== undefined && patch.quality !== save.data.quality
      save.update(patch)
      audio.setVolumes(save.data.musicVolume, save.data.sfxVolume, save.data.muted)
      if (qualityChanged) game.setQuality(save.data.quality)
      ui.refreshSettings()
    },
  })

  const room = new RoomClient({
    status: (status, count) => ui.setRoomStatus(status, count),
    players: players => ui.setRoomStatus('online', players.length),
  })
  void ensureAnonymousSession()

  ui.show('boot')
  ui.setBootProgress(0.2)
  game = new Game(renderer, audio, { event: kind => ui.notify(kind) })
  ui.setBootProgress(0.55)
  await game.loadAssets()
  ui.setBootProgress(0.9)
  if (safeGet(SAVE_KEY) === null) save.update({ quality: suggestQuality() })
  audio.setVolumes(save.data.musicVolume, save.data.sfxVolume, save.data.muted)
  game.reducedMotion = save.data.reducedMotion
  game.titlePreview()
  ui.refreshSettings()
  ui.setBootProgress(1)

  const loop = new GameLoop({
    step: dt => {
      if (!active) return
      const movement = stickToWorld({ x: 0, z: 1 }, input.move.x, input.move.y)
      game.setInput(movement.x, movement.z)
      game.setActions(input.consume('jump'), input.held('sprint'), input.consume('interact'))
      room.sendInput(movement.x, movement.z, input.held('jump'))
      game.step(dt)
    },
    render: (_alpha, frameSeconds) => {
      input.update()
      ui.frame(frameSeconds)
      game.render(frameSeconds)
      if (active) ui.updateHud(game)
      input.endFrame()
    },
  })
  loop.start()
  new TouchControls(document.getElementById('ui')!, input, () => active && ui.screen === 'hud')
  window.setTimeout(() => ui.show('title'), 900)
  ;(window as unknown as { __game: unknown }).__game = { game, ui, input, save }
}

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

boot().catch(error => {
  console.error(error)
  const el = document.getElementById('ui')
  if (el) el.innerHTML = `<div class="fatal">No se pudo iniciar la beta 3D: ${String((error as Error)?.message ?? error).replace(/[<>&]/g, '')}</div>`
})
