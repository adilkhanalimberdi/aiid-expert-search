import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useAsync } from '../hooks/useAsync'
import { api, type SearchResult } from '../lib/api'
import { errorText } from '../lib/errors'
import type { Dict } from '../lib/i18n'
import { useI18n } from '../lib/useI18n'
import { FeedbackButtons } from './FeedbackButtons'
import { Score } from './Score'
import { Status } from './Status'
import { Button, Eyebrow, Skeleton } from './ui'

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
  /** на телефоне панель открыта поверх списка и закрывается */
  onClose?: () => void
}

/**
 * Профиль эксперта в правой панели (на телефоне поверх списка): почему подходит, сверка с запросом
 * («Почему не он?»), компетенции, отзыв и похожие эксперты. Переход к похожему идёт по цепочке с «Назад».
 */
export function ExpertPane({ expertId, result, label, query, showScore, onClose }: ExpertPaneProps) {
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
        <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
          {!isRoot ? (
            <Button variant="ghost" size="sm" onClick={() => setTrail((path) => path.slice(0, -1))}>
              <span aria-hidden>←</span> {t.dialog.back}
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
      )}
      <Profile
        key={`${currentId}-${query}`}
        expertId={currentId}
        result={isRoot ? result : undefined}
        label={isRoot ? label : t.card.similarProfile}
        query={query}
        showScore={showScore}
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
  onOpen: (id: string) => void
}

function Profile({ expertId, result, label, query, showScore, onOpen }: ProfileProps) {
  const { t, lang } = useI18n()
  const expert = useAsync(() => api.expert(expertId), [expertId])
  const explanation = useAsync(query ? () => api.explain(expertId, query) : null, [expertId, query, lang])
  const similar = useAsync(() => api.similar(expertId, 4), [expertId])
  // у профиля из цепочки строки выдачи нет: процент и причины берём из сверки с запросом
  const match = result ?? explanation.data?.expert
  const profile = expert.data

  const name = profile?.full_name ?? match?.full_name
  const position = profile?.position ?? match?.position
  const organization = profile?.organization ?? match?.organization

  return (
    <article aria-labelledby={`expert-${expertId}`}>
      <header className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-5 border-b border-line px-5 pb-5 pt-5 sm:px-6">
        <div className="min-w-0">
          <Eyebrow className="!text-brand-deep">{label}</Eyebrow>
          {name ? (
            <h2 id={`expert-${expertId}`} className="mt-1.5 text-[26px] font-bold leading-[1.12] tracking-[-0.03em] [overflow-wrap:anywhere] sm:text-[30px]">
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
        </div>
        {showScore && match && query && <Score percent={match.match_percent} size="hero" />}
      </header>

      {(profile || match) && (
        <dl className="flex flex-wrap gap-x-6 gap-y-2 border-b border-line px-5 py-3.5 text-sm sm:px-6">
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

      {match && match.reasons.length > 0 && (
        <Section title={t.card.why}>
          <ul>
            {match.reasons.map((reason) => (
              <Reason key={reason} reason={reason} match={match} t={t} />
            ))}
          </ul>
        </Section>
      )}

      {query && (
        <Section title={t.dialog.whyNot}>
          {explanation.isLoading && <Skeleton className="h-16 w-full" />}
          {explanation.error && <p className="text-sm text-danger">{errorText(explanation.error, t)}</p>}
          {explanation.data && (
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
                    className={`rounded-md px-2.5 py-1 text-[13px] ${isHit ? 'bg-brand-tint font-semibold text-brand-deep' : 'border border-line text-ink-2'}`}
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
                className="flex h-full w-full flex-col rounded-lg border border-line p-3 text-left transition-colors hover:border-brand-soft hover:bg-brand-tint/40"
              >
                <span className="font-bold text-ink">{item.full_name}</span>
                <span className="text-[13px] text-ink-2">
                  {item.position}, {item.city}
                </span>
                <span className="tnum mt-1 text-xs font-semibold text-brand-deep">{t.dialog.similarity(Math.round(cosine * 100))}</span>
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
      <h3 className="mb-2.5 text-xs font-bold uppercase tracking-[0.08em] text-ink-3">{title}</h3>
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

function Reason({ reason, match, t }: { reason: string; match: SearchResult; t: Dict }) {
  const lower = reason.toLowerCase()
  const isMatched = match.matched.some((skill) => lower.includes(skill.toLowerCase()))
  const isRelated = !isMatched && match.related.some((skill) => lower.includes(skill.toLowerCase()))
  const source = reasonSource(reason, match, t)
  return (
    <li className="flex items-start justify-between gap-4 border-t border-dashed border-line py-2 text-[15px] first:border-t-0 first:pt-0">
      <span className="flex items-start gap-2.5">
        <span
          aria-hidden
          className={`mt-[7px] size-2 flex-none rounded-full ${isMatched ? 'bg-brand' : isRelated ? 'border-[1.5px] border-brand' : 'bg-line-strong'}`}
        />
        {reason}
      </span>
      {source && <span className="mt-0.5 whitespace-nowrap text-xs font-semibold text-ink-3">{source}</span>}
    </li>
  )
}

function Check({ title, items, empty, tone }: { title: string; items: string[]; empty: string; tone: 'ok' | 'miss' | 'note' }) {
  const mark = { ok: 'text-free', miss: 'text-danger', note: 'text-cond' }[tone]
  const symbol = { ok: '✓', miss: '✕', note: '!' }[tone]
  return (
    <div className="grid gap-x-4 gap-y-1 rounded-lg bg-sunken px-3 py-2.5 sm:grid-cols-[11rem_minmax(0,1fr)]">
      <dt className="font-bold text-ink">{title}</dt>
      <dd className="text-ink-2">
        {items.length === 0 ? (
          empty
        ) : (
          <ul className="space-y-0.5">
            {items.map((item) => (
              <li key={item} className="flex min-w-0 gap-1.5">
                <span aria-hidden className={`font-bold ${mark}`}>
                  {symbol}
                </span>
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
