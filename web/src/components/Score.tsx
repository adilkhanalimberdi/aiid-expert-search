import { strengthOf, type Strength } from '../lib/format'
import { useI18n } from '../lib/useI18n'

const TEXT: Record<Strength, string> = { strong: 'text-brand-deep', medium: 'text-medium', weak: 'text-weak' }
const BAR: Record<Strength, string> = { strong: 'bg-brand', medium: 'bg-medium-bar', weak: 'bg-weak' }
const SEGMENTS = 20

/**
 * Процент совпадения. В списке моноширинная цифра и тонкая полоса. В профиле индикатор уровня сигнала:
 * 20 сегментов по 5%, отметки порогов 40 и 70, крупная цифра и слово силы. Цвет только от порогов,
 * поэтому 26% серое и не выглядит как успех; слово дублирует цвет.
 */
export function Score({ percent, size = 'row' }: { percent: number; size?: 'row' | 'hero' }) {
  const { t } = useI18n()
  const strength = strengthOf(percent)
  if (size === 'hero') {
    const lit = Math.round((Math.max(0, Math.min(100, percent)) / 100) * SEGMENTS)
    return (
      <div className="flex w-[176px] flex-col">
        <p className="flex items-baseline justify-between gap-2" aria-label={t.card.matchAria(percent)}>
          <span className="text-xs font-medium text-ink-2">{t.card.strength[strength]}</span>
          <span className={`display tnum text-[46px] font-semibold leading-none tracking-[-0.02em] ${TEXT[strength]}`}>
            {percent}
            <span className="ml-0.5 text-lg font-medium">%</span>
          </span>
        </p>
        <div aria-hidden className="relative mt-3">
          <span className="flex gap-[2px]">
            {Array.from({ length: SEGMENTS }, (_, index) => (
              <span key={index} className={`h-3 flex-1 rounded-[1px] ${index < lit ? BAR[strength] : 'bg-line'}`} />
            ))}
          </span>
          {[40, 70].map((mark) => (
            <span key={mark} className="absolute top-[-4px] h-5 w-px bg-ink-3" style={{ left: `calc(${mark}% - 1px)` }}>
              <span className="mono absolute left-1/2 top-[22px] -translate-x-1/2 text-[10px] text-ink-3">{mark}</span>
            </span>
          ))}
        </div>
        <span aria-hidden className="h-4" />
      </div>
    )
  }
  return (
    <div className="flex w-12 flex-col gap-1.5">
      <span className={`mono tnum text-[20px] font-medium leading-none ${TEXT[strength]}`} aria-label={t.card.matchAria(percent)}>
        {percent}
      </span>
      <span aria-hidden className="block h-[3px] overflow-hidden rounded-full bg-line">
        <span className={`block h-full rounded-full ${BAR[strength]}`} style={{ width: `${Math.max(4, Math.min(100, percent))}%` }} />
      </span>
    </div>
  )
}
