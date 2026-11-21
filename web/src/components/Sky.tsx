import { useEffect, useRef } from 'react'
import { getPulse, subscribePulse, type Pulse } from '../lib/pulse'

/**
 * Фон «небо каталога»: каждая точка это эксперт (точек столько, сколько людей в базе),
 * тонкие линии между соседями напоминают граф компетенций. Пока идёт поиск, небо стягивается
 * к полю запроса; когда выдача пришла, столько точек, сколько найдено, загораются сигналом
 * и соединяются с полем. Слабое совпадение загорается тускло и янтарём.
 *
 * Один canvas без библиотек: соседи считаются один раз при изменении размера, кадр только рисует.
 * Пауза при скрытой вкладке; при prefers-reduced-motion кадр рисуется один раз на смену состояния;
 * на телефоне меньше точек и 30 кадров в секунду.
 */

interface Star {
  x: number
  y: number
  r: number
  a: number
  phase: number
  speed: number
}

const SIGNAL = '212, 243, 90'
const AMBER = '245, 180, 85'
const DUST = '150, 165, 180'

/** Детерминированный генератор: одинаковое небо при каждом открытии. */
function random(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

function hash(text: string): number {
  let value = 2166136261
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619)
  return value >>> 0
}

export function Sky() {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const node = canvas.current
    const context = node?.getContext('2d')
    if (!node || !context) return
    const element: HTMLCanvasElement = node
    const ctx: CanvasRenderingContext2D = context

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const phone = window.matchMedia('(max-width: 640px)')
    let width = 0
    let height = 0
    let stars: Star[] = []
    let links: [number, number, number][] = []
    let frame = 0
    let last = 0
    let state: Pulse = getPulse()
    let changedAt = performance.now()
    let lit: number[] = []
    let anchor = { x: 0, y: 0 }

    function readAnchor() {
      const field = document.getElementById('query-anchor')
      const box = field?.getBoundingClientRect()
      anchor = box && box.width > 0 ? { x: box.left + box.width * 0.5, y: box.top + box.height * 0.5 } : { x: width * 0.5, y: 120 }
    }

    function build() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      element.width = Math.round(width * ratio)
      element.height = Math.round(height * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      const limit = phone.matches ? 60 : 170
      const count = Math.max(40, Math.min(limit, state.experts || 120))
      const next = random(20261121)
      stars = Array.from({ length: count }, () => ({
        x: next() * width,
        y: next() * height,
        r: 0.8 + next() * 1.2,
        a: 0.3 + next() * 0.45,
        phase: next() * Math.PI * 2,
        speed: 0.00012 + next() * 0.00022,
      }))
      // соседи один раз: дрейф маленький, граф от него не меняется
      const reach = phone.matches ? 90 : 120
      links = []
      for (let i = 0; i < stars.length; i += 1) {
        for (let j = i + 1; j < stars.length; j += 1) {
          const d = Math.hypot(stars[i].x - stars[j].x, stars[i].y - stars[j].y)
          if (d < reach) links.push([i, j, 1 - d / reach])
        }
      }
      pickLit()
      readAnchor()
    }

    function pickLit() {
      const next = random(hash(state.seed || 'sarap'))
      const pool = stars.map((_, index) => index)
      lit = []
      const wanted = state.mode === 'found' || state.mode === 'weak' ? Math.min(state.hits, 12, pool.length) : 0
      while (lit.length < wanted) lit.push(pool.splice(Math.floor(next() * pool.length), 1)[0])
    }

    function draw(now: number) {
      const still = motion.matches
      const t = still ? 0 : now
      const since = now - changedAt
      ctx.clearRect(0, 0, width, height)

      // поиск: небо стягивается к полю запроса и дышит
      const pull = state.mode === 'searching' ? (still ? 0.06 : 0.05 + 0.04 * Math.sin(since / 220)) : 0
      const positions = stars.map((star) => {
        const drift = still ? 0 : 7
        const x = star.x + Math.sin(t * star.speed + star.phase) * drift
        const y = star.y + Math.cos(t * star.speed * 0.8 + star.phase) * drift
        return { x: x + (anchor.x - x) * pull, y: y + (anchor.y - y) * pull }
      })

      ctx.lineWidth = 1
      for (const [i, j, strength] of links) {
        ctx.strokeStyle = `rgba(${DUST}, ${0.11 * strength})`
        ctx.beginPath()
        ctx.moveTo(positions[i].x, positions[i].y)
        ctx.lineTo(positions[j].x, positions[j].y)
        ctx.stroke()
      }

      for (let i = 0; i < stars.length; i += 1) {
        const star = stars[i]
        const twinkle = still ? 1 : 0.75 + 0.25 * Math.sin(t * star.speed * 9 + star.phase)
        ctx.fillStyle = `rgba(${DUST}, ${star.a * twinkle})`
        ctx.beginPath()
        ctx.arc(positions[i].x, positions[i].y, star.r, 0, Math.PI * 2)
        ctx.fill()
      }

      // найдено: линии от поля запроса к загоревшимся точкам прорисовываются за ~0,7 с
      if (lit.length > 0) {
        const color = state.mode === 'weak' ? AMBER : SIGNAL
        const reveal = still ? 1 : Math.min(1, since / 700)
        const fade = state.mode === 'weak' ? 0.45 : 1
        lit.forEach((index, order) => {
          const point = positions[index]
          const share = Math.max(0, Math.min(1, reveal * 1.6 - order * 0.08))
          if (share <= 0) return
          const x = anchor.x + (point.x - anchor.x) * share
          const y = anchor.y + (point.y - anchor.y) * share
          const gradient = ctx.createLinearGradient(anchor.x, anchor.y, x, y)
          gradient.addColorStop(0, `rgba(${color}, 0)`)
          gradient.addColorStop(1, `rgba(${color}, ${0.32 * fade})`)
          ctx.strokeStyle = gradient
          ctx.beginPath()
          ctx.moveTo(anchor.x, anchor.y)
          ctx.lineTo(x, y)
          ctx.stroke()
          if (share >= 1) {
            ctx.fillStyle = `rgba(${color}, ${0.16 * fade})`
            ctx.beginPath()
            ctx.arc(point.x, point.y, 9, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillStyle = `rgba(${color}, ${0.95 * fade})`
            ctx.beginPath()
            ctx.arc(point.x, point.y, 2.2, 0, Math.PI * 2)
            ctx.fill()
          }
        })
      }
    }

    function loop(now: number) {
      frame = requestAnimationFrame(loop)
      // телефон: 30 кадров в секунду хватает для медленного дрейфа
      if (phone.matches && now - last < 32) return
      last = now
      if (Math.round(now / 16) % 10 === 0) readAnchor()
      draw(now)
    }

    function start() {
      cancelAnimationFrame(frame)
      if (motion.matches) {
        readAnchor()
        draw(performance.now())
        return
      }
      if (!document.hidden) frame = requestAnimationFrame(loop)
    }

    const onPulse = () => {
      const next = getPulse()
      const rebuild = next.experts !== state.experts
      const relight = next.seed !== state.seed || next.mode !== state.mode
      state = next
      if (relight) changedAt = performance.now()
      if (rebuild) build()
      else if (relight) pickLit()
      if (motion.matches) start()
    }

    const onResize = () => {
      build()
      if (motion.matches) start()
    }
    const onVisibility = () => (document.hidden ? cancelAnimationFrame(frame) : start())
    const onScroll = () => {
      readAnchor()
      if (motion.matches) draw(performance.now())
    }

    build()
    start()
    const unsubscribe = subscribePulse(onPulse)
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    motion.addEventListener('change', start)
    return () => {
      cancelAnimationFrame(frame)
      unsubscribe()
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', onVisibility)
      motion.removeEventListener('change', start)
    }
  }, [])

  return (
    <canvas
      ref={canvas}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full [mask-image:radial-gradient(ellipse_90%_75%_at_50%_20%,#000_35%,transparent_100%)]"
    />
  )
}
