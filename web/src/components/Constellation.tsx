import { useEffect, useRef } from 'react'

interface ConstellationProps {
  /** Цвета берутся из токенов темы (CSS-переменные), HEX в коде не пишем. */
  dotColorVar: string
  lineColorVar: string
  /** Частиц на 100 000 пикселей площади: плотность не зависит от размера экрана. */
  density?: number
  /** Максимальная яркость точек и линий от 0 до 1. */
  intensity?: number
  className?: string
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
}

const LINK_DISTANCE = 120
const CURSOR_DISTANCE = 170
const MAX_DEVICE_PIXEL_RATIO = 2

function readColor(variable: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
}

/** Фон из «звёзд»: они плывут сами, расходятся от курсора и тянутся к нему тонкими линиями. */
export function Constellation({
  dotColorVar,
  lineColorVar,
  density = 7,
  intensity = 0.7,
  className = '',
}: ConstellationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const isStatic = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dotColor = readColor(dotColorVar)
    const lineColor = readColor(lineColorVar)
    const pointer = { x: -9999, y: -9999, isActive: false }
    let particles: Particle[] = []
    let width = 0
    let height = 0
    let frame = 0

    function resize() {
      const rect = canvas!.getBoundingClientRect()
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO)
      width = rect.width
      height = rect.height
      canvas!.width = Math.round(width * ratio)
      canvas!.height = Math.round(height * ratio)
      context!.setTransform(ratio, 0, 0, ratio, 0, 0)
      const count = Math.round((width * height * density) / 100_000)
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        radius: 0.8 + Math.random() * 1.6,
      }))
    }

    function onPointerMove(event: PointerEvent) {
      const rect = canvas!.getBoundingClientRect()
      pointer.x = event.clientX - rect.left
      pointer.y = event.clientY - rect.top
      pointer.isActive = pointer.x >= 0 && pointer.y >= 0 && pointer.x <= rect.width && pointer.y <= rect.height
    }

    function step() {
      for (const particle of particles) {
        if (pointer.isActive) {
          const dx = particle.x - pointer.x
          const dy = particle.y - pointer.y
          const distance = Math.hypot(dx, dy)
          if (distance < CURSOR_DISTANCE && distance > 0) {
            const push = ((CURSOR_DISTANCE - distance) / CURSOR_DISTANCE) * 0.06
            particle.vx += (dx / distance) * push
            particle.vy += (dy / distance) * push
          }
        }
        particle.vx *= 0.985
        particle.vy *= 0.985
        // фоновый дрейф не даёт частицам замереть
        particle.vx += (Math.random() - 0.5) * 0.01
        particle.vy += (Math.random() - 0.5) * 0.01
        particle.x += particle.vx
        particle.y += particle.vy
        if (particle.x < -10) particle.x = width + 10
        if (particle.x > width + 10) particle.x = -10
        if (particle.y < -10) particle.y = height + 10
        if (particle.y > height + 10) particle.y = -10
      }
    }

    function draw() {
      context!.clearRect(0, 0, width, height)
      context!.lineWidth = 1

      if (pointer.isActive) {
        const glow = context!.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, CURSOR_DISTANCE * 1.4)
        glow.addColorStop(0, dotColor)
        glow.addColorStop(1, 'transparent')
        context!.globalAlpha = intensity * 0.18
        context!.fillStyle = glow
        context!.fillRect(pointer.x - CURSOR_DISTANCE * 1.4, pointer.y - CURSOR_DISTANCE * 1.4, CURSOR_DISTANCE * 2.8, CURSOR_DISTANCE * 2.8)
      }

      context!.strokeStyle = lineColor
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i]
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j]
          const distance = Math.hypot(a.x - b.x, a.y - b.y)
          if (distance < LINK_DISTANCE) {
            context!.globalAlpha = intensity * 0.45 * (1 - distance / LINK_DISTANCE)
            context!.beginPath()
            context!.moveTo(a.x, a.y)
            context!.lineTo(b.x, b.y)
            context!.stroke()
          }
        }
        if (pointer.isActive) {
          const distance = Math.hypot(a.x - pointer.x, a.y - pointer.y)
          if (distance < CURSOR_DISTANCE) {
            context!.globalAlpha = intensity * (1 - distance / CURSOR_DISTANCE)
            context!.beginPath()
            context!.moveTo(a.x, a.y)
            context!.lineTo(pointer.x, pointer.y)
            context!.stroke()
          }
        }
      }

      context!.fillStyle = dotColor
      for (const particle of particles) {
        context!.globalAlpha = intensity
        context!.beginPath()
        context!.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        context!.fill()
      }
      context!.globalAlpha = 1
    }

    function loop() {
      step()
      draw()
      frame = requestAnimationFrame(loop)
    }

    function onVisibilityChange() {
      cancelAnimationFrame(frame)
      if (document.visibilityState === 'visible' && !isStatic) loop()
    }

    resize()
    draw()
    if (!isStatic) loop()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    window.addEventListener('pointermove', onPointerMove)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [dotColorVar, lineColorVar, density, intensity])

  return <canvas ref={canvasRef} aria-hidden className={`pointer-events-none ${className}`} />
}
