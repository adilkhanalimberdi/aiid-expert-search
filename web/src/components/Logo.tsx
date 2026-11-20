/**
 * Знак Sarap: коралловая плитка и буква S из двух полукругов с ровными концами,
 * две половины, запрос и эксперт, состыкованные в одну линию. isDrawing: линия прорисовывается, пока идёт поиск.
 */
export function SarapMark({ size = 32, isDrawing = false, label }: { size?: number; isDrawing?: boolean; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`flex-none ${isDrawing ? 'mark-draw' : ''}`}
    >
      <rect width="32" height="32" rx="8" fill="var(--color-action)" />
      <path
        d="M21.5 8.5H14.25a3.75 3.75 0 0 0 0 7.5h3.5a3.75 3.75 0 0 1 0 7.5H10.5"
        fill="none"
        stroke="var(--color-action-ink)"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Оригинальный логотип AIID без изменений (файл предоставлен командой, права у AIID), обрезан по полям изображения. */
export function AiidLogo({ height = 32 }: { height?: number }) {
  return (
    <svg
      viewBox="30 19 200 131"
      height={height}
      width={Math.round((height * 200) / 131)}
      role="img"
      aria-label="AIID: Alliance of Innovative and Industrial Development"
      className="flex-none"
    >
      <image href="/brand/aiid-white.png" width="259" height="170" />
    </svg>
  )
}

/** Лого-лок «Sarap | AIID» для тёмной верхней панели. */
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <div className="flex items-center gap-2.5">
        <SarapMark size={compact ? 28 : 32} label="Sarap" />
        <span aria-hidden className="text-[20px] font-semibold tracking-[-0.02em] text-white sm:text-[22px]">
          Sarap
        </span>
      </div>
      <span aria-hidden className="h-8 w-px bg-night-line" />
      <AiidLogo height={compact ? 36 : 44} />
    </div>
  )
}
