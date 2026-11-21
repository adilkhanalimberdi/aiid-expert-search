/**
 * Знак Sarap: точка в четырёх уголках визира. Точка это эксперт на небе каталога,
 * уголки это запрос, который его «захватил». Тот же жест повторяет выбранная карточка (класс .reticle).
 * isScanning: уголки сжимаются к точке, пока идёт подбор.
 */
export function SarapMark({ size = 28, isScanning = false, label }: { size?: number; isScanning?: boolean; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`flex-none ${isScanning ? 'mark-scan' : ''}`}
    >
      <g className="corners" fill="none" stroke="var(--color-action)" strokeWidth="2.6" strokeLinecap="square">
        <path d="M3 10V3h7M22 3h7v7M29 22v7h-7M10 29H3v-7" />
      </g>
      <circle className="core" cx="16" cy="16" r="4.6" fill="var(--color-action)" />
    </svg>
  )
}

/** Лого-лок: знак и слово Sarap. Логотипов партнёров нет. */
export function Brand() {
  return (
    <span className="flex items-center gap-2.5">
      <SarapMark size={26} />
      <span className="display text-[19px] font-semibold tracking-[0.02em] text-ink">Sarap</span>
    </span>
  )
}
