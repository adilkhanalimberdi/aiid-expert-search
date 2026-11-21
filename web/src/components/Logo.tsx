/** Облачко запроса: обычная фраза, с которой человек приходит в сервис. */
const BUBBLE = 'M9 5.5h14a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4H13.5l-5.2 4.2v-4.4A4 4 0 0 1 5 18.5v-9a4 4 0 0 1 4-4z'

/**
 * Знак Sarap: облачко реплики, внутри которого человек. Пишешь, кто нужен, обычными словами,
 * и получаешь конкретного эксперта. isDrawing: человек «проявляется», пока идёт поиск.
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
      <rect width="32" height="32" rx="7" fill="var(--color-action)" />
      <path d={BUBBLE} fill="var(--color-action-ink)" />
      <g className="who" fill="var(--color-action)">
        <circle cx="16" cy="11.6" r="2.9" />
        <path d="M10.6 20.4a5.4 5.4 0 0 1 10.8 0z" />
      </g>
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
        <span aria-hidden className="serif text-[21px] font-semibold tracking-[-0.01em] text-night-text sm:text-[23px]">
          Sarap
        </span>
      </div>
      <span aria-hidden className="h-8 w-px bg-night-line" />
      <AiidLogo height={compact ? 36 : 44} />
    </div>
  )
}
