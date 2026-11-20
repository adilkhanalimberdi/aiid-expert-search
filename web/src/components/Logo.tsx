import { useId } from 'react'

/**
 * Знак Sarap: на голубой плитке два круга по диагонали, запрос и эксперт (золотой); белая линза между ними это совпадение.
 * isDrawing: линза пульсирует, пока идёт поиск.
 */
export function SarapMark({ size = 32, isDrawing = false, label }: { size?: number; isDrawing?: boolean; label?: string }) {
  const clip = useId()
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`flex-none ${isDrawing ? 'mark-pulse' : ''}`}
    >
      <defs>
        <clipPath id={clip}>
          <circle cx="13" cy="13" r="7.5" />
        </clipPath>
      </defs>
      <rect width="32" height="32" rx="9" fill="#1a6fe0" />
      <circle cx="13" cy="13" r="7.5" fill="#ffffff" fillOpacity="0.35" />
      <circle cx="19" cy="19" r="7.5" fill="#f2b33d" />
      <circle className="mark-lens" cx="19" cy="19" r="7.5" fill="#ffffff" clipPath={`url(#${clip})`} />
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
        <span aria-hidden className="text-[19px] font-bold tracking-[-0.025em] text-white sm:text-[21px]">
          Sarap
        </span>
      </div>
      <span aria-hidden className="h-8 w-px bg-night-line" />
      <AiidLogo height={compact ? 36 : 44} />
    </div>
  )
}
