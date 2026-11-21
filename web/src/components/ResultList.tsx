import type { SearchResult } from '../lib/api'
import { useI18n } from '../lib/useI18n'
import { Avatar } from './Avatar'
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

export const RECOMMENDED = 3

const rank = (n: number) => String(n).padStart(2, '0')


/**
 * Вся выдача одним списком: группа «Рекомендованы» (топ-3, их порядок решает движок) и «Ещё кандидаты».
 * Строка выбирает эксперта для панели справа, где обоснование. У занятого из топ-3 тихая строка
 * со свободной заменой.
 */
export function ResultList({ results, selectedId, onSelect, isWeak, showScore }: ResultListProps) {
  const { t } = useI18n()
  const groups = isWeak
    ? [{ title: t.card.closest, items: [...results].sort((a, b) => b.match_percent - a.match_percent), offset: 0 }]
    : [
        { title: t.card.recommended, items: results.slice(0, RECOMMENDED), offset: 0 },
        // остальные по проценту: состав и порядок топ-3 решает движок, ниже числа не должны скакать
        { title: t.card.more, items: showScore ? [...results.slice(RECOMMENDED)].sort((a, b) => b.match_percent - a.match_percent) : results.slice(RECOMMENDED), offset: RECOMMENDED },
      ].filter((group) => group.items.length > 0)

  return (
    <Panel className="fade-in overflow-hidden" aria-label={t.card.listLabel}>
      {groups.map((group, groupIndex) => (
        <div key={group.title}>
          <div className={`flex items-center justify-between px-4 pb-2 pt-3.5 sm:px-5 ${groupIndex > 0 ? 'border-t border-line' : ''}`}>
            <h2 className="label flex items-baseline gap-2 text-ink-2">
              {group.title}
              <span className="text-ink-3">{group.items.length}</span>
            </h2>
            {groupIndex === 0 && showScore && <span className="label text-ink-3">{t.card.match}, %</span>}
          </div>
          <ol start={group.offset + 1}>
            {group.items.map((expert, index) => (
              <li key={expert.id} className="border-t border-line first:border-t-0">
                <Row expert={expert} rank={group.offset + index + 1} isSelected={expert.id === selectedId} onSelect={onSelect} showScore={showScore} />
              </li>
            ))}
          </ol>
        </div>
      ))}
    </Panel>
  )
}

function Row({ expert, rank: position, isSelected, onSelect, showScore }: { expert: SearchResult; rank: number; isSelected: boolean; onSelect: (id: string) => void; showScore: boolean }) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      onClick={() => onSelect(expert.id)}
      aria-current={isSelected ? 'true' : undefined}
      className={`relative grid w-full grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-x-3.5 px-4 py-3 text-left transition-colors sm:grid-cols-[auto_auto_auto_minmax(0,1fr)_auto] sm:px-5 ${
        isSelected ? 'bg-raised' : 'hover:bg-hover'
      }`}
    >
      {isSelected && <span aria-hidden className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-ink-2" />}
      <span aria-hidden className={`mono w-5 text-xs ${isSelected ? 'text-ink' : 'text-ink-3'}`}>
        {rank(position)}
      </span>
      {showScore ? (
        <Score percent={expert.match_percent} />
      ) : (
        <span className="flex w-12 flex-col">
          <span className="mono text-xl font-medium leading-none text-ink">{expert.experience_years}</span>
          <span className="mt-1 text-[11px] font-medium text-ink-3">{t.card.yearsShort}</span>
        </span>
      )}
      <span className="hidden sm:block">
        <Avatar name={expert.full_name} />
      </span>
      <span className="min-w-0">
        <span className={`block text-[15px] font-semibold [overflow-wrap:anywhere] ${expert.availability === 'busy' ? 'text-ink-2' : 'text-ink'}`}>{expert.full_name}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-ink-3">
          {expert.matched.length > 0 && <span className="text-ink-2">{expert.matched.join(', ')} · </span>}
          {expert.position}
        </span>
        {expert.alternative && (
          <span className="mt-1 block text-[12px] text-ink-3">
            {t.card.altShort}: <span className="text-ink-2">{expert.alternative.full_name}</span> · {expert.alternative.match_percent}%
          </span>
        )}
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
        <span className="tnum whitespace-nowrap text-[13px] text-ink-3">
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
        <div key={index} className="grid grid-cols-[20px_48px_1fr_80px] items-center gap-4 border-t border-line px-5 py-4">
          <div className="sk h-3" />
          <div className="sk h-6" />
          <div>
            <div className="sk h-4 w-2/3" />
            <div className="sk mt-2 h-3 w-5/6" />
          </div>
          <div className="sk h-7" />
        </div>
      ))}
    </Panel>
  )
}
