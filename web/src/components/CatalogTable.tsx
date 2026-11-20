import { useState } from 'react'
import { useAsync } from '../hooks/useAsync'
import { api } from '../lib/api'
import { useI18n } from '../lib/useI18n'
import { ErrorBox } from './ErrorBox'
import { Section } from './Section'
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
    <Section id="catalog-title" title={t.data.catalog}>
      {page.error && (
        <div className="mt-4">
          <ErrorBox message={page.error} />
        </div>
      )}
      {page.isLoading && !page.data && <Skeleton className="mt-4 h-64 w-full" />}
      {page.data && (
        <>
          {/* на телефоне список: таблица в семь колонок туда не помещается */}
          <ul className="sm:hidden">
            {page.data.items.map((expert) => (
              <li key={expert.id} className="border-b border-rule py-4">
                <p className="font-semibold">{expert.full_name}</p>
                <p className="mt-0.5 text-sm text-muted">{expert.position}</p>
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="tnum text-quiet">{expert.id}</span>
                  <span>{expert.industry}</span>
                  <span>{expert.city}</span>
                  <span className="tnum">{t.years(expert.experience_years)}</span>
                  <StatusDot availability={expert.availability} />
                </p>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[720px] text-left text-[15px]">
              <thead>
                <tr className="border-b border-ink text-sm text-muted">
                  {[c.id, c.name, c.position, c.industry, c.city, c.experience, c.status].map((label) => (
                    <th key={label} className="px-2 py-3 font-medium first:pl-0">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {page.data.items.map((expert) => (
                  <tr key={expert.id} className="border-b border-rule transition-colors hover:bg-ink/[0.04]">
                    <td className="tnum py-3.5 pr-2 text-quiet">{expert.id}</td>
                    <td className="px-2 py-3.5 font-semibold">{expert.full_name}</td>
                    <td className="px-2 py-3.5">{expert.position}</td>
                    <td className="px-2 py-3.5">{expert.industry}</td>
                    <td className="px-2 py-3.5">{expert.city}</td>
                    <td className="tnum px-2 py-3.5">{expert.experience_years}</td>
                    <td className="px-2 py-3.5">
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
    </Section>
  )
}
