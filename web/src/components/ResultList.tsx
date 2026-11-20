import type { SearchResult } from '../lib/api'
import { useI18n } from '../lib/useI18n'
import { Score } from './Score'
import { Status } from './Status'
import { Panel } from './ui'

interface ResultListProps {
  results: SearchResult[]
  selectedId: string | null
  onSelect: (expertId: string) => void
  /** слабое совпадение: одна группа «Ближайшие профили», без «Рекомендованы» */
  isWeak: boolean
  /** запрос без темы: процент не показываем, вместо него стаж */
  showScore: boolean
}

const RECOMMENDED = 3

/** Выдача двумя группами: рекомендованные (топ-3) и остальные. Строка выбирает эксперта для панели справа. */
export function ResultList({ results, selectedId, onSelect, isWeak, showScore }: ResultListProps) {
  const { t } = useI18n()
  const groups = isWeak
    ? [{ title: t.card.closest, items: results, offset: 0 }]
    : [
        { title: t.card.recommended, items: results.slice(0, RECOMMENDED), offset: 0 },
        { title: t.card.more, items: results.slice(RECOMMENDED), offset: RECOMMENDED },
      ].filter((group) => group.items.length > 0)

  return (
    <Panel className="fade-in overflow-hidden" aria-label={t.card.listLabel}>
      {groups.map((group, groupIndex) => (
        <div key={group.title}>
          <div className={`flex items-center justify-between px-4 pb-2 pt-3.5 sm:px-5 ${groupIndex > 0 ? 'border-t border-line' : ''}`}>
            <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-ink-3">{group.title}</h2>
            {groupIndex === 0 && showScore && <span className="text-xs font-bold uppercase tracking-[0.08em] text-ink-3">{t.card.match}</span>}
          </div>
          <ol start={group.offset + 1}>
            {group.items.map((expert) => (
              <li key={expert.id} className="border-t border-line first:border-t-0">
                <Row expert={expert} isSelected={expert.id === selectedId} onSelect={onSelect} showScore={showScore} />
              </li>
            ))}
          </ol>
        </div>
      ))}
    </Panel>
  )
}

function Row({ expert, isSelected, onSelect, showScore }: { expert: SearchResult; isSelected: boolean; onSelect: (id: string) => void; showScore: boolean }) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      onClick={() => onSelect(expert.id)}
      aria-current={isSelected ? 'true' : undefined}
      className={`grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] px-4 py-3.5 text-left transition-colors sm:px-5 ${
        isSelected ? 'bg-brand-tint/60 shadow-[inset_3px_0_0_var(--color-brand)]' : 'hover:bg-sunken'
      } ${expert.availability === 'busy' ? 'text-ink-2' : ''}`}
    >
      {showScore ? (
        <Score percent={expert.match_percent} />
      ) : (
        <span className="flex w-12 flex-col">
          <span className="tnum text-2xl font-extrabold leading-none tracking-[-0.03em] text-ink">{expert.experience_years}</span>
          <span className="mt-1 text-[11px] font-semibold text-ink-3">{t.card.yearsShort}</span>
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-base font-bold tracking-[-0.01em] text-ink [overflow-wrap:anywhere]">{expert.full_name}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-ink-2">
          {expert.matched.length > 0 && <span className="font-semibold text-brand-deep">{expert.matched.join(', ')} · </span>}
          {expert.position}
        </span>
        {/* на телефоне статус и город под именем: третьей колонке там нет места */}
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 sm:hidden">
          <Status availability={expert.availability} />
          <span className="tnum text-[13px] text-ink-2">
            {expert.city} · {t.years(expert.experience_years)}
          </span>
        </span>
      </span>
      <span className="hidden flex-col items-end gap-1 text-right sm:flex">
        <Status availability={expert.availability} />
        <span className="tnum whitespace-nowrap text-[13px] text-ink-2">
          {expert.city} · {t.years(expert.experience_years)}
        </span>
      </span>
    </button>
  )
}

/** Заглушка списка той же высоты строк, что и готовый список. */
export function ResultListSkeleton() {
  return (
    <Panel className="overflow-hidden">
      <div className="px-5 pb-2 pt-4">
        <div className="sk h-3 w-28" />
      </div>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="grid grid-cols-[48px_1fr_80px] items-center gap-4 border-t border-line px-5 py-4">
          <div className="sk h-7" />
          <div>
            <div className="sk h-4 w-2/3" />
            <div className="sk mt-2 h-3 w-5/6" />
          </div>
          <div className="sk h-8" />
        </div>
      ))}
    </Panel>
  )
}
