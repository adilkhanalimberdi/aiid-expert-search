import { useState } from 'react'
import { useAsync } from '../hooks/useAsync'
import { api } from '../lib/api'
import { useI18n } from '../lib/useI18n'
import { ErrorBox } from './ErrorBox'
import { Icon } from './Icon'
import { Status } from './Status'
import { Avatar } from './Avatar'
import { Button, PanelTitle, Panel, Segmented, Skeleton } from './ui'

const PAGE_SIZE = 12

type View = 'cards' | 'table'

/**
 * Постраничный просмотр базы: по умолчанию карточками (люди, а не строки), таблица как запасной вид
 * для сверки полей. reloadKey сбрасывает страницу после новой загрузки CSV.
 */
export function CatalogTable({ reloadKey }: { reloadKey: number }) {
  const { t } = useI18n()
  const [offsetState, setOffsetState] = useState({ key: reloadKey, offset: 0 })
  const offset = offsetState.key === reloadKey ? offsetState.offset : 0
  const page = useAsync((signal) => api.experts(offset, PAGE_SIZE, signal), [offset, reloadKey])
  const total = page.data?.total ?? 0
  const c = t.data.columns
  const [view, setView] = useState<View>('cards')

  return (
    <Panel aria-labelledby="catalog-title" className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-5 sm:px-6">
        <PanelTitle id="catalog-title">{t.data.catalog}</PanelTitle>
        <span className="flex items-center gap-4">
          {page.data && <span className="mono text-xs text-ink-3">{t.data.range(offset + 1, Math.min(offset + PAGE_SIZE, total), total)}</span>}
          <Segmented
            label={t.data.viewLabel}
            value={view}
            onChange={setView}
            options={[
              { value: 'cards', label: t.data.viewCards },
              { value: 'table', label: t.data.viewTable },
            ]}
          />
        </span>
      </div>
      {page.error && (
        <div className="px-5 pb-5">
          <ErrorBox message={page.error} />
        </div>
      )}
      {page.isLoading && !page.data && <Skeleton className="mx-5 mb-5 h-64" />}
      {page.data && (
        <>
          {/* основной вид: список строк, как выдача поиска; таблица вторым видом для сверки полей */}
          {view === 'cards' && (
            <ul>
              {page.data.items.map((expert) => (
                <li key={expert.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3.5 border-t border-line px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-5">
                  <Avatar name={expert.full_name} />
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold text-ink">{expert.full_name}</span>
                    <span className="mt-0.5 block truncate text-[13px] text-ink-3">
                      {expert.position} · {expert.competencies.slice(0, 3).join(', ')}
                      {expert.competencies.length > 3 && ` +${expert.competencies.length - 3}`}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-ink-3 sm:hidden">
                      <Status availability={expert.availability} />
                      {expert.city} · {t.years(expert.experience_years)}
                    </span>
                  </span>
                  <span className="hidden flex-col items-end gap-1 text-right sm:flex">
                    <Status availability={expert.availability} />
                    <span className="tnum whitespace-nowrap text-[13px] text-ink-3">
                      {expert.industry} · {expert.city} · {t.years(expert.experience_years)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {/* на телефоне список: таблица в семь колонок туда не помещается */}
          <ul className={view === 'table' ? 'sm:hidden' : 'hidden'}>
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
          <div className={view === 'table' ? 'hidden overflow-x-auto sm:block' : 'hidden'}>
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="label border-y border-line bg-sunken text-ink-3">
                  {[c.id, c.name, c.position, c.industry, c.city, c.experience, c.status].map((label) => (
                    <th key={label} scope="col" className="px-3 py-2.5 font-medium first:pl-6 last:pr-6">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {page.data.items.map((expert) => (
                  <tr key={expert.id} className="border-b border-line last:border-0 hover:bg-hover">
                    <td className="mono py-3 pl-6 pr-3 text-xs text-ink-3">{expert.id}</td>
                    <td className="px-3 py-3 font-semibold text-ink">{expert.full_name}</td>
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
              <Icon name="arrow-left" size={16} /> {t.data.previous}
            </Button>
            <Button size="sm" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffsetState({ key: reloadKey, offset: offset + PAGE_SIZE })}>
              {t.data.next} <Icon name="arrow-right" size={16} />
            </Button>
          </div>
        </>
      )}
    </Panel>
  )
}
