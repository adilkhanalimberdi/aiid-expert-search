import { strengthOf, type Strength } from '../lib/format'
import { useI18n } from '../lib/useI18n'

const TEXT: Record<Strength, string> = { strong: 'text-brand-deep', medium: 'text-medium', weak: 'text-weak' }
const BAR: Record<Strength, string> = { strong: 'bg-brand', medium: 'bg-medium-bar', weak: 'bg-weak-bar' }

/**
 * Процент совпадения: цифра и полоска. Цвет только от порогов 70 и 40,
 * поэтому 26% серое и не выглядит как успех. Слово силы дублирует цвет для тех, кто его не различает.
 */
export function Score({ percent, size = 'row' }: { percent: number; size?: 'row' | 'hero' }) {
  const { t } = useI18n()
  const strength = strengthOf(percent)
  if (size === 'hero') {
    return (
      <div className="flex flex-col items-end">
        <p className={`tnum text-[56px] font-extrabold leading-none tracking-[-0.045em] ${TEXT[strength]}`} aria-label={t.card.matchAria(percent)}>
          {percent}
        </p>
        <p className="mt-1.5 text-[13px] font-semibold text-ink-2">{t.card.strength[strength]}</p>
        <Meter percent={percent} strength={strength} className="mt-2 w-24" />
      </div>
    )
  }
  return (
    <div className="flex w-12 flex-col gap-1.5">
      <span className={`tnum text-2xl font-extrabold leading-none tracking-[-0.03em] ${TEXT[strength]}`} aria-label={t.card.matchAria(percent)}>
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
