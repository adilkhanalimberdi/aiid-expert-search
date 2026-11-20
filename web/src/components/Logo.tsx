interface LogoProps {
  size?: number
}

/** Знак Lodestar: стрелка указывает на лучшего эксперта. */
export function Logo({ size = 36 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="13" className="stroke-sky/50" strokeWidth="1.6" />
      <g transform="rotate(45 16 16)">
        <path d="M16 4 L19.5 16 L12.5 16Z" className="fill-sky" />
        <path d="M16 28 L19.5 16 L12.5 16Z" className="fill-ground/85" />
      </g>
      <circle cx="16" cy="16" r="1.8" className="fill-ink" />
    </svg>
  )
}

export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <Logo />
      <div className="leading-tight">
        <p className="font-display text-lg font-bold text-white">Lodestar</p>
        <p className="text-xs text-ground/70">expert matching for AIID</p>
      </div>
    </div>
  )
}
