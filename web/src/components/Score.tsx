import { strengthOf, type Strength } from '../lib/format'
import { useI18n } from '../lib/useI18n'

// Сильное совпадение: белая цифра и полоса сигнала; средний янтарь, слабое серое. Цвет только от порогов 70 и 40.
const TEXT: Record<Strength, string> = { strong: 'text-ink', medium: 'text-medium', weak: 'text-weak' }
const BAR: Record<Strength, string> = { strong: 'bg-brand', medium: 'bg-medium-bar', weak: 'bg-weak' }

/**
 * Процент совпадения. В списке цифра и тонкая полоса. В профиле крупная цифра, слово силы
 * и шкала с отметками порогов 40 и 70: видно, почему цифра такого цвета.
 */
export function Score({ percent, size = 'row' }: { percent: number; size?: 'row' | 'hero' }) {
  const { t } = useI18n()
  const strength = strengthOf(percent)
  const width = `${Math.max(3, Math.min(100, percent))}%`
  if (size === 'hero') {
    return (
      <div className="flex w-[168px] flex-col">
        <p className="flex items-baseline justify-end gap-1" aria-label={t.card.matchAria(percent)}>
          <span className={`display text-[44px] font-semibold leading-none ${TEXT[strength]}`}>{percent}</span>
          <span className="text-lg text-ink-3">%</span>
        </p>
        <div aria-hidden className="relative mt-3 h-1 rounded-full bg-line">
          <span className={`block h-full rounded-full ${BAR[strength]}`} style={{ width }} />
          {[40, 70].map((mark) => (
            <span key={mark} className="absolute -top-1 h-3 w-px bg-ink-3/60" style={{ left: `${mark}%` }} />
          ))}
        </div>
        <p className="mt-2 text-right text-xs text-ink-3">{t.card.strength[strength]}</p>
      </div>
    )
  }
  return (
    <div className="flex w-11 flex-col gap-1.5">
      <span className={`display text-[19px] font-semibold leading-none ${TEXT[strength]}`} aria-label={t.card.matchAria(percent)}>
        {percent}
      </span>
      <span aria-hidden className="block h-[3px] overflow-hidden rounded-full bg-line">
        <span className={`block h-full rounded-full ${BAR[strength]}`} style={{ width }} />
      </span>
    </div>
  )
}
