import { strengthOf, type Strength } from '../lib/format'
import { useI18n } from '../lib/useI18n'

const TEXT: Record<Strength, string> = { strong: 'text-brand-deep', medium: 'text-medium', weak: 'text-weak' }
const RING: Record<Strength, string> = { strong: 'var(--color-brand)', medium: 'var(--color-medium-bar)', weak: 'var(--color-weak-bar)' }
const BAR: Record<Strength, string> = { strong: 'bg-brand', medium: 'bg-medium-bar', weak: 'bg-weak-bar' }

/**
 * Процент совпадения: цифра и полоска. Цвет только от порогов 70 и 40,
 * поэтому 26% серое и не выглядит как успех. Слово силы дублирует цвет для тех, кто его не различает.
 */
export function Score({ percent, size = 'row' }: { percent: number; size?: 'row' | 'hero' }) {
  const { t } = useI18n()
  const strength = strengthOf(percent)
  if (size === 'hero') {
    // кольцо: длина дуги равна проценту, цвет только от порогов
    const radius = 34
    const length = 2 * Math.PI * radius
    return (
      <div className="flex flex-col items-center">
        <div className="relative size-[84px]">
          <svg viewBox="0 0 84 84" className="size-full -rotate-90" aria-hidden>
            <circle cx="42" cy="42" r={radius} fill="none" stroke="var(--color-line)" strokeWidth="7" />
            <circle
              cx="42"
              cy="42"
              r={radius}
              fill="none"
              stroke={RING[strength]}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${(Math.max(2, percent) / 100) * length} ${length}`}
            />
          </svg>
          <p className={`tnum absolute inset-0 grid place-items-center text-[26px] font-bold tracking-[-0.03em] ${TEXT[strength]}`} aria-label={t.card.matchAria(percent)}>
            <span>
              {percent}
              <span className="text-sm font-semibold">%</span>
            </span>
          </p>
        </div>
        <p className="mt-1.5 text-center text-xs font-semibold text-ink-2">{t.card.strength[strength]}</p>
      </div>
    )
  }
  return (
    <div className="flex w-12 flex-col gap-1.5">
      <span className={`tnum text-2xl font-bold leading-none tracking-[-0.03em] ${TEXT[strength]}`} aria-label={t.card.matchAria(percent)}>
        {percent}
      </span>
      <Meter percent={percent} strength={strength} />
    </div>
  )
}

function Meter({ percent, strength, className = '' }: { percent: number; strength: Strength; className?: string }) {
  return (
    <span aria-hidden className={`block h-1 overflow-hidden rounded-full bg-line ${className}`}>
      <span className={`block h-full rounded-full ${BAR[strength]}`} style={{ width: `${Math.max(4, Math.min(100, percent))}%` }} />
    </span>
  )
}
