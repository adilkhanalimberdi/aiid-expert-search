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
            <div className="grid border-2 border-ink bg-ink text-white sm:grid-cols-3">
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
                <p className="pt-5 text-muted">{t.analytics.noEval}</p>
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
    <div className="border-white/20 p-6 sm:p-8 sm:[&:not(:first-child)]:border-l">
      <p className="tnum font-display text-[64px] font-light leading-[0.9] tracking-[-0.045em] text-lime sm:text-[84px]">
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
      {items.length === 0 && <p className="pt-5 text-muted">{empty}</p>}
      <ul>
        {items.map((item) => (
          <li key={item.term} className="border-b border-rule py-3.5">
            <div className="flex items-baseline justify-between gap-4 text-[17px]">
              <span>{item.term}</span>
              <span className="tnum font-display text-2xl font-light text-cobalt-deep">{item.count}</span>
            </div>
            <div className="mt-2 h-1.5 bg-ink/[0.06]">
              <div className="h-full bg-cobalt" style={{ width: `${(item.count / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Section>
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
          <tr className="border-b border-ink text-sm text-muted">
            <th className="py-3 pr-3 font-medium">{t.analytics.dataset}</th>
            {MODES.map((mode) => (
              <th key={mode} className={`px-3 py-3 font-medium ${mode === 'hybrid' ? 'bg-lime text-ink' : ''}`}>
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
              <tr key={dataset} className="border-b border-rule">
                <td className="py-4 pr-3">{t.analytics.datasets[dataset] ?? dataset}</td>
                {MODES.map((mode) => {
                  const run = find(dataset, mode)
                  const isHybrid = mode === 'hybrid'
                  return (
                    <td key={mode} className={`tnum px-3 py-4 ${isHybrid ? 'bg-lime/40 font-display text-2xl font-light text-ink' : 'text-muted'}`}>
                      {run ? `${run.hits}/${run.total}` : '—'}
                    </td>
                  )
                })}
                <td className="tnum px-3 py-4 text-right text-muted">{hybrid ? Math.round(hybrid.p95_ms) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
