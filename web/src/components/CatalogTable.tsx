import { useState } from 'react'
import { useAsync } from '../hooks/useAsync'
import { api } from '../lib/api'
import { useI18n } from '../lib/useI18n'
import { ErrorBox } from './ErrorBox'
import { Skeleton } from './Skeleton'
import { StatusDot } from './StatusDot'
import { Button } from './ui'

const PAGE_SIZE = 10

/** Постраничный просмотр загруженной базы; reloadKey сбрасывает страницу после новой загрузки CSV. */
export function CatalogTable({ reloadKey }: { reloadKey: number }) {
  const { t } = useI18n()
  const [offsetState, setOffsetState] = useState({ key: reloadKey, offset: 0 })
  const offset = offsetState.key === reloadKey ? offsetState.offset : 0
  const page = useAsync(() => api.experts(offset, PAGE_SIZE), [offset, reloadKey])
  const total = page.data?.total ?? 0
  const c = t.data.columns

  return (
    <section className="border-2 border-ink bg-white p-5 sm:p-7" aria-labelledby="catalog-title">
      <h2 id="catalog-title" className="font-display text-3xl font-light tracking-[-0.03em]">
        {t.data.catalog}
      </h2>
      {page.error && (
        <div className="mt-4">
          <ErrorBox message={page.error} />
        </div>
      )}
      {page.isLoading && !page.data && <Skeleton className="mt-4 h-64 w-full" />}
      {page.data && (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b-2 border-ink text-muted">
                  {[c.id, c.name, c.position, c.industry, c.city, c.experience, c.status].map((label) => (
                    <th key={label} className="px-2 py-2.5 font-medium first:pl-0">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {page.data.items.map((expert) => (
                  <tr key={expert.id} className="border-b border-rule last:border-0">
                    <td className="tnum py-2.5 pr-2 text-quiet">{expert.id}</td>
                    <td className="px-2 py-2.5 font-semibold">{expert.full_name}</td>
                    <td className="px-2 py-2.5">{expert.position}</td>
                    <td className="px-2 py-2.5">{expert.industry}</td>
                    <td className="px-2 py-2.5">{expert.city}</td>
                    <td className="tnum px-2 py-2.5">{expert.experience_years}</td>
                    <td className="px-2 py-2.5">
                      <StatusDot availability={expert.availability} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="tnum text-muted">{t.data.range(offset + 1, Math.min(offset + PAGE_SIZE, total), total)}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0}
                onClick={() => setOffsetState({ key: reloadKey, offset: Math.max(0, offset - PAGE_SIZE) })}
              >
                {t.data.previous}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffsetState({ key: reloadKey, offset: offset + PAGE_SIZE })}
              >
                {t.data.next}
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
