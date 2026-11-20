import { strengthOf, type Strength } from '../lib/format'
import { useI18n } from '../lib/useI18n'

type Size = 'hero' | 'big' | 'row'

const NUMERAL: Record<Size, string> = {
  hero: 'text-[112px] sm:text-[176px]',
  big: 'text-[72px] sm:text-[92px]',
  row: 'text-[40px]',
}

const ON_DARK: Record<Strength, string> = { strong: 'text-lime', medium: 'text-amber', weak: 'text-ash' }
const ON_LIGHT: Record<Strength, string> = { strong: 'text-cobalt', medium: 'text-amber-deep', weak: 'text-ash-deep' }
const BAR_DARK: Record<Strength, string> = { strong: 'bg-lime', medium: 'bg-amber', weak: 'bg-ash' }
const BAR_LIGHT: Record<Strength, string> = { strong: 'bg-cobalt', medium: 'bg-amber-deep', weak: 'bg-ash-deep' }

interface ScoreFigureProps {
  percent: number
  size?: Size
  onDark?: boolean
}

/** Оценка совпадения: крупная лёгкая цифра; шкала 0–100 с порогами 40 и 70 показана у лучшего кандидата. */
export function ScoreFigure({ percent, size = 'big', onDark = false }: ScoreFigureProps) {
  const { t } = useI18n()
  const strength = strengthOf(percent)
  const color = (onDark ? ON_DARK : ON_LIGHT)[strength]
  const isHero = size === 'hero'
  return (
    <div role="img" aria-label={t.card.matchAria(percent)} className={color}>
      <div className="flex items-end gap-1.5">
        <span
          aria-hidden
          className={`tnum font-display font-light leading-[0.82] tracking-[-0.05em] ${NUMERAL[size]}`}
        >
          {percent}
        </span>
        {isHero && (
          <span aria-hidden className="pb-2 font-display text-[44px] font-light leading-none">
            %
          </span>
        )}
      </div>
      {isHero && <Scale percent={percent} strength={strength} onDark={onDark} />}
    </div>
  )
}

function Scale({ percent, strength, onDark }: { percent: number; strength: Strength; onDark: boolean }) {
  const track = onDark ? 'bg-white/30' : 'bg-rule'
  const tick = onDark ? 'bg-white/60' : 'bg-ink/50'
  const label = onDark ? 'text-white/70' : 'text-quiet'
  return (
    <div aria-hidden className="mt-5 text-xs">
      <div className={`relative h-0.5 ${track}`}>
        <div
          className={`absolute left-0 top-[-2px] h-1.5 ${(onDark ? BAR_DARK : BAR_LIGHT)[strength]}`}
          style={{ width: `${percent}%` }}
        />
        <div className={`absolute top-[-6px] h-3.5 w-px ${tick}`} style={{ left: '40%' }} />
        <div className={`absolute top-[-6px] h-3.5 w-px ${tick}`} style={{ left: '70%' }} />
      </div>
      <div className={`relative mt-3 h-4 ${label}`}>
        <span className="absolute left-0">0</span>
        <span className="absolute -translate-x-1/2" style={{ left: '40%' }}>
          40
        </span>
        <span className="absolute -translate-x-1/2" style={{ left: '70%' }}>
          70
        </span>
        <span className="absolute right-0">100</span>
      </div>
    </div>
  )
}

/** Полоска оценки для строки списка. */
export function ScoreBar({ percent }: { percent: number }) {
  const strength = strengthOf(percent)
  return (
    <div aria-hidden className="relative h-0.5 flex-1 bg-rule">
      <div className={`absolute left-0 top-[-2px] h-1.5 ${BAR_LIGHT[strength]}`} style={{ width: `${percent}%` }} />
    </div>
  )
}
