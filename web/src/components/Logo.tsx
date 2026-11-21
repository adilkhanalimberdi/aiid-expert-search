/** Общая часть двух кругов: то, в чём запрос и профиль совпали. */
const LENS = 'M16 10.64A7 7 0 0 1 16 21.36A7 7 0 0 1 16 10.64z'

/**
 * Знак Sarap: два круга, запрос и эксперт, и залитое пересечение между ними. Пересечение и есть
 * совпадение, которое сервис находит и объясняет: процент, совпавшие компетенции, доводы.
 * isDrawing: круги сходятся и расходятся, пока идёт подбор.
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
      <g fill="none" stroke="var(--color-action-ink)" strokeWidth="2">
        <circle className="ring-a" cx="11.5" cy="16" r="7" />
        <circle className="ring-b" cx="20.5" cy="16" r="7" />
      </g>
      <path className="lens" d={LENS} fill="var(--color-action-ink)" />
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
