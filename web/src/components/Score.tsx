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
    // шкала с отметками порогов 40 и 70: видно, почему цифра такого цвета
    return (
      <div className="flex w-[148px] flex-col">
        <p className="flex items-baseline justify-end gap-1.5" aria-label={t.card.matchAria(percent)}>
          <span className={`serif tnum text-[52px] font-medium leading-none tracking-[-0.03em] ${TEXT[strength]}`}>{percent}</span>
          <span className={`text-lg font-medium ${TEXT[strength]}`}>%</span>
        </p>
        <div aria-hidden className="relative mt-3">
          <Meter percent={percent} strength={strength} className="w-full" />
          {[40, 70].map((mark) => (
            <span key={mark} className="absolute top-[-3px] h-3 w-px bg-ink-3/70" style={{ left: `${mark}%` }} />
          ))}
          <span className="mono mt-1.5 flex text-[10px] text-ink-3">
            <span className="absolute left-[40%] -translate-x-1/2">40</span>
            <span className="absolute left-[70%] -translate-x-1/2">70</span>
          </span>
        </div>
        <p className="mt-5 whitespace-nowrap text-right text-xs font-medium text-ink-2">{t.card.strength[strength]}</p>
      </div>
    )
  }
  return (
    <div className="flex w-12 flex-col gap-1.5">
      <span className={`mono text-[21px] font-medium leading-none tracking-[-0.02em] ${TEXT[strength]}`} aria-label={t.card.matchAria(percent)}>
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
