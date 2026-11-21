/**
 * Знак Sarap: шафрановая плитка, три строки картотеки, каждая короче предыдущей, и точка в конце:
 * из всего каталога остаётся один нужный человек. isDrawing: строки перебираются, пока идёт поиск.
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
      <g stroke="var(--color-action-ink)" strokeWidth="3" strokeLinecap="round">
        <path className="bar" d="M8 10h16" />
        <path className="bar" d="M8 16h11" />
        <path className="bar" d="M8 22h5" />
      </g>
      <circle cx="20" cy="22" r="2.6" fill="var(--color-action-ink)" />
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
