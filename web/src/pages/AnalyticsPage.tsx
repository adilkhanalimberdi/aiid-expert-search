import { ErrorBox } from '../components/ErrorBox'
import { CONTAINER, PageHeader } from '../components/Shell'
import { PanelTitle, Panel, Skeleton } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { api, type EvalRun } from '../lib/api'
import { useI18n } from '../lib/useI18n'

interface TermCount {
  term: string
  count: number
}

export function AnalyticsPage({ isActive }: { isActive: boolean }) {
  const { t } = useI18n()
  const stats = useAsync(isActive ? () => api.stats() : null, [isActive])

  return (
    <div className={CONTAINER}>
      <PageHeader title={t.analytics.title} subtitle={t.analytics.subtitle} />
      <div className="space-y-6 pb-6">
        {stats.isLoading && !stats.data && (
          <div className="grid gap-4 sm:grid-cols-3" role="status" aria-label={t.dialog.loading}>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        )}
        {stats.error && <ErrorBox message={stats.error} />}
        {stats.data && (
          <>
            <dl className="grid divide-y divide-line rounded-xl border border-line bg-surface shadow-[var(--shadow-panel)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <Metric label={t.analytics.queries} value={String(stats.data.total_queries)} />
              <Metric label={t.analytics.avgTime} value={t.took(Math.round(stats.data.avg_took_ms))} />
              <Metric
                label={t.analytics.fitRate}
                value={stats.data.fit_rate === null ? '—' : `${Math.round(stats.data.fit_rate * 100)}%`}
                note={stats.data.fit_rate === null ? t.analytics.noFeedback : undefined}
              />
            </dl>

            <div className="grid gap-5 lg:grid-cols-2">
              <Bars id="top-title" title={t.analytics.mostRequested} items={stats.data.top_competencies} empty={t.analytics.noQueries} tone="brand" />
              <Bars
                id="unmet-title"
                title={t.analytics.unmet}
                hint={t.analytics.unmetHint}
                items={stats.data.unmet_demand}
                empty={t.analytics.noUnmet}
                tone="medium"
              />
            </div>

            <Panel className="p-5 sm:p-6" aria-labelledby="eval-title">
              <PanelTitle id="eval-title">{t.analytics.accuracy}</PanelTitle>
              <p className="mt-1.5 text-sm text-ink-2">{t.analytics.evalHint}</p>
              {stats.data.evaluations.length === 0 ? <p className="mt-4 text-ink-2">{t.analytics.noEval}</p> : <EvalTable runs={stats.data.evaluations} />}
            </Panel>
          </>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col-reverse justify-end gap-1.5 p-5 sm:p-6">
      <dt className="text-sm text-ink-2">
        {label}
        {note && <span className="block text-ink-3">{note}</span>}
      </dt>
      <dd className="tnum text-[34px] font-semibold leading-none tracking-[-0.03em] text-ink">{value}</dd>
    </div>
  )
}

function Bars({ id, title, hint, items, empty, tone }: { id: string; title: string; hint?: string; items: TermCount[]; empty: string; tone: 'brand' | 'medium' }) {
  const max = Math.max(1, ...items.map((item) => item.count))
  return (
    <Panel className="p-5 sm:p-6" aria-labelledby={id}>
      <PanelTitle id={id}>{title}</PanelTitle>
      {hint && <p className="mt-1.5 text-sm text-ink-2">{hint}</p>}
      {items.length === 0 && <p className="mt-4 text-ink-2">{empty}</p>}
      <ol className="mt-3">
        {items.map((item, index) => (
          <li key={item.term} className="border-t border-line py-3 first:border-t-0">
            <div className="flex items-baseline justify-between gap-4">
              <span className="flex min-w-0 items-baseline gap-3 text-[15px] font-semibold">
                <span className="tnum w-4 text-xs font-bold text-ink-3">{index + 1}</span>
                <span className="[overflow-wrap:anywhere]">{item.term}</span>
              </span>
              <span className={`tnum text-lg font-bold ${tone === 'brand' ? 'text-brand-deep' : 'text-medium'}`}>{item.count}</span>
            </div>
            <span aria-hidden className="mt-2 ml-7 block h-1.5 overflow-hidden rounded-full bg-line">
              <span
                className={`block h-full rounded-full ${tone === 'brand' ? 'bg-brand' : 'bg-medium-bar'}`}
                style={{ width: `${Math.max(4, (item.count / max) * 100)}%` }}
              />
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  )
}

const MODES = ['hybrid', 'bm25', 'vector'] as const

/** Наборы строками, режимы столбцами: гибрид рядом с одиночными методами, видно, что он даёт. */
function EvalTable({ runs }: { runs: EvalRun[] }) {
  const { t } = useI18n()
  const datasets = [...new Set(runs.map((run) => run.dataset))]
  const find = (dataset: string, mode: string) => runs.find((run) => run.dataset === dataset && run.mode === mode)
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left text-[15px] sm:min-w-[560px]">
        <thead>
          <tr className="border-b border-line-strong text-[13px] text-ink-3">
            <th scope="col" className="py-2.5 pr-3 font-medium">
              {t.analytics.dataset}
            </th>
            {MODES.map((mode) => (
              <th key={mode} scope="col" className={`${mode === 'hybrid' ? '' : 'hidden sm:table-cell'} px-3 py-2.5 font-medium ${mode === 'hybrid' ? 'text-brand-deep' : ''}`}>
                {t.analytics.modes[mode]}
              </th>
            ))}
            <th scope="col" className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">
              {t.analytics.p95}
            </th>
          </tr>
        </thead>
        <tbody>
          {datasets.map((dataset) => {
            const hybrid = find(dataset, 'hybrid')
            return (
              <tr key={dataset} className="border-b border-line last:border-0">
                <th scope="row" className="py-3.5 pr-3 font-semibold">
                  {t.analytics.datasets[dataset] ?? dataset}
                </th>
                {MODES.map((mode) => {
                  const run = find(dataset, mode)
                  const share = run ? run.hits / run.total : 0
                  return (
                    <td key={mode} className={`${mode === 'hybrid' ? '' : 'hidden sm:table-cell'} px-3 py-3.5`}>
                      {run ? (
                        <span className="flex items-center gap-2.5">
                          <span className={`tnum ${mode === 'hybrid' ? 'text-lg font-bold text-brand-deep' : 'text-ink-2'}`}>
                            {run.hits}/{run.total}
                          </span>
                          <span aria-hidden className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-line sm:block">
                            <span className={`block h-full rounded-full ${mode === 'hybrid' ? 'bg-brand' : 'bg-weak-bar'}`} style={{ width: `${share * 100}%` }} />
                          </span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  )
                })}
                <td className="tnum hidden px-3 py-3.5 text-right text-ink-2 sm:table-cell">{hybrid ? Math.round(hybrid.p95_ms) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
