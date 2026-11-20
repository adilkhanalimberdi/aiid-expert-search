import type { ReactNode } from 'react'
import { ErrorBox } from '../components/ErrorBox'
import { HeroBand, PageTitle } from '../components/HeroBand'
import { Section } from '../components/Section'
import { Skeleton } from '../components/Skeleton'
import { useAsync } from '../hooks/useAsync'
import { api, type EvalRun } from '../lib/api'
import { useI18n } from '../lib/useI18n'

interface TermCount {
  term: string
  count: number
}

export function AnalyticsPage({ isActive, nav }: { isActive: boolean; nav: ReactNode }) {
  const { t } = useI18n()
  const stats = useAsync(isActive ? () => api.stats() : null, [isActive])

  return (
    <>
      <HeroBand nav={nav}>
        <PageTitle>{t.analytics.title}</PageTitle>
      </HeroBand>
      <div className="mx-auto max-w-[1120px] space-y-[72px] px-4 py-14 sm:px-6">
        {stats.isLoading && !stats.data && (
          <div className="grid gap-px sm:grid-cols-3" role="status" aria-label={t.dialog.loading}>
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </div>
        )}
        {stats.error && <ErrorBox message={stats.error} />}
        {stats.data && (
          <>
            <div className="on-dark grid gap-0.5 bg-smalt-deep text-white sm:grid-cols-3">
              <Metric label={t.analytics.queries} value={String(stats.data.total_queries)} />
              <Metric label={t.analytics.avgTime} value={t.took(Math.round(stats.data.avg_took_ms))} />
              <Metric
                label={t.analytics.fitRate}
                value={stats.data.fit_rate === null ? '—' : `${Math.round(stats.data.fit_rate * 100)}%`}
                note={stats.data.fit_rate === null ? t.analytics.noFeedback : undefined}
              />
            </div>

            <div className="grid gap-[72px] md:grid-cols-2 md:gap-12">
              <Bars id="top-title" title={t.analytics.mostRequested} items={stats.data.top_competencies} empty={t.analytics.noQueries} />
              <Bars
                id="unmet-title"
                title={t.analytics.unmet}
                hint={t.analytics.unmetHint}
                items={stats.data.unmet_demand}
                empty={t.analytics.noUnmet}
              />
            </div>

            <Section id="eval-title" title={t.analytics.accuracy} hint={t.analytics.evalHint}>
              {stats.data.evaluations.length === 0 ? (
                <p className="pt-5 text-slate">{t.analytics.noEval}</p>
              ) : (
                <EvalTable runs={stats.data.evaluations} />
              )}
            </Section>
          </>
        )}
      </div>
    </>
  )
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-smalt p-6 sm:p-8">
      <p className="tnum font-display text-[52px] font-light leading-[0.9] tracking-[-0.04em] text-turquoise-glow sm:text-[68px]">
        {value}
      </p>
      <p className="mt-4 text-[15px] text-white/80">{label}</p>
      {note && <p className="mt-1 text-sm text-white/70">{note}</p>}
    </div>
  )
}

function Bars({ id, title, hint, items, empty }: { id: string; title: string; hint?: string; items: TermCount[]; empty: string }) {
  const max = Math.max(1, ...items.map((item) => item.count))
  return (
    <Section id={id} title={title} hint={hint}>
      {items.length === 0 && <p className="pt-5 text-slate">{empty}</p>}
      <ul>
        {items.map((item) => (
          <li key={item.term} className="border-b border-seam py-3.5">
            <div className="flex items-baseline justify-between gap-4 text-[17px]">
              <span>{item.term}</span>
              <span className="tnum font-display text-xl font-light text-turquoise-deep">{item.count}</span>
            </div>
            <Tiles share={item.count / max} />
          </li>
        ))}
      </ul>
    </Section>
  )
}

/** Доля в 24 плитках: тот же язык, что оценка эксперта. */
function Tiles({ share }: { share: number }) {
  const on = Math.max(1, Math.round(share * 24))
  return (
    <span aria-hidden className="mt-2 flex gap-0.5">
      {Array.from({ length: 24 }, (_, i) => (
        <span key={i} className={`h-2 flex-1 ${i < on ? 'bg-turquoise' : 'bg-seam/70'}`} />
      ))}
    </span>
  )
}

const MODES = ['hybrid', 'bm25', 'vector'] as const

/** Наборы строками, режимы столбцами: гибрид рядом с одиночными методами, видно, что он даёт. */
function EvalTable({ runs }: { runs: EvalRun[] }) {
  const { t } = useI18n()
  const datasets = [...new Set(runs.map((run) => run.dataset))]
  const find = (dataset: string, mode: string) => runs.find((run) => run.dataset === dataset && run.mode === mode)
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-[15px]">
        <thead>
          <tr className="border-b border-grout text-sm text-slate">
            <th className="py-3 pr-3 font-medium">{t.analytics.dataset}</th>
            {MODES.map((mode) => (
              <th key={mode} className={`px-3 py-3 font-medium ${mode === 'hybrid' ? 'bg-turquoise text-white' : ''}`}>
                {t.analytics.modes[mode]}
              </th>
            ))}
            <th className="px-3 py-3 text-right font-medium">{t.analytics.p95}</th>
          </tr>
        </thead>
        <tbody>
          {datasets.map((dataset) => {
            const hybrid = find(dataset, 'hybrid')
            return (
              <tr key={dataset} className="border-b border-seam">
                <td className="py-4 pr-3">{t.analytics.datasets[dataset] ?? dataset}</td>
                {MODES.map((mode) => {
                  const run = find(dataset, mode)
                  const isHybrid = mode === 'hybrid'
                  return (
                    <td key={mode} className={`tnum px-3 py-4 ${isHybrid ? 'bg-turquoise/12 font-display text-xl font-light text-turquoise-deep' : 'text-slate'}`}>
                      {run ? `${run.hits}/${run.total}` : '—'}
                    </td>
                  )
                })}
                <td className="tnum px-3 py-4 text-right text-slate">{hybrid ? Math.round(hybrid.p95_ms) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
