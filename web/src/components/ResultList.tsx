import type { SearchResult } from '../lib/api'
import { useI18n } from '../lib/useI18n'
import { strengthOf } from '../lib/format'
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
}

export const RECOMMENDED = 3

const rank = (n: number) => String(n).padStart(2, '0')

/**
 * Выдача: топ-3 отдельным блоком (крупнее, у каждого совпавшие навыки и первый довод с сервера,
 * лучший отмечен), ниже компактный список «Ещё кандидаты». Строка выбирает эксперта для панели справа,
 * где полное обоснование. Слабое совпадение: один список «Ближайшие профили», без рекомендаций.
 */
export function ResultList({ results, selectedId, onSelect, isWeak, showScore }: ResultListProps) {
  const { t } = useI18n()
  if (isWeak) {
    return <Group title={t.card.closest} items={[...results].sort((a, b) => b.match_percent - a.match_percent)} offset={0} selectedId={selectedId} onSelect={onSelect} showScore={showScore} />
  }
  const top = results.slice(0, RECOMMENDED)
  // остальные по проценту: состав и порядок топ-3 решает движок, ниже числа не должны скакать
  const rest = showScore ? [...results.slice(RECOMMENDED)].sort((a, b) => b.match_percent - a.match_percent) : results.slice(RECOMMENDED)
  return (
    <div className="fade-in space-y-5" aria-label={t.card.listLabel} role="region">
      <section aria-labelledby="top-title">
        <h2 id="top-title" className="label mb-2.5 flex items-baseline gap-2 px-1 text-ink-2">
          {t.card.recommended}
          <span className="text-ink-3">{top.length}</span>
        </h2>
        <ol className="space-y-2">
          {top.map((expert, index) => (
            <li key={expert.id}>
              <TopRow expert={expert} index={index} isSelected={expert.id === selectedId} onSelect={onSelect} showScore={showScore} />
            </li>
          ))}
        </ol>
      </section>
      {rest.length > 0 && <Group title={t.card.more} items={rest} offset={RECOMMENDED} selectedId={selectedId} onSelect={onSelect} showScore={showScore} />}
    </div>
  )
}

interface GroupProps {
  title: string
  items: SearchResult[]
  offset: number
  selectedId: string | null
  onSelect: (id: string) => void
  showScore: boolean
}

function Group({ title, items, offset, selectedId, onSelect, showScore }: GroupProps) {
  const { t } = useI18n()
  return (
    <Panel className="fade-in overflow-hidden" aria-label={offset === 0 ? t.card.listLabel : undefined}>
      <div className="flex items-center justify-between px-4 pb-2 pt-3.5 sm:px-5">
        <h2 className="label flex items-baseline gap-2 text-ink-2">
          {title}
          <span className="text-ink-3">{items.length}</span>
        </h2>
        {showScore && <span className="label text-ink-3">{t.card.match}, %</span>}
      </div>
      <ol start={offset + 1}>
        {items.map((expert, index) => (
          <li key={expert.id} className="border-t border-line">
            <Row expert={expert} rank={offset + index + 1} isSelected={expert.id === selectedId} onSelect={onSelect} showScore={showScore} />
          </li>
        ))}
      </ol>
    </Panel>
  )
}

/** Строка топ-3: крупнее обычной, с навыками и первым доводом; лучший подписан и отмечен полосой сигнала. */
function TopRow({ expert, index, isSelected, onSelect, showScore }: { expert: SearchResult; index: number; isSelected: boolean; onSelect: (id: string) => void; showScore: boolean }) {
  const { t } = useI18n()
  const isBest = index === 0 && showScore
  const strength = strengthOf(expert.match_percent)
  const reason = expert.reasons[0]
  return (
    <button
      type="button"
      onClick={() => onSelect(expert.id)}
      aria-current={isSelected ? 'true' : undefined}
      className={`relative grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-4 overflow-hidden rounded-xl p-4 text-left transition-colors sm:p-5 ${
        isSelected ? 'bg-raised ring-1 ring-line-strong' : 'bg-surface hover:bg-raised'
      }`}
    >
      {isBest && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-action" />}
      <span className="flex min-w-0 gap-3.5">
        <Avatar name={expert.full_name} />
        <span className="min-w-0">
          <span className="flex flex-wrap items-baseline gap-x-2.5">
            <span className="text-[17px] font-semibold leading-tight text-ink [overflow-wrap:anywhere]">{expert.full_name}</span>
            <span className={`text-[12px] ${isBest ? 'font-medium text-action' : 'text-ink-3'}`}>{isBest ? t.card.best : `№ ${index + 1}`}</span>
          </span>
          <span className="mt-0.5 block text-[13px] text-ink-3">
            {expert.position} · {expert.city} · {t.years(expert.experience_years)}
          </span>
          {expert.matched.length > 0 && <span className="mt-2 block text-[14px] text-ink">{expert.matched.join(' · ')}</span>}
          {reason && (
            <span className="mt-1 flex items-start gap-1.5 text-[13px] text-ink-2">
              <Icon name="check" size={14} strokeWidth={2.2} className="mt-0.5 text-ink-3" />
              {reason}
            </span>
          )}
          {expert.alternative && (
            <span className="mt-1 block text-[12px] text-ink-3">
              {t.card.altShort}: <span className="text-ink-2">{expert.alternative.full_name}</span> · {expert.alternative.match_percent}%
            </span>
          )}
        </span>
      </span>
      <span className="flex flex-col items-end justify-between gap-3">
        {showScore ? (
          <span className="flex flex-col items-end gap-1.5" aria-label={t.card.matchAria(expert.match_percent)}>
            <span className={`display text-[28px] font-semibold leading-none ${STRONG_TEXT[strength]}`}>{expert.match_percent}</span>
            <span aria-hidden className="block h-[3px] w-14 overflow-hidden rounded-full bg-line">
              <span className={`block h-full rounded-full ${STRONG_BAR[strength]}`} style={{ width: `${Math.max(3, expert.match_percent)}%` }} />
            </span>
          </span>
        ) : (
          <span className="display text-right text-[22px] font-semibold leading-none text-ink">
            {expert.experience_years}
            <span className="block text-[11px] font-normal tracking-normal text-ink-3">{t.card.yearsShort}</span>
          </span>
        )}
        <Status availability={expert.availability} />
      </span>
    </button>
  )
}

const STRONG_TEXT = { strong: 'text-ink', medium: 'text-medium', weak: 'text-weak' } as const
const STRONG_BAR = { strong: 'bg-brand', medium: 'bg-medium-bar', weak: 'bg-weak' } as const

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
