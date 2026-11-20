import { useEffect, useRef } from 'react'

const REST_ANGLE = 40
const EASING = 0.08

/** Декор шапки: роза ветров, стрелка которой плавно поворачивается к курсору. */
export function CompassRose() {
  const roseRef = useRef<SVGSVGElement>(null)
  const needleRef = useRef<SVGGElement>(null)

  useEffect(() => {
    const rose = roseRef.current
    const needle = needleRef.current
    if (!rose || !needle) return

    const isStatic = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let target = REST_ANGLE
    let current = REST_ANGLE
    let frame = 0

    function onPointerMove(event: PointerEvent) {
      const rect = rose!.getBoundingClientRect()
      const dx = event.clientX - (rect.left + rect.width / 2)
      const dy = event.clientY - (rect.top + rect.height / 2)
      target = (Math.atan2(dx, -dy) * 180) / Math.PI // 0° смотрит вверх
    }

    function render() {
      // кратчайший путь по кругу, чтобы стрелка не делала оборот через 180°
      const delta = ((((target - current) % 360) + 540) % 360) - 180
      current += delta * EASING
      needle!.setAttribute('transform', `rotate(${current} 100 100)`)
      frame = requestAnimationFrame(render)
    }

    needle.setAttribute('transform', `rotate(${REST_ANGLE} 100 100)`)
    if (isStatic) return
    window.addEventListener('pointermove', onPointerMove)
    frame = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onPointerMove)
    }
  }, [])

  return (
    <svg
      ref={roseRef}
      aria-hidden
      viewBox="0 0 200 200"
      className="pointer-events-none absolute -right-10 top-4 hidden size-72 opacity-70 lg:block"
      fill="none"
    >
      <circle cx="100" cy="100" r="92" className="stroke-sky/30" strokeWidth="1" />
      <circle cx="100" cy="100" r="68" className="stroke-sky/20" strokeWidth="1" strokeDasharray="2 6" />
      <circle cx="100" cy="100" r="40" className="stroke-sky/20" strokeWidth="1" />
      {Array.from({ length: 24 }, (_, index) => (
        <line
          key={index}
          x1="100"
          y1="6"
          x2="100"
          y2={index % 6 === 0 ? 20 : 12}
          transform={`rotate(${index * 15} 100 100)`}
          className="stroke-sky/40"
          strokeWidth="1.2"
        />
      ))}
      <g ref={needleRef}>
        <path d="M100 30 L110 100 L90 100Z" className="fill-sky" />
        <path d="M100 170 L110 100 L90 100Z" className="fill-ground/50" />
      </g>
      <circle cx="100" cy="100" r="5" className="fill-ink stroke-sky" strokeWidth="2" />
    </svg>
  )
}
