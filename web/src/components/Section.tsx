import type { ReactNode } from 'react'

interface SectionProps {
  id: string
  title: ReactNode
  hint?: ReactNode
  children: ReactNode
  className?: string
}

/** Открытый раздел без рамки: крупный лёгкий заголовок и чёрная линейка, как «Другие кандидаты» на поиске. */
export function Section({ id, title, hint, children, className = '' }: SectionProps) {
  return (
    <section aria-labelledby={id} className={className}>
      <h2 id={id} className="font-display text-[32px] font-light leading-[1.1] tracking-[-0.035em] text-balance sm:text-[40px]">
        {title}
      </h2>
      {hint && <p className="mt-2 max-w-[65ch] text-[15px] text-muted">{hint}</p>}
      <div className="mt-5 border-t-2 border-ink">{children}</div>
    </section>
  )
}
