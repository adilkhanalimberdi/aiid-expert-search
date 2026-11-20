const GEAR_TEETH = 10
const GEAR_OUTER_RADIUS = 15
const GEAR_INNER_RADIUS = 12.2
const GEAR_HOLE_RADIUS = 8.6

/** Контур шестерни из зубцов по кругу: отсылка к знаку AIID. */
function gearPath(): string {
  const step = (Math.PI * 2) / GEAR_TEETH
  const point = (radius: number, angle: number) =>
    `${(16 + radius * Math.sin(angle)).toFixed(2)} ${(16 - radius * Math.cos(angle)).toFixed(2)}`
  const outer = Array.from({ length: GEAR_TEETH }, (_, index) => {
    const angle = index * step
    return [
      point(GEAR_INNER_RADIUS, angle - step * 0.3),
      point(GEAR_OUTER_RADIUS, angle - step * 0.17),
      point(GEAR_OUTER_RADIUS, angle + step * 0.17),
      point(GEAR_INNER_RADIUS, angle + step * 0.3),
    ].join(' L')
  })
  const hole = `M16 ${16 - GEAR_HOLE_RADIUS} a${GEAR_HOLE_RADIUS} ${GEAR_HOLE_RADIUS} 0 1 0 0 ${GEAR_HOLE_RADIUS * 2} a${GEAR_HOLE_RADIUS} ${GEAR_HOLE_RADIUS} 0 1 0 0 -${GEAR_HOLE_RADIUS * 2}Z`
  return `M${outer.join(' L')}Z ${hole}`
}

const GEAR = gearPath()

interface MarkProps {
  size?: number
}

/** Знак Lodestar: шестерня (индустрия, как у AIID) и стрелка-компас, указывающая на лучшего эксперта. */
export function Logo({ size = 36 }: MarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path d={GEAR} fillRule="evenodd" className="fill-ground" />
      <g transform="rotate(45 16 16)">
        <path d="M16 8.2 L18.4 16 L13.6 16Z" className="fill-sky" />
        <path d="M16 23.8 L18.4 16 L13.6 16Z" className="fill-ground/80" />
      </g>
      <circle cx="16" cy="16" r="1.5" className="fill-ink" />
    </svg>
  )
}

/** Логотип AIID без изменений (файл предоставлен командой), обрезан по границам изображения. */
export function AiidLogo({ height = 44 }: { height?: number }) {
  return (
    <svg
      viewBox="30 19 200 131"
      height={height}
      width={(height * 200) / 131}
      role="img"
      aria-label="AIID: Alliance of Innovative and Industrial Development"
    >
      <image href="/brand/aiid-white.png" width="259" height="170" />
    </svg>
  )
}

/** Лого-лок «AIID | Lodestar»: логотип альянса и сервис как часть его экосистемы. */
export function Brand() {
  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <AiidLogo height={42} />
      <span aria-hidden className="h-9 w-px bg-ground/25" />
      <div className="flex items-center gap-2.5">
        <Logo size={34} />
        <div className="leading-tight">
          <p className="font-display text-lg font-bold text-white">Lodestar</p>
          <p className="text-xs text-ground/70">expert matching</p>
        </div>
      </div>
    </div>
  )
}
