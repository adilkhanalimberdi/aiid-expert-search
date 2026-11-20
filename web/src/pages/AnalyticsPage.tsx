import { ErrorBox } from '../components/ErrorBox'
import { Skeleton } from '../components/Skeleton'
import { useAsync } from '../hooks/useAsync'
import { api } from '../lib/api'
import { MODE_LABEL } from '../lib/format'

interface TermCount {
  term: string
  count: number
}

export function AnalyticsPage({ isActive }: { isActive: boolean }) {
  const stats = useAsync(isActive ? () => api.stats() : null, [isActive])

  return (
    <div className="mx-auto max-w-[1160px] space-y-6 px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-bold">Аналитика</h1>

      {stats.isLoading && !stats.data && (
        <div className="grid gap-4 sm:grid-cols-3" role="status" aria-label="Загрузка">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      )}
      {stats.error && <ErrorBox message={stats.error} />}
      {stats.data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="Запросов" value={String(stats.data.total_queries)} />
            <Metric label="Среднее время ответа" value={`${Math.round(stats.data.avg_took_ms)} мс`} />
            <Metric
              label="Доля «подошёл»"
              value={stats.data.fit_rate === null ? 'нет отзывов' : `${Math.round(stats.data.fit_rate * 100)}%`}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Bars title="Что ищут чаще всего" items={stats.data.top_competencies} empty="Пока нет запросов." />
            <Bars
              title="Спрос без предложения"
              hint="Термины из запросов, на которые нет подходящих экспертов."
              items={stats.data.unmet_demand}
              empty="Таких запросов пока не было."
            />
          </div>

          <section className="rounded-2xl border border-line bg-white p-5" aria-labelledby="eval-title">
            <h2 id="eval-title" className="font-semibold">
              Точность поиска на эталонных запросах
            </h2>
            {stats.data.evaluations.length === 0 ? (
              <p className="mt-2 text-muted">Результатов нет: запустите backend/scripts/eval.py --all.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-muted">
                      <th className="py-2 pr-3 font-medium">Набор</th>
                      <th className="px-2 py-2 font-medium">Режим</th>
                      <th className="px-2 py-2 font-medium">Топ-{stats.data.evaluations[0].k}</th>
                      <th className="px-2 py-2 font-medium">Среднее, мс</th>
                      <th className="px-2 py-2 font-medium">p95, мс</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.data.evaluations.map((run) => (
                      <tr key={`${run.dataset}-${run.mode}-${run.k}`} className="border-b border-line last:border-0">
                        <td className="py-2 pr-3">{run.dataset}</td>
                        <td className="px-2 py-2">{MODE_LABEL[run.mode] ?? run.mode}</td>
                        <td className="px-2 py-2 font-semibold text-teal">
                          {run.hits}/{run.total}
                        </td>
                        <td className="px-2 py-2">{run.avg_ms}</td>
                        <td className="px-2 py-2">{run.p95_ms}</td>
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
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  )
}

function Bars({ title, hint, items, empty }: { title: string; hint?: string; items: TermCount[]; empty: string }) {
  const max = Math.max(1, ...items.map((item) => item.count))
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      {items.length === 0 && <p className="mt-3 text-muted">{empty}</p>}
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={item.term}>
            <div className="flex justify-between text-sm">
              <span>{item.term}</span>
              <span className="text-muted">{item.count}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-teal-tint">
              <div className="h-2 rounded-full bg-teal" style={{ width: `${(item.count / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
