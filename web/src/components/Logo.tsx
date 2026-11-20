/**
 * Знак Sarap: буква S из двух дуг, запрос и профиль эксперта, а абрикосовая точка это место, где они сошлись.
 * isDrawing: дуги прорисовываются заново, пока идёт поиск.
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
      <rect width="32" height="32" rx="8" fill="var(--color-brand)" />
      <path
        d="M20.6 10.2a5 5 0 1 0-4.6 6.8 5 5 0 1 1-4.6 6.8"
        fill="none"
        stroke="#fff"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <circle cx="21.2" cy="10" r="2.3" fill="var(--color-spark)" />
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

/** Лого-лок «Sarap | AIID» для тёмной оболочки. */
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <SarapMark size={compact ? 28 : 32} label="Sarap" />
      <span aria-hidden className="text-[20px] font-bold tracking-[-0.02em] text-white">
        Sarap
      </span>
      <span aria-hidden className="h-7 w-px bg-night-line" />
      <AiidLogo height={compact ? 32 : 42} />
    </div>
  )
}
