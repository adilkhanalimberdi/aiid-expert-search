import { useState } from 'react'
import { useAsync } from '../hooks/useAsync'
import { api } from '../lib/api'
import { ErrorBox } from './ErrorBox'
import { Skeleton } from './Skeleton'
import { StatusPill } from './StatusPill'

const PAGE_SIZE = 10

/** Постраничный просмотр загруженной базы; reloadKey сбрасывает страницу после новой загрузки CSV. */
export function CatalogTable({ reloadKey }: { reloadKey: number }) {
  const [offsetState, setOffsetState] = useState({ key: reloadKey, offset: 0 })
  const offset = offsetState.key === reloadKey ? offsetState.offset : 0
  const page = useAsync(() => api.experts(offset, PAGE_SIZE), [offset, reloadKey])
  const total = page.data?.total ?? 0

  return (
    <section className="rounded-2xl border border-line bg-white p-5" aria-labelledby="catalog-title">
      <h2 id="catalog-title" className="font-semibold">
        Experts in the database
      </h2>
      {page.error && <ErrorBox message={page.error} />}
      {page.isLoading && !page.data && <Skeleton className="mt-3 h-64 w-full" />}
      {page.data && (
        <>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="py-2 pr-3 font-medium">ID</th>
                  <th className="px-2 py-2 font-medium">Name</th>
                  <th className="px-2 py-2 font-medium">Position</th>
                  <th className="px-2 py-2 font-medium">Industry</th>
                  <th className="px-2 py-2 font-medium">City</th>
                  <th className="px-2 py-2 font-medium">Experience</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {page.data.items.map((expert) => (
                  <tr key={expert.id} className="border-b border-line last:border-0">
                    <td className="py-2 pr-3 text-muted">{expert.id}</td>
                    <td className="px-2 py-2 font-semibold">{expert.full_name}</td>
                    <td className="px-2 py-2">{expert.position}</td>
                    <td className="px-2 py-2">{expert.industry}</td>
                    <td className="px-2 py-2">{expert.city}</td>
                    <td className="px-2 py-2">{expert.experience_years}</td>
                    <td className="px-2 py-2">
                      <StatusPill availability={expert.availability} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted">
              {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={offset === 0}
                onClick={() => setOffsetState({ key: reloadKey, offset: Math.max(0, offset - PAGE_SIZE) })}
                className="rounded-lg border border-line px-3 py-1.5 font-medium disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffsetState({ key: reloadKey, offset: offset + PAGE_SIZE })}
                className="rounded-lg border border-line px-3 py-1.5 font-medium disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
