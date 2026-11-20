// Знак Sarap: двойной рог «қошқар мүйіз», мотив казахского орнамента. Две завитушки (запрос и эксперт)
// почти встречаются. Каждая завитушка это четыре дуги циркулем с радиусами 1,5; 4,5; 7,5; 10,5 и центрами,
// чередующимися по оси; правая зеркальна левой.

const HORN = 'M32 32A1.5 1.5 0 0 0 29 32A4.5 4.5 0 0 0 38 32A7.5 7.5 0 0 0 23 32A10.5 10.5 0 0 0 44 32'
const VIEW_BOX = '11 22 50 23'
const ASPECT = 50 / 23

interface VolutesProps {
  width?: number
  left?: string
  right?: string
  strokeWidth?: number
  /** Дорисовка завитушек во время ожидания */
  isDrawing?: boolean
  label?: string
}

export function Volutes({
  width = 58,
  left = 'var(--color-white)',
  right = 'var(--color-lime)',
  strokeWidth = 2,
  isDrawing = false,
  label,
}: VolutesProps) {
  const className = isDrawing ? 'horn-draw' : undefined
  return (
    <svg
      width={width}
      height={width / ASPECT}
      viewBox={VIEW_BOX}
      fill="none"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <g transform="translate(-10 0)" stroke={left}>
        <path className={className} d={HORN} />
      </g>
      <g transform="translate(82 0) scale(-1 1)" stroke={right}>
        <path className={className} d={HORN} />
      </g>
    </svg>
  )
}

/** Огромные тонкие завитушки на фоне шапки: фирменный узор, не иллюстрация. */
export function HornBackdrop() {
  return (
    <svg
      aria-hidden
      viewBox={VIEW_BOX}
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute left-1/2 top-[55%] h-[874px] w-[1900px] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-[0.16]"
      fill="none"
      stroke="var(--color-white)"
      strokeWidth={0.32}
      strokeLinecap="round"
    >
      <g transform="translate(-10 0)">
        <path d={HORN} />
      </g>
      <g transform="translate(82 0) scale(-1 1)">
        <path d={HORN} />
      </g>
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

/** Лого-лок «Sarap | AIID»: сервис как часть экосистемы альянса. */
export function Brand() {
  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <Volutes width={56} label="Sarap" />
      <span className="font-display text-[26px] font-normal tracking-[-0.03em] text-white">Sarap</span>
      <span aria-hidden className="h-6 w-px bg-white/40" />
      <AiidLogo height={30} />
    </div>
  )
}
