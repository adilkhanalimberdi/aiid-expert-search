import type { ReactNode } from 'react'
import { ErrorBox } from '../components/ErrorBox'
import { HeroBand, PageTitle } from '../components/HeroBand'
import { Skeleton } from '../components/Skeleton'
import { useAsync } from '../hooks/useAsync'
import { api } from '../lib/api'
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
      <div className="mx-auto max-w-[1120px] space-y-6 px-4 py-12 sm:px-6">
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

            <div className="grid gap-6 md:grid-cols-2">
              <Bars title={t.analytics.mostRequested} items={stats.data.top_competencies} empty={t.analytics.noQueries} />
              <Bars
                title={t.analytics.unmet}
                hint={t.analytics.unmetHint}
                items={stats.data.unmet_demand}
                empty={t.analytics.noUnmet}
              />
            </div>

            <section className="border-2 border-ink bg-white p-5 sm:p-7" aria-labelledby="eval-title">
              <h2 id="eval-title" className="font-display text-3xl font-light tracking-[-0.03em]">
                {t.analytics.accuracy}
              </h2>
              {stats.data.evaluations.length === 0 ? (
                <p className="mt-3 text-muted">{t.analytics.noEval}</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-[15px]">
                    <thead>
                      <tr className="border-b-2 border-ink text-muted">
                        <th className="py-2 pr-3 font-medium">{t.analytics.dataset}</th>
                        <th className="px-2 py-2 font-medium">{t.analytics.mode}</th>
                        <th className="px-2 py-2 font-medium">{t.analytics.top(stats.data.evaluations[0].k)}</th>
                        <th className="px-2 py-2 font-medium">{t.analytics.average}</th>
                        <th className="px-2 py-2 font-medium">{t.analytics.p95}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.data.evaluations.map((run) => (
                        <tr key={`${run.dataset}-${run.mode}-${run.k}`} className="border-b border-rule last:border-0">
                          <td className="py-2.5 pr-3">{run.dataset}</td>
                          <td className="px-2 py-2.5">{t.analytics.modes[run.mode] ?? run.mode}</td>
                          <td className="tnum px-2 py-2.5 font-semibold text-cobalt-deep">
                            {run.hits}/{run.total}
                          </td>
                          <td className="tnum px-2 py-2.5">{run.avg_ms}</td>
                          <td className="tnum px-2 py-2.5">{run.p95_ms}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
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

function Bars({ title, hint, items, empty }: { title: string; hint?: string; items: TermCount[]; empty: string }) {
  const max = Math.max(1, ...items.map((item) => item.count))
  return (
    <section className="border-2 border-ink bg-white p-5 sm:p-7">
      <h2 className="font-display text-3xl font-light tracking-[-0.03em]">{title}</h2>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      {items.length === 0 && <p className="mt-3 text-muted">{empty}</p>}
      <ul className="mt-5 space-y-4">
        {items.map((item) => (
          <li key={item.term}>
            <div className="flex justify-between text-[15px]">
              <span>{item.term}</span>
              <span className="tnum text-muted">{item.count}</span>
            </div>
            <div className="mt-1.5 h-0.5 bg-rule">
              <div className="-mt-0.5 h-1.5 bg-cobalt" style={{ width: `${(item.count / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
