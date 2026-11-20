import { useI18n } from '../lib/useI18n'
import { BOOST_AVAILABILITY_BUSY, BOOST_CITY, WEIGHT_COVERAGE, WEIGHT_SEMANTIC } from '../lib/weights'

/** Знак действия переносится вместе со своим числом, а не висит в конце строки. */
function Term({ value, label, sign }: { value: string; label: string; sign?: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
      {sign && (
        <span aria-hidden className="mr-1 text-ink-3">
          {sign}
        </span>
      )}
      <b className="tnum font-bold text-ink">{value}</b>
      {label}
    </span>
  )
}

/** Формула совпадения одной строкой, пояснение раскрывается; числа из lib/weights.ts (дублируют config.py). */
export function Formula() {
  const { t, lang } = useI18n()
  const num = (value: number) => value.toLocaleString(lang === 'en' ? 'en' : 'ru')
  return (
    <details className="group rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink-2 sm:px-5">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1.5 [&::-webkit-details-marker]:hidden">
        <span className="font-bold text-ink">{t.formula.title}</span>
        <Term value={`${WEIGHT_SEMANTIC}%`} label={t.formula.meaning} />
        <Term sign="+" value={`${WEIGHT_COVERAGE}%`} label={t.formula.coverage} />
        <Term sign="×" value={num(BOOST_CITY)} label={t.formula.sameCity} />
        <Term sign="×" value={num(BOOST_AVAILABILITY_BUSY)} label={t.formula.busy} />
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden className="ml-auto transition-transform group-open:rotate-180">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <p className="mt-3 max-w-[72ch] leading-relaxed">{t.formula.body}</p>
    </details>
  )
}
