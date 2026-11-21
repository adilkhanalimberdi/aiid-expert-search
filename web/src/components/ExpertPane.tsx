import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useAsync } from '../hooks/useAsync'
import { api, type ParsedQuery, type SearchResult } from '../lib/api'
import { errorText } from '../lib/errors'
import type { Dict } from '../lib/i18n'
import { useI18n } from '../lib/useI18n'
import { Avatar } from './Avatar'
import { FeedbackButtons } from './FeedbackButtons'
import { Icon } from './Icon'
import { Score } from './Score'
import { Status } from './Status'
import { Button, Skeleton } from './ui'

interface ExpertPaneProps {
  /** эксперт из выдачи, с которого начинается цепочка */
  expertId: string
  /** его строка выдачи: процент и причины уже есть, второй раз не спрашиваем */
  result?: SearchResult
  /** подпись над именем: «Лучшее совпадение», «№ 2», «Ближайший профиль» */
  label: string
  query: string
  /** запрос без темы: процента нет */
  showScore: boolean
  /** разбор запроса: по нему причины про город, отрасль и опыт показываются, только если о них спрашивали */
  parsed?: ParsedQuery
  /** слабое совпадение: это не доводы, а то, что совпало с профилем */
  isWeak?: boolean
  /** на телефоне панель открыта поверх списка и закрывается */
  onClose?: () => void
}

/**
 * Профиль эксперта в правой панели (на телефоне поверх списка): почему подходит, сверка с запросом
 * («Почему не он?»), компетенции, отзыв и похожие эксперты. Переход к похожему идёт по цепочке с «Назад».
 */
export function ExpertPane({ expertId, result, label, query, showScore, parsed, isWeak = false, onClose }: ExpertPaneProps) {
  const { t } = useI18n()
  const [trail, setTrail] = useState([expertId])
  const currentId = trail[trail.length - 1]
  const isRoot = trail.length === 1
  const top = useRef<HTMLDivElement>(null)
  const shownId = useRef(expertId)

  // при переходе по цепочке похожих новый профиль показываем с начала; при первом открытии страницу не двигаем
  useEffect(() => {
    if (shownId.current === currentId) return
    shownId.current = currentId
    top.current?.scrollIntoView({ block: 'nearest' })
  }, [currentId])

  return (
    <div ref={top} className="scroll-mt-40">
      {(onClose || !isRoot) && (
        // на телефоне полоса прилипает к верху окна и несёт плашку о данных: окно закрывает шапку
        <div className={onClose ? 'sticky top-0 z-10 bg-surface' : ''}>
          {onClose && (
            <p className="flex items-center gap-2 bg-night px-4 py-1.5 text-xs text-night-text">
              <span className="min-w-0">{t.synthetic}</span>
            </p>
          )}
        <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
          {!isRoot ? (
            <Button variant="ghost" size="sm" onClick={() => setTrail((path) => path.slice(0, -1))}>
              <Icon name="arrow-left" size={16} /> {t.dialog.back}
            </Button>
          ) : (
            <span />
          )}
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              {t.card.backToList}
            </Button>
          )}
        </div>
        </div>
      )}
      <Profile
        key={`${currentId}-${query}`}
        expertId={currentId}
        result={isRoot ? result : undefined}
        label={isRoot ? label : t.card.similarProfile}
        query={query}
        showScore={showScore}
        parsed={parsed}
        isWeak={isRoot && isWeak}
        onOpen={(id) => setTrail((path) => [...path, id])}
      />
    </div>
  )
}

interface ProfileProps {
  expertId: string
  result?: SearchResult
  label: string
  query: string
  showScore: boolean
  parsed?: ParsedQuery
  isWeak: boolean
  onOpen: (id: string) => void
}

function Profile({ expertId, result, label, query, showScore, parsed, isWeak, onOpen }: ProfileProps) {
  const { t, lang } = useI18n()
  const expert = useAsync(() => api.expert(expertId), [expertId])
  const explanation = useAsync(query ? () => api.explain(expertId, query) : null, [expertId, query, lang])
  const similar = useAsync(() => api.similar(expertId, 4), [expertId])
  // у профиля из цепочки строки выдачи нет: процент и причины берём из сверки с запросом
  const match = result ?? explanation.data?.expert
  const profile = expert.data
  const reading = parsed ?? explanation.data?.parsed
  const reasons = match ? match.reasons.filter((reason) => isAsked(reasonSource(reason, match, t), reading, t)) : []

  const name = profile?.full_name ?? match?.full_name
  const position = profile?.position ?? match?.position
  const organization = profile?.organization ?? match?.organization

  return (
    <article aria-labelledby={`expert-${expertId}`}>
      <header className="grid gap-x-5 gap-y-4 border-b border-line px-5 pb-5 pt-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-6">
        <div className="flex min-w-0 gap-4">
          {name && (
            <span className="hidden sm:block">
              <Avatar name={name} size="lg" />
            </span>
          )}
          <div className="min-w-0">
          {name ? (
            <h2 id={`expert-${expertId}`} className="serif mt-0.5 text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] [overflow-wrap:anywhere] sm:text-[32px]">
              {name}
            </h2>
          ) : (
            <Skeleton className="mt-2 h-8 w-3/4" />
          )}
          {position && (
            <p className="mt-1.5 text-[15px] text-ink-2">
              {position}
              {organization && ` · ${organization}`}
            </p>
          )}
          <p className="mt-3">
            <span className="mono inline-flex items-center gap-1.5 rounded border border-brand-soft bg-brand-tint px-2 py-0.5 text-[11px] uppercase tracking-[0.06em] text-brand-deep">
              <span aria-hidden className="size-1.5 rounded-full bg-brand" />
              {label}
            </span>
          </p>
          </div>
        </div>
        {showScore && match && query && <Score percent={match.match_percent} size="hero" />}
      </header>

      {(profile || match) && (
        <dl className="flex flex-wrap gap-x-6 gap-y-2 border-b border-line bg-sunken px-5 py-3 text-sm sm:px-6">
          <Fact label={t.card.city}>{profile?.city ?? match?.city}</Fact>
          <Fact label={t.card.industry}>{profile?.industry ?? match?.industry}</Fact>
          <Fact label={t.card.experience}>
            <span className="tnum">{t.years(profile?.experience_years ?? match?.experience_years ?? 0)}</span>
          </Fact>
          <div className="flex items-center">
            <dt className="sr-only">{t.card.status}</dt>
            <dd>
              <Status availability={(profile?.availability ?? match?.availability)!} />
            </dd>
          </div>
        </dl>
      )}

      {expert.error && (
        <p role="alert" className="px-6 py-4 text-sm text-danger">
          {errorText(expert.error, t)}
        </p>
      )}

      {match && reasons.length > 0 && (
        <Section title={isWeak ? t.card.whatMatched : t.card.why}>
          <ul>
            {reasons.map((reason) => (
              <Reason key={reason} reason={reason} match={match} t={t} />
            ))}
          </ul>
        </Section>
      )}

      {query && (
        <Section title={t.dialog.whyNot}>
          {explanation.isLoading && <Skeleton className="h-16 w-full" />}
          {explanation.error && <p className="text-sm text-danger">{errorText(explanation.error, t)}</p>}
          {explanation.data && explanation.data.parsed.terms.length === 0 && (
            <p className="text-sm text-ink-2">{t.dialog.noTermsToCheck}</p>
          )}
          {explanation.data && explanation.data.parsed.terms.length > 0 && (
            <dl className="grid gap-2 text-sm">
              <Check title={t.dialog.confirmed} items={explanation.data.expert.matched} empty={t.dialog.noSkills} tone="ok" />
              <Check title={t.dialog.missing} items={explanation.data.missing_terms} empty={t.dialog.allConfirmed} tone="miss" />
              <Check title={t.dialog.constraints} items={explanation.data.constraints} empty={t.dialog.noConstraints} tone="note" />
            </dl>
          )}
        </Section>
      )}

      <Section title={t.card.skills}>
        {expert.isLoading && <Skeleton className="h-14 w-full" />}
        {profile && (
          <>
            <ul className="flex flex-wrap gap-1.5">
              {profile.competencies.map((skill) => {
                const isHit = match?.matched.some((item) => item.toLowerCase() === skill.toLowerCase())
                return (
                  <li
                    key={skill}
                    className={`rounded-md border px-2.5 py-1 text-[13px] ${isHit ? 'border-brand-soft bg-brand-tint font-semibold text-brand-deep' : 'border-line bg-surface text-ink-2'}`}
                  >
                    {skill}
                  </li>
                )
              })}
            </ul>
            {profile.bio && <p className="mt-4 text-[15px] leading-relaxed text-ink-2">{profile.bio}</p>}
            <p className="mt-3 text-sm text-ink-3">
              {t.dialog.languages}: {profile.languages.join(', ') || t.dialog.notSpecified}
              {profile.email && (
                <>
                  {' · '}
                  <a href={`mailto:${profile.email}`} className="font-medium text-brand-deep underline decoration-brand/30 underline-offset-2 hover:decoration-brand">
                    {profile.email}
                  </a>
                  <CopyButton text={profile.email} />
                </>
              )}
            </p>
          </>
        )}
      </Section>

      {query && (
        <div className="border-b border-line px-5 py-4 sm:px-6">
          <FeedbackButtons query={query} expertId={expertId} />
        </div>
      )}

      <Section title={t.dialog.similar} last>
        {similar.isLoading && <Skeleton className="h-16 w-full" />}
        {similar.error && <p className="text-sm text-danger">{errorText(similar.error, t)}</p>}
        <ul className="grid gap-2 sm:grid-cols-2">
          {similar.data?.map(({ expert: item, cosine }) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onOpen(item.id)}
                className="group flex h-full w-full flex-col rounded-lg border border-line p-3 text-left transition-colors hover:border-brand-soft hover:bg-hover"
              >
                <span className="serif font-semibold text-ink group-hover:text-brand-deep">{item.full_name}</span>
                <span className="text-[13px] text-ink-2">
                  {item.position}, {item.city}
                </span>
                <span className="mono mt-2 flex items-center gap-2 text-[11px] text-brand-deep">
                  <span aria-hidden className="h-1 w-12 overflow-hidden rounded-full bg-line">
                    <span className="block h-full bg-brand" style={{ width: `${Math.round(cosine * 100)}%` }} />
                  </span>
                  {t.dialog.similarity(Math.round(cosine * 100))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Section>
    </article>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-ink-3">{label}</dt>
      <dd className="font-semibold text-ink">{children}</dd>
    </div>
  )
}

function Section({ title, children, last = false }: { title: string; children: ReactNode; last?: boolean }) {
  return (
    <section className={`px-5 py-4 sm:px-6 ${last ? '' : 'border-b border-line'}`}>
      <h3 className="mb-3 flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        {title}
        <span aria-hidden className="h-px flex-1 bg-line" />
      </h3>
      {children}
    </section>
  )
}

/** Поле профиля, из которого взята причина: навыки, город, отрасль, стаж или статус. */
function reasonSource(reason: string, match: SearchResult, t: Dict): string | null {
  const lower = reason.toLowerCase()
  if ([...match.matched, ...match.related].some((skill) => lower.includes(skill.toLowerCase()))) return t.card.skills
  if (lower.includes(match.city.toLowerCase())) return t.card.city
  if (lower.includes(match.industry.toLowerCase())) return t.card.industry
  if (lower.includes(String(match.experience_years))) return t.card.experience
  if (Object.values(t.status).some((word) => lower.includes(word.toLowerCase().split(' ')[0]))) return t.card.status
  return null
}

/**
 * Город, отрасль и опыт считаются доводом, только если о них спрашивали; иначе это просто факты профиля
 * (они и так видны строкой под именем). Навыки и статус показываются всегда.
 */
function isAsked(source: string | null, reading: ParsedQuery | undefined, t: Dict): boolean {
  if (!reading) return true
  if (source === t.card.city) return Boolean(reading.city)
  if (source === t.card.industry) return Boolean(reading.industry)
  if (source === t.card.experience) return reading.min_experience !== null
  return true
}

function Reason({ reason, match, t }: { reason: string; match: SearchResult; t: Dict }) {
  const lower = reason.toLowerCase()
  const isMatched = match.matched.some((skill) => lower.includes(skill.toLowerCase()))
  const isRelated = !isMatched && match.related.some((skill) => lower.includes(skill.toLowerCase()))
  const source = reasonSource(reason, match, t)
  // занятость и частичная занятость не довод, а ограничение: другая метка
  const isLimit = source === t.card.status && match.availability !== 'available'
  return (
    <li className="flex items-start justify-between gap-4 border-t border-dashed border-line py-2 text-[15px] first:border-t-0 first:pt-0">
      <span className="flex items-start gap-2.5">
        <span
          aria-hidden
          className={`mt-[7px] size-2 flex-none rounded-full ${isLimit ? 'bg-danger' : isMatched ? 'bg-brand' : isRelated ? 'border-[1.5px] border-brand' : 'bg-line-strong'}`}
        />
        {reason}
      </span>
      {source && <span className="mt-0.5 whitespace-nowrap text-xs font-semibold text-ink-3">{source}</span>}
    </li>
  )
}

function Check({ title, items, empty, tone }: { title: string; items: string[]; empty: string; tone: 'ok' | 'miss' | 'note' }) {
  const mark = { ok: 'text-free', miss: 'text-danger', note: 'text-cond' }[tone]
  const symbol = ({ ok: 'check', miss: 'x', note: 'info' } as const)[tone]
  return (
    <div className={`rounded-lg border-l-[3px] bg-sunken px-3.5 py-2.5 ${{ ok: 'border-free', miss: 'border-danger', note: 'border-cond' }[tone]}`}>
      <dt className="font-semibold text-ink">{title}</dt>
      <dd className="mt-1 text-ink-2">
        {items.length === 0 ? (
          empty
        ) : (
          <ul className="space-y-0.5">
            {items.map((item) => (
              <li key={item} className="flex min-w-0 gap-1.5">
                <Icon name={symbol} size={16} strokeWidth={2.4} className={`mt-0.5 ${mark}`} />
                <span className="break-words">{item}</span>
              </li>
            ))}
          </ul>
        )}
      </dd>
    </div>
  )
}

export function ExpertPaneSkeleton() {
  return (
    <div className="space-y-3 p-6">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="mt-6 h-24 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  )
}

/** Копирует адрес в буфер и на секунду с небольшим подтверждает это словом. */
function CopyButton({ text }: { text: string }) {
  const { t } = useI18n()
  const [isCopied, setIsCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setIsCopied(true)
          window.setTimeout(() => setIsCopied(false), 1400)
        })
      }}
      className="ml-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-ink-3 hover:bg-hover hover:text-brand-deep"
    >
      <Icon name={isCopied ? 'check' : 'copy'} size={13} />
      <span aria-live="polite">{isCopied ? t.copied : t.copy}</span>
    </button>
  )
}
