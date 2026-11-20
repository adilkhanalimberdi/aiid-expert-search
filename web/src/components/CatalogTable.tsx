import { useState } from 'react'
import { useAsync } from '../hooks/useAsync'
import { api } from '../lib/api'
import { useI18n } from '../lib/useI18n'
import { ErrorBox } from './ErrorBox'
import { Status } from './Status'
import { Button, Eyebrow, Panel, Skeleton } from './ui'

const PAGE_SIZE = 10

/** Постраничный просмотр базы; reloadKey сбрасывает страницу после новой загрузки CSV. */
export function CatalogTable({ reloadKey }: { reloadKey: number }) {
  const { t } = useI18n()
  const [offsetState, setOffsetState] = useState({ key: reloadKey, offset: 0 })
  const offset = offsetState.key === reloadKey ? offsetState.offset : 0
  const page = useAsync(() => api.experts(offset, PAGE_SIZE), [offset, reloadKey])
  const total = page.data?.total ?? 0
  const c = t.data.columns

  return (
    <Panel aria-labelledby="catalog-title" className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-5 sm:px-6">
        <Eyebrow id="catalog-title">{t.data.catalog}</Eyebrow>
        {page.data && <span className="tnum text-sm text-ink-3">{t.data.range(offset + 1, Math.min(offset + PAGE_SIZE, total), total)}</span>}
      </div>
      {page.error && (
        <div className="px-5 pb-5">
          <ErrorBox message={page.error} />
        </div>
      )}
      {page.isLoading && !page.data && <Skeleton className="mx-5 mb-5 h-64" />}
      {page.data && (
        <>
          {/* на телефоне список: таблица в семь колонок туда не помещается */}
          <ul className="sm:hidden">
            {page.data.items.map((expert) => (
              <li key={expert.id} className="border-t border-line px-5 py-3.5">
                <p className="font-bold">{expert.full_name}</p>
                <p className="mt-0.5 text-sm text-ink-2">{expert.position}</p>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-2">
                  <span className="tnum text-ink-3">{expert.id}</span>
                  <span>{expert.industry}</span>
                  <span>{expert.city}</span>
                  <span className="tnum">{t.years(expert.experience_years)}</span>
                  <Status availability={expert.availability} />
                </p>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-y border-line bg-sunken text-xs uppercase tracking-[0.06em] text-ink-3">
                  {[c.id, c.name, c.position, c.industry, c.city, c.experience, c.status].map((label) => (
                    <th key={label} scope="col" className="px-3 py-2.5 font-bold first:pl-6 last:pr-6">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {page.data.items.map((expert) => (
                  <tr key={expert.id} className="border-b border-line last:border-0 hover:bg-sunken">
                    <td className="tnum py-3 pl-6 pr-3 text-ink-3">{expert.id}</td>
                    <td className="px-3 py-3 font-bold">{expert.full_name}</td>
                    <td className="px-3 py-3 text-ink-2">{expert.position}</td>
                    <td className="px-3 py-3 text-ink-2">{expert.industry}</td>
                    <td className="px-3 py-3 text-ink-2">{expert.city}</td>
                    <td className="tnum px-3 py-3">{expert.experience_years}</td>
                    <td className="py-3 pl-3 pr-6">
                      <Status availability={expert.availability} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2 border-t border-line px-5 py-3 sm:px-6">
            <Button size="sm" disabled={offset === 0} onClick={() => setOffsetState({ key: reloadKey, offset: Math.max(0, offset - PAGE_SIZE) })}>
              ← {t.data.previous}
            </Button>
            <Button size="sm" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffsetState({ key: reloadKey, offset: offset + PAGE_SIZE })}>
              {t.data.next} →
            </Button>
          </div>
        </>
      )}
    </Panel>
  )
}
