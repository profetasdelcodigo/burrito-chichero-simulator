import type { Action } from '../engine/input'
import type { Input } from '../engine/input'

export class TouchControls {
  private stickId: number | null = null
  private origin = { x: 0, y: 0 }
  private readonly stick: HTMLElement
  private readonly knob: HTMLElement

  constructor(root: HTMLElement, private readonly input: Input, private readonly active: () => boolean) {
    const layer = root.querySelector<HTMLElement>('.touch')!
    this.stick = layer.querySelector('.touch-stick')!
    this.knob = this.stick.querySelector('i')!
    const radius = 56
    const enable = () => document.body.classList.add('has-touch')
    if (matchMedia('(pointer: coarse)').matches) enable()
    window.addEventListener('touchstart', enable, { once: true, passive: true })
    window.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') this.input.method = 'touch' }, { capture: true })
    for (const button of layer.querySelectorAll<HTMLButtonElement>('[data-touch-action]')) {
      const action = button.dataset.touchAction as Action
      button.addEventListener('pointerdown', event => { event.preventDefault(); this.input.setTouchButton(action, true) })
      button.addEventListener('pointerup', event => { event.preventDefault(); this.input.setTouchButton(action, false) })
      button.addEventListener('pointercancel', () => this.input.setTouchButton(action, false))
    }
    const canvas = document.querySelector<HTMLCanvasElement>('#game')!
    canvas.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'touch' || !this.active() || this.stickId !== null || e.clientX > window.innerWidth * 0.52) return
      this.stickId = e.pointerId
      const bounds = this.stick.getBoundingClientRect()
      this.origin = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }
      this.stick.classList.add('is-active')
    })
    window.addEventListener('pointermove', e => {
      if (e.pointerId !== this.stickId) return
      let dx = e.clientX - this.origin.x
      let dy = e.clientY - this.origin.y
      const len = Math.hypot(dx, dy)
      if (len > radius) { dx = (dx / len) * radius; dy = (dy / len) * radius }
      this.knob.style.transform = `translate(${dx}px, ${dy}px)`
      this.input.setTouchMove(dx / radius, -dy / radius)
    })
    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.stickId) return
      this.stickId = null
      this.knob.style.transform = ''
      this.stick.classList.remove('is-active')
      this.input.setTouchMove(0, 0)
    }
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }
}
