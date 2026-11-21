import { useEffect, useRef } from 'react'
import { getPulse, subscribePulse, type Pulse } from '../lib/pulse'

/**
 * Фон «небо каталога»: точки это эксперты (сколько людей в базе, столько точек, с потолком), они медленно
 * плывут, а близкие соединяются тонкими линиями, как граф компетенций. Курсор работает как фонарик:
 * соседние точки чуть расступаются и тянут к нему нити. Пока идёт поиск, небо тянется к полю запроса;
 * когда выдача пришла, столько точек, сколько найдено, загораются и соединяются с полем.
 *
 * Один canvas без библиотек. Пауза при скрытой вкладке; при prefers-reduced-motion один статичный кадр
 * на смену состояния; на телефоне меньше точек и 30 кадров в секунду.
 */

interface Star {
  /** где точка живёт и дрейфует */
  x: number
  y: number
  /** где её рисуем: со временным стягиванием к полю запроса */
  px: number
  py: number
  vx: number
  vy: number
  r: number
}

const SIGNAL = '212, 243, 90'
const AMBER = '245, 180, 85'
const DUST = '160, 174, 190'

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
    let frame = 0
    let last = 0
    let state: Pulse = getPulse()
    let changedAt = performance.now()
    let lit: number[] = []
    let anchor = { x: 0, y: 0 }
    const pointer = { x: -9999, y: -9999, strength: 0, target: 0 }
    // доля стягивания к полю запроса: плавно растёт во время поиска до потолка и плавно спадает после
    let gather = 0

    function readAnchor() {
      const box = document.getElementById('query-anchor')?.getBoundingClientRect()
      anchor = box && box.width > 0 ? { x: box.left + box.width * 0.5, y: box.top + box.height * 0.5 } : { x: width * 0.5, y: 120 }
    }

    function build() {
      // плотность не выше 1,5: на Retina в 2 раза дешевле, тонкие линии всё равно гладкие
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
      width = window.innerWidth
      height = window.innerHeight
      element.width = Math.round(width * ratio)
      element.height = Math.round(height * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      const limit = phone.matches ? 45 : 100
      const count = Math.max(40, Math.min(limit, state.experts || 110))
      const next = random(20261121)
      stars = Array.from({ length: count }, () => {
        const angle = next() * Math.PI * 2
        const speed = 0.06 + next() * 0.12
        const x = next() * width
        const y = next() * height
        return {
          x,
          y,
          px: x,
          py: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r: 0.8 + next() * 1.1,
        }
      })
      pickLit()
      readAnchor()
    }

    function pickLit() {
      const next = random(hash(state.seed || 'sarap'))
      const pool = stars.map((_, index) => index)
      lit = []
      const wanted = state.mode === 'found' || state.mode === 'weak' ? Math.min(state.hits, 10, pool.length) : 0
      while (lit.length < wanted) lit.push(pool.splice(Math.floor(next() * pool.length), 1)[0])
    }

    function step(dt: number, now: number) {
      // стягивание не копится в позициях точек (иначе за долгий поиск небо сжималось в точку и пропадало):
      // это временное смещение рисунка с потолком около трети пути, которое после ответа уходит в ноль
      const target = state.mode === 'searching' ? 0.26 + 0.06 * Math.sin((now - changedAt) / 260) : 0
      gather += (target - gather) * Math.min(1, dt * 0.006)
      for (const star of stars) {
        // курсор мягко раздвигает точки рядом
        const dx = star.x - pointer.x
        const dy = star.y - pointer.y
        const d2 = dx * dx + dy * dy
        if (pointer.strength > 0.01 && d2 < 140 * 140 && d2 > 1) {
          const push = ((1 - Math.sqrt(d2) / 140) * 0.35 * pointer.strength) / Math.sqrt(d2)
          star.x += dx * push * dt * 0.06
          star.y += dy * push * dt * 0.06
        }
        star.x += star.vx * dt * 0.06
        star.y += star.vy * dt * 0.06
        // за краем экрана точка появляется с другой стороны
        if (star.x < -20) star.x = width + 20
        else if (star.x > width + 20) star.x = -20
        if (star.y < -20) star.y = height + 20
        else if (star.y > height + 20) star.y = -20
        star.px = star.x + (anchor.x - star.x) * gather
        star.py = star.y + (anchor.y - star.y) * gather
      }
      pointer.strength += (pointer.target - pointer.strength) * 0.08
    }

    function draw(now: number) {
      const still = motion.matches
      const since = now - changedAt
      ctx.clearRect(0, 0, width, height)
      const reach = phone.matches ? 95 : 125
      const reach2 = reach * reach

      // линии пачками по четырём уровням прозрачности: четыре stroke на кадр вместо сотен
      ctx.lineWidth = 1
      const buckets: Path2D[] = [new Path2D(), new Path2D(), new Path2D(), new Path2D()]
      for (let i = 0; i < stars.length; i += 1) {
        const a = stars[i]
        for (let j = i + 1; j < stars.length; j += 1) {
          const b = stars[j]
          const dx = a.px - b.px
          const dy = a.py - b.py
          const d2 = dx * dx + dy * dy
          if (d2 > reach2) continue
          const level = Math.min(3, Math.floor((1 - Math.sqrt(d2) / reach) * 4))
          buckets[level].moveTo(a.px, a.py)
          buckets[level].lineTo(b.px, b.py)
        }
      }
      buckets.forEach((path, level) => {
        ctx.strokeStyle = `rgba(${DUST}, ${0.03 * (level + 1)})`
        ctx.stroke(path)
      })

      // фонарик курсора: нити к ближайшим точкам, точки рядом ярче и крупнее
      const radius = 170
      const glow = new Path2D()
      const threads = new Path2D()
      const dots = new Path2D()
      const active = pointer.strength > 0.02
      for (const star of stars) {
        const d = active ? Math.hypot(star.px - pointer.x, star.py - pointer.y) : radius
        if (d < radius) {
          threads.moveTo(pointer.x, pointer.y)
          threads.lineTo(star.px, star.py)
          glow.moveTo(star.px + star.r + 0.8, star.py)
          glow.arc(star.px, star.py, star.r + 0.8, 0, Math.PI * 2)
        } else {
          dots.moveTo(star.px + star.r, star.py)
          dots.arc(star.px, star.py, star.r, 0, Math.PI * 2)
        }
      }
      ctx.fillStyle = `rgba(${DUST}, 0.45)`
      ctx.fill(dots)
      if (active) {
        ctx.strokeStyle = `rgba(${DUST}, ${0.16 * pointer.strength})`
        ctx.stroke(threads)
        ctx.fillStyle = `rgba(${DUST}, ${0.45 + 0.45 * pointer.strength})`
        ctx.fill(glow)
      }

      if (lit.length > 0) {
        const color = state.mode === 'weak' ? AMBER : SIGNAL
        const reveal = still ? 1 : Math.min(1, since / 800)
        const fade = state.mode === 'weak' ? 0.4 : 0.8
        lit.forEach((index, order) => {
          const point = stars[index]
          const share = Math.max(0, Math.min(1, reveal * 1.6 - order * 0.08))
          if (share <= 0) return
          const x = anchor.x + (point.px - anchor.x) * share
          const y = anchor.y + (point.py - anchor.y) * share
          const gradient = ctx.createLinearGradient(anchor.x, anchor.y, x, y)
          gradient.addColorStop(0, `rgba(${color}, 0)`)
          gradient.addColorStop(1, `rgba(${color}, ${0.22 * fade})`)
          ctx.strokeStyle = gradient
          ctx.beginPath()
          ctx.moveTo(anchor.x, anchor.y)
          ctx.lineTo(x, y)
          ctx.stroke()
          if (share >= 1) {
            ctx.fillStyle = `rgba(${color}, ${fade})`
            ctx.beginPath()
            ctx.arc(point.px, point.py, 2, 0, Math.PI * 2)
            ctx.fill()
          }
        })
      }
    }

    function loop(now: number) {
      frame = requestAnimationFrame(loop)
      // телефон: 30 кадров в секунду хватает для медленного дрейфа
      if (phone.matches && now - last < 32) return
      const dt = Math.min(50, now - (last || now))
      last = now
      if (Math.round(now / 16) % 10 === 0) readAnchor()
      step(dt, now)
      draw(now)
    }

    function start() {
      cancelAnimationFrame(frame)
      last = 0
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
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      pointer.x = event.clientX
      pointer.y = event.clientY
      pointer.target = 1
    }
    const onLeave = () => (pointer.target = 0)

    build()
    start()
    const unsubscribe = subscribePulse(onPulse)
    window.addEventListener('resize', onResize)
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    document.addEventListener('visibilitychange', onVisibility)
    motion.addEventListener('change', start)
    return () => {
      cancelAnimationFrame(frame)
      unsubscribe()
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onVisibility)
      motion.removeEventListener('change', start)
    }
  }, [])

  return <canvas ref={canvas} aria-hidden className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />
}
