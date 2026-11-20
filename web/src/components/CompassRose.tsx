/** Декор шапки: роза ветров с покачивающейся стрелкой. Скрыта от скринридеров и с телефона. */
export function CompassRose() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 200"
      className="pointer-events-none absolute -right-10 top-4 hidden size-72 opacity-60 lg:block"
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
      <g className="needle-sweep">
        <g transform="rotate(40 100 100)">
          <path d="M100 30 L110 100 L90 100Z" className="fill-sky" />
          <path d="M100 170 L110 100 L90 100Z" className="fill-ground/50" />
        </g>
      </g>
      <circle cx="100" cy="100" r="5" className="fill-ink stroke-sky" strokeWidth="2" />
    </svg>
  )
}
