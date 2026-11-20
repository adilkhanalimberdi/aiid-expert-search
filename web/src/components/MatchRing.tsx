interface MatchRingProps {
  percent: number
  size?: number
}

/** Сильное совпадение зелёное, среднее янтарное, слабое серое: 26% не должно выглядеть как успех. */
function toneFor(percent: number): { stroke: string; text: string } {
  if (percent >= 70) return { stroke: 'stroke-teal', text: 'text-teal' }
  if (percent >= 40) return { stroke: 'stroke-partial-fg', text: 'text-partial-fg' }
  return { stroke: 'stroke-busy-fg/60', text: 'text-busy-fg' }
}

export function MatchRing({ percent, size = 72 }: MatchRingProps) {
  const stroke = 7
  const radius = (size - stroke) / 2
  const tone = toneFor(percent)
  const circumference = 2 * Math.PI * radius
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Match with your query: ${percent}%`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-line" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={tone.stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
        />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center font-display text-sm font-bold ${tone.text}`}>
        {percent}%
      </span>
    </div>
  )
}
