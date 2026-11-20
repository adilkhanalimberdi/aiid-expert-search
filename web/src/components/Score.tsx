import { strengthOf, type Strength } from '../lib/format'
import { useI18n } from '../lib/useI18n'

const TEXT: Record<Strength, string> = { strong: 'text-brand-deep', medium: 'text-medium', weak: 'text-weak' }
const BAR: Record<Strength, string> = { strong: 'bg-brand', medium: 'bg-medium-bar', weak: 'bg-weak-bar' }

/**
 * Процент совпадения: цифра и полоска (в профиле крупнее, со словом силы). Цвет только от порогов 70 и 40,
 * поэтому 26% серое и не выглядит как успех. Слово силы дублирует цвет для тех, кто его не различает.
 */
export function Score({ percent, size = 'row' }: { percent: number; size?: 'row' | 'hero' }) {
  const { t } = useI18n()
  const strength = strengthOf(percent)
  if (size === 'hero') {
    return (
      <div className="flex min-w-[116px] flex-col items-end">
        <p className={`tnum text-[44px] font-semibold leading-none tracking-[-0.035em] ${TEXT[strength]}`} aria-label={t.card.matchAria(percent)}>
          {percent}
          <span className="ml-0.5 text-xl font-medium">%</span>
        </p>
        <Meter percent={percent} strength={strength} className="mt-2.5 w-full" />
        <p className="mt-1.5 whitespace-nowrap text-right text-xs font-medium text-ink-2">{t.card.strength[strength]}</p>
      </div>
    )
  }
  return (
    <div className="flex w-12 flex-col gap-1.5">
      <span className={`tnum text-[22px] font-semibold leading-none tracking-[-0.03em] ${TEXT[strength]}`} aria-label={t.card.matchAria(percent)}>
        {percent}
      </span>
      <Meter percent={percent} strength={strength} />
    </div>
  )
}

function Meter({ percent, strength, className = '' }: { percent: number; strength: Strength; className?: string }) {
  return (
    <span aria-hidden className={`block h-1.5 overflow-hidden rounded-full bg-line ${className}`}>
      <span className={`block h-full rounded-full ${BAR[strength]}`} style={{ width: `${Math.max(4, Math.min(100, percent))}%` }} />
    </span>
  )
}
