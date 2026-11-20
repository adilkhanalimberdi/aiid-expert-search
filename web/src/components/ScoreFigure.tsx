import { strengthOf, type Strength } from '../lib/format'
import { useI18n } from '../lib/useI18n'
import { MosaicScore } from './Mosaic'

type Size = 'hero' | 'big' | 'row'

const NUMERAL: Record<Size, string> = {
  hero: 'text-[72px] sm:text-[128px]',
  big: 'text-[48px] sm:text-[56px]',
  row: 'text-[28px]',
}

const ON_DARK: Record<Strength, string> = { strong: 'text-turquoise-glow', medium: 'text-ochre-soft', weak: 'text-mist' }
const ON_LIGHT: Record<Strength, string> = { strong: 'text-turquoise-deep', medium: 'text-ochre-deep', weak: 'text-stone' }

interface ScoreFigureProps {
  percent: number
  size?: Size
  onDark?: boolean
}

/** Оценка совпадения: цифра и панно из ста плиток рядом (у лучшего с отметками порогов 40 и 70). */
export function ScoreFigure({ percent, size = 'big', onDark = false }: ScoreFigureProps) {
  const { t } = useI18n()
  const color = (onDark ? ON_DARK : ON_LIGHT)[strengthOf(percent)]
  const isHero = size === 'hero'
  return (
    <div role="img" aria-label={t.card.matchAria(percent)} className={`flex flex-wrap items-end ${isHero ? 'gap-x-6 gap-y-4 sm:gap-x-8' : 'gap-3'} ${color}`}>
      {size !== 'row' && <MosaicScore percent={percent} size={isHero ? 'hero' : 'card'} onDark={onDark} animate={isHero} />}
      <div aria-hidden className="flex items-start">
        <span className={`tnum font-display font-light leading-[0.8] tracking-[-0.04em] ${NUMERAL[size]}`}>{percent}</span>
        {size !== 'row' && <span className={`font-display font-light ${isHero ? 'mt-1 text-3xl' : 'text-lg'}`}>%</span>}
      </div>
    </div>
  )
}

/** Маленькое панно 10×10 для строки списка: тот же язык, что у лучшего кандидата. */
export function ScoreBar({ percent }: { percent: number }) {
  return <MosaicScore percent={percent} size="mini" />
}
