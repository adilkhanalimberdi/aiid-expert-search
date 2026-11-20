import { useI18n } from '../lib/useI18n'
import { BOOST_AVAILABILITY_BUSY, BOOST_CITY, WEIGHT_COVERAGE, WEIGHT_SEMANTIC } from '../lib/weights'

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="tnum font-display text-[56px] font-light leading-[0.9] tracking-[-0.04em] text-turquoise-deep sm:text-[80px]">
        {value}
        <span className="text-[22px] sm:text-[32px]">%</span>
      </div>
      <div className="mt-3 text-[15px] font-medium">{label}</div>
    </div>
  )
}

function Boost({ value, label, tone }: { value: number; label: string; tone: 'ochre' | 'grout' }) {
  return (
    <div className="text-center">
      <div
        className={`tile tnum px-[0.3em] font-display text-[30px] font-light leading-[1.2] tracking-[-0.02em] sm:text-[40px] ${
          tone === 'ochre' ? 'bg-ochre text-grout' : 'bg-grout text-white'
        }`}
      >
        ×{value}
      </div>
      <div className="mt-3 text-[15px] font-medium">{label}</div>
    </div>
  )
}

const Operator = ({ children }: { children: string }) => (
  <div aria-hidden className="pb-8 font-display text-4xl font-light leading-[0.9] text-stone sm:text-5xl">
    {children}
  </div>
)

/** Формула совпадения крупной типографикой; числа те же, что в backend/app/config.py (lib/weights.ts). */
export function Formula() {
  const { t } = useI18n()
  return (
    <section className="border-t-2 border-grout py-20">
      <div className="flex flex-col gap-10">
        <div>
          <h2 className="font-display text-[28px] font-light leading-[1.15] tracking-[-0.025em] text-balance sm:text-[36px]">
            {t.formula.title}
          </h2>
          <p className="mt-4 max-w-[68ch] text-base leading-relaxed text-slate">{t.formula.body}</p>
        </div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-6">
          <Figure value={WEIGHT_SEMANTIC} label={t.formula.meaning} />
          <Operator>+</Operator>
          <Figure value={WEIGHT_COVERAGE} label={t.formula.coverage} />
          <Operator>×</Operator>
          <Boost value={BOOST_CITY} label={t.formula.sameCity} tone="ochre" />
          <Boost value={BOOST_AVAILABILITY_BUSY} label={t.formula.busy} tone="grout" />
        </div>
      </div>
    </section>
  )
}
