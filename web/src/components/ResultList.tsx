import type { SearchResult } from '../lib/api'
import { useI18n } from '../lib/useI18n'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
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
  /** топ-3 уже показан карточками над списком: здесь только остальные */
  hideTop?: boolean
}

export const RECOMMENDED = 3

const rank = (n: number) => String(n).padStart(2, '0')


/** Выдача группами: рекомендованные (топ-3) и остальные. Строка выбирает эксперта для панели справа. */
export function ResultList({ results, selectedId, onSelect, isWeak, showScore, hideTop = false }: ResultListProps) {
  const { t } = useI18n()
  const groups = isWeak
    ? [{ title: t.card.closest, items: [...results].sort((a, b) => b.match_percent - a.match_percent), offset: 0 }]
    : [
        { title: t.card.recommended, items: results.slice(0, RECOMMENDED), offset: 0 },
        // остальные по проценту: состав и порядок топ-3 решает движок, ниже числа не должны скакать
        { title: t.card.more, items: showScore ? [...results.slice(RECOMMENDED)].sort((a, b) => b.match_percent - a.match_percent) : results.slice(RECOMMENDED), offset: RECOMMENDED },
      ].filter((group, index) => group.items.length > 0 && !(hideTop && index === 0))

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

/** Заглушка топ-3 той же высоты, что и карточки: выдача не прыгает, когда приходит ответ. */
export function TopCardsSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="h-[236px] rounded-xl bg-surface p-5">
          <div className="flex justify-between">
            <div className="sk h-4 w-16" />
            <div className="sk h-6 w-12" />
          </div>
          <div className="mt-5 flex gap-3">
            <div className="sk size-9" />
            <div className="flex-1">
              <div className="sk h-4 w-3/4" />
              <div className="sk mt-2 h-3 w-1/2" />
            </div>
          </div>
          <div className="sk mt-5 h-5 w-5/6" />
          <div className="sk mt-4 h-3 w-full" />
          <div className="sk mt-2 h-3 w-4/5" />
        </div>
      ))}
    </div>
  )
}

interface TopCardsProps {
  results: SearchResult[]
  selectedId: string | null
  onSelect: (expertId: string) => void
  showScore: boolean
}

/**
 * Топ-3 крупными карточками: главный ответ виден сразу, у каждого совпавшие компетенции и первые доводы
 * с сервера. Выбранная карточка «захвачена» уголками визира, как в знаке. Клик открывает полный профиль.
 */
export function TopCards({ results, selectedId, onSelect, showScore }: TopCardsProps) {
  const { t } = useI18n()
  return (
    <section aria-labelledby="top-title" className="fade-in">
      <h2 id="top-title" className="label mb-3 flex items-baseline gap-2 text-ink-2">
        {t.card.recommended}
        <span className="text-ink-3">{Math.min(RECOMMENDED, results.length)}</span>
      </h2>
      <ol className="grid gap-3 md:grid-cols-3">
        {results.slice(0, RECOMMENDED).map((expert, index) => {
          const isSelected = expert.id === selectedId
          const isBest = index === 0 && showScore
          const related = expert.related.filter((item) => !expert.matched.includes(item))
          return (
            <li key={expert.id} className="min-w-0">
              <button
                type="button"
                onClick={() => onSelect(expert.id)}
                aria-current={isSelected ? 'true' : undefined}
                className={`flex h-full w-full flex-col rounded-xl p-4 text-left transition-colors sm:p-5 ${
                  isSelected ? 'bg-raised ring-1 ring-line-strong' : 'bg-surface hover:bg-raised'
                }`}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <Avatar name={expert.full_name} />
                    <span className="min-w-0">
                      <span className="block text-[16px] font-semibold leading-tight text-ink [overflow-wrap:anywhere]">{expert.full_name}</span>
                      <span className="mt-0.5 block text-[13px] leading-snug text-ink-3">{expert.position}</span>
                    </span>
                  </span>
                  {showScore ? (
                    <Score percent={expert.match_percent} />
                  ) : (
                    <span className="display text-right text-xl font-semibold leading-none text-ink">
                      {expert.experience_years}
                      <span className="block text-[11px] font-normal tracking-normal text-ink-3">{t.card.yearsShort}</span>
                    </span>
                  )}
                </span>
                <span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
                  <span className={isBest ? 'font-medium text-action' : ''}>{isBest ? t.card.best : `№ ${index + 1}`}</span>
                  <Status availability={expert.availability} />
                  <span className="tnum">
                    {expert.city} · {t.years(expert.experience_years)}
                  </span>
                </span>
                {(expert.matched.length > 0 || related.length > 0) && (
                  <span className="mt-3 block text-[13px] leading-relaxed">
                    {expert.matched.length > 0 && <span className="text-ink">{expert.matched.join(' · ')}</span>}
                    {expert.matched.length > 0 && related.length > 0 && <span className="text-ink-3"> · </span>}
                    {related.length > 0 && <span className="text-ink-3">{related.slice(0, 3).join(' · ')}</span>}
                  </span>
                )}
                {expert.reasons.length > 0 && (
                  <span className="mt-3 block border-t border-line pt-3">
                    {expert.reasons.slice(0, 3).map((reason) => (
                      <span key={reason} className="flex items-start gap-1.5 py-0.5 text-[13px] leading-snug text-ink-2">
                        <Icon name="check" size={14} strokeWidth={2.2} className="mt-0.5 text-ink-3" />
                        {reason}
                      </span>
                    ))}
                  </span>
                )}
                {expert.alternative && (
                  <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-3 text-xs text-ink-3">
                    {t.card.altShort}:
                    <span className="text-[13px] font-medium text-ink-2">{expert.alternative.full_name}</span>
                    <span>{expert.alternative.match_percent}%</span>
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
