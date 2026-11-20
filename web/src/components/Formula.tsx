import { useI18n } from '../lib/useI18n'
import { BOOST_AVAILABILITY_BUSY, BOOST_CITY, BOOST_INDUSTRY, WEIGHT_COVERAGE, WEIGHT_SEMANTIC } from '../lib/weights'

function Figure({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-[56px] font-light leading-[0.9] tracking-[-0.04em] text-cobalt sm:text-[84px]">
        {value}
        {unit && <span className="text-[24px] sm:text-4xl">{unit}</span>}
      </div>
      <div className="mt-2.5 text-[15px] font-medium">{label}</div>
    </div>
  )
}

function Boost({ value, label, tone }: { value: string; label: string; tone: 'lime' | 'ink' }) {
  return (
    <div className="text-center">
      <div
        className={`px-[0.2em] font-display text-[32px] font-light leading-[1.1] tracking-[-0.03em] sm:text-[44px] ${
          tone === 'lime' ? 'bg-lime text-ink' : 'bg-ink text-white'
        }`}
      >
        {value}
      </div>
      <div className="mt-2.5 text-[15px] font-medium">{label}</div>
    </div>
  )
}

const Operator = ({ children }: { children: string }) => (
  <div aria-hidden className="pb-6 font-display text-4xl font-light leading-[0.9] text-ash-deep sm:text-[56px]">
    {children}
  </div>
)

/** Формула совпадения крупной типографикой; числа те же, что в backend/app/config.py (lib/weights.ts). */
export function Formula() {
  const { t } = useI18n()
  return (
    <section className="py-24">
      <h2 className="text-center font-display text-4xl font-light leading-[1.1] tracking-[-0.035em] sm:text-[40px]">
        {t.formula.title}
      </h2>
      <p className="mx-auto mt-3 max-w-[620px] text-center text-base leading-relaxed text-muted">{t.formula.body}</p>
      <div className="mt-10 flex flex-wrap items-end justify-center gap-x-5 gap-y-6">
        <Figure value={String(WEIGHT_SEMANTIC)} unit="%" label={t.formula.meaning} />
        <Operator>+</Operator>
        <Figure value={String(WEIGHT_COVERAGE)} unit="%" label={t.formula.coverage} />
        <Operator>×</Operator>
        <Boost value={String(BOOST_CITY)} label={t.formula.sameCity} tone="lime" />
        <Boost value={String(BOOST_INDUSTRY)} label={t.formula.sameIndustry} tone="lime" />
        <Boost value={String(BOOST_AVAILABILITY_BUSY)} label={t.formula.busy} tone="ink" />
      </div>
    </section>
  )
}
