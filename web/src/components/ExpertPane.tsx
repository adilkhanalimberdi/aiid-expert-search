import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useAsync } from '../hooks/useAsync'
import { api, type ParsedQuery, type ScoreBreakdown, type SearchResult, type TermEvidence } from '../lib/api'
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
 * Профиль эксперта в правой панели (на телефоне поверх списка). Под шапкой три вкладки, чтобы панель
 * не приходилось долго листать: «Обоснование» (запрос → профиль, как сложился процент, условия, отзыв),
 * «Профиль» (компетенции, описание, контакты) и «Похожие». Переход к похожему идёт по цепочке с «Назад».
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
        // на телефоне полоса прилипает к верху окна; пометка о данных видна в строке состояния под окном
        <div className={onClose ? 'sticky top-0 z-10 bg-surface' : ''}>
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

type Tab = 'reasoning' | 'profile' | 'similar'

function Profile({ expertId, result, label, query, showScore, parsed, isWeak, onOpen }: ProfileProps) {
  const { t, lang } = useI18n()
  const [tab, setTab] = useState<Tab>(query ? 'reasoning' : 'profile')
  // сверка с запросом нужна вкладке «Обоснование», а профилю из цепочки ещё и для процента в шапке;
  // похожие грузятся, только когда их вкладку открыли: скрытые вкладки сервер не дёргают
  const needsExplain = Boolean(query) && (tab === 'reasoning' || !result)
  const expert = useAsync((signal) => api.expert(expertId, signal), [expertId])
  const explanation = useAsync(needsExplain ? (signal) => api.explain(expertId, query, signal) : null, [expertId, query, lang, needsExplain])
  const similar = useAsync(tab === 'similar' ? (signal) => api.similar(expertId, 4, signal) : null, [expertId, tab === 'similar'])
  // у профиля из цепочки строки выдачи нет: процент и доводы берём из сверки с запросом
  const match = result ?? explanation.data?.expert
  const profile = expert.data
  const reading = parsed ?? explanation.data?.parsed

  const name = profile?.full_name ?? match?.full_name
  const position = profile?.position ?? match?.position
  const organization = profile?.organization ?? match?.organization
  const tabs: { id: Tab; label: string }[] = [
    ...(query ? [{ id: 'reasoning' as const, label: t.dialog.tabReasoning }] : []),
    { id: 'profile', label: t.dialog.tabProfile },
    { id: 'similar', label: t.dialog.tabSimilar },
  ]

  return (
    <article aria-labelledby={`expert-${expertId}`}>
      <header className="grid gap-x-5 gap-y-4 px-5 pb-4 pt-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-6">
        <div className="flex min-w-0 gap-4">
          {name && (
            <span className="hidden sm:block">
              <Avatar name={name} size="lg" />
            </span>
          )}
          <div className="min-w-0">
            {name ? (
              <h2 id={`expert-${expertId}`} className="mt-0.5 text-[26px] font-semibold leading-[1.1] tracking-[-0.01em] text-ink [overflow-wrap:anywhere]">
                {name}
              </h2>
            ) : (
              <Skeleton className="mt-2 h-8 w-3/4" />
            )}
            {position && (
              <p className="mt-1.5 text-[14px] text-ink-2">
                {position}
                {organization && ` · ${organization}`}
              </p>
            )}
            <p className="mt-3">
              <span className="text-[13px] font-medium text-ink-3">{label}</span>
            </p>
          </div>
        </div>
        {showScore && match && query && <Score percent={match.match_percent} size="hero" />}
      </header>

      {(profile || match) && (
        <dl className="flex flex-wrap gap-x-6 gap-y-2 border-y border-line bg-sunken px-5 py-2.5 text-sm sm:px-6">
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

      <div role="tablist" aria-label={t.dialog.label} className="sticky top-0 z-[1] flex gap-1 border-b border-line bg-surface px-3 sm:px-4">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-2.5 py-2.5 text-sm font-medium transition-colors ${
              tab === item.id ? 'border-ink text-ink' : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {expert.error && (
        <p role="alert" className="px-6 py-4 text-sm text-danger">
          {errorText(expert.error, t)}
        </p>
      )}

      {tab === 'reasoning' && query && (
        <div role="tabpanel" className="fade-in">
          {!match && <Skeleton className="m-6 h-32" />}
          {match && match.evidence.length > 0 && (
            <Section title={isWeak ? t.card.whatMatched : t.dialog.evidenceTitle}>
              <Evidence items={match.evidence} />
            </Section>
          )}
          {match && showScore && match.breakdown && match.evidence.length > 0 && (
            <Section title={t.dialog.scoreTitle(match.match_percent)}>
              <Breakdown breakdown={match.breakdown} percent={match.match_percent} />
            </Section>
          )}
          {match && (
            <Section title={t.dialog.conditions}>
              <Conditions match={match} reading={reading} constraints={explanation.data?.constraints} />
            </Section>
          )}
          {match?.alternative && (
            <div className="mx-5 mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-sunken px-3.5 py-2.5 text-sm sm:mx-6">
              <span className="text-ink-3">{t.dialog.altTitle}:</span>
              <span className="font-semibold text-ink">{match.alternative.full_name}</span>
              <span className="mono text-xs text-ink-3">{match.alternative.match_percent}%</span>
              {match.alternative.shared_terms.length > 0 && (
                <span className="text-ink-2">{t.dialog.altShared(match.alternative.shared_terms.join(', '))}</span>
              )}
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => onOpen(match.alternative!.id)}>
                {t.dialog.altOpen} <Icon name="arrow-right" size={15} />
              </Button>
            </div>
          )}
          <div className="border-t border-line px-5 py-4 sm:px-6">
            <FeedbackButtons query={query} expertId={expertId} />
          </div>
        </div>
      )}

      {tab === 'profile' && (
        <div role="tabpanel" className="fade-in px-5 py-5 sm:px-6">
          {expert.isLoading && <Skeleton className="h-14 w-full" />}
          {profile && (
            <>
              <ul className="flex flex-wrap gap-1.5">
                {profile.competencies.map((skill) => {
                  const isHit = match?.matched.some((item) => item.toLowerCase() === skill.toLowerCase())
                  const isNear = !isHit && match?.related.some((item) => item.toLowerCase() === skill.toLowerCase())
                  return (
                    <li
                      key={skill}
                      className={`rounded-md border px-2.5 py-1 text-[13px] ${
                        isHit
                          ? 'border-transparent bg-hover font-medium text-ink'
                          : isNear
                            ? 'border-dashed border-line-strong text-ink-2'
                            : 'border-transparent bg-sunken text-ink-3'
                      }`}
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
                    <a href={`mailto:${profile.email}`} className="font-medium text-brand-deep underline decoration-brand-soft underline-offset-2 hover:decoration-brand">
                      {profile.email}
                    </a>
                    <CopyButton text={profile.email} />
                  </>
                )}
              </p>
            </>
          )}
        </div>
      )}

      {tab === 'similar' && (
        <div role="tabpanel" className="fade-in px-5 py-5 sm:px-6">
          {similar.isLoading && <Skeleton className="h-16 w-full" />}
          {similar.error && <p className="text-sm text-danger">{errorText(similar.error, t)}</p>}
          <ul className="grid gap-2 sm:grid-cols-2">
            {similar.data?.map(({ expert: item, cosine }) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onOpen(item.id)}
                  className="group flex h-full w-full flex-col rounded-lg bg-sunken p-3 text-left transition-colors hover:bg-hover"
                >
                  <span className="font-semibold text-ink">{item.full_name}</span>
                  <span className="text-[13px] text-ink-2">
                    {item.position}, {item.city}
                  </span>
                  <span className="mono mt-2 flex items-center gap-2 text-[11px] text-ink-2">
                    <span aria-hidden className="h-1 w-12 overflow-hidden rounded-full bg-line">
                      <span className="block h-full bg-brand" style={{ width: `${Math.round(cosine * 100)}%` }} />
                    </span>
                    {t.dialog.similarity(Math.round(cosine * 100))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="px-5 pb-1 pt-4 sm:px-6">
      <h3 className="label mb-2.5 flex items-center gap-3 text-ink-3">
        {title}
        <span aria-hidden className="h-px flex-1 bg-line" />
      </h3>
      <div className="pb-3">{children}</div>
    </section>
  )
}

/** Каждый термин запроса и чем профиль его подтверждает: дословно, по смыслу (с косинусом) или ничем. */
function Evidence({ items }: { items: TermEvidence[] }) {
  const { t, lang } = useI18n()
  const num = (value: number) => value.toLocaleString(lang === 'en' ? 'en' : 'ru', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (
    <ul className="divide-y divide-dashed divide-line">
      {items.map((item) => (
        <li key={item.term} className="grid grid-cols-[minmax(0,auto)_16px_minmax(0,1fr)] items-center gap-x-2.5 py-2 text-[15px] sm:grid-cols-[minmax(0,10rem)_16px_minmax(0,1fr)_auto]">
          <span className={`justify-self-start truncate text-[14px] font-medium ${item.kind === 'missing' ? 'text-danger' : 'text-ink'}`}>
            {item.term}
          </span>
          <Icon name="arrow-right" size={15} className="text-ink-3" />
          <span className={`min-w-0 ${item.kind === 'missing' ? 'text-ink-3' : 'text-ink-2'}`}>
            {item.kind === 'missing' ? t.dialog.missingTerm : (item.source ?? t.dialog.inBio)}
          </span>
          <span
            className={`mono col-start-3 justify-self-start whitespace-nowrap text-[11px] sm:col-start-auto sm:justify-self-end ${
              item.kind === 'exact' ? 'text-ink-2' : item.kind === 'semantic' ? 'text-ink-3' : 'text-danger'
            }`}
          >
            {item.kind === 'exact' && (
              <span className="inline-flex items-center gap-1">
                <Icon name="check" size={13} strokeWidth={2.6} />
                {t.dialog.exact}
              </span>
            )}
            {item.kind === 'semantic' && `≈ ${t.dialog.semantic(num(item.similarity ?? 0))}`}
            {item.kind === 'missing' && (
              <span className="inline-flex items-center gap-1">
                <Icon name="x" size={13} strokeWidth={2.6} />
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Процент по шагам: смысл и покрытие с весами, затем множители. Те же числа, что считает сервер. */
function Breakdown({ breakdown, percent }: { breakdown: ScoreBreakdown; percent: number }) {
  const { t, lang } = useI18n()
  const num = (value: number, digits = 2) => value.toLocaleString(lang === 'en' ? 'en' : 'ru', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  const meaning = 100 * breakdown.w_semantic * breakdown.semantic
  const coverage = 100 * breakdown.w_coverage * breakdown.coverage
  const base = meaning + coverage
  return (
    <div>
      <div aria-hidden className="relative flex h-2.5 overflow-hidden rounded-full bg-line">
        <span className="h-full bg-brand" style={{ width: `${meaning}%` }} />
        <span className="h-full bg-brand-soft" style={{ width: `${coverage}%` }} />
      </div>
      <p className="mono mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-sm bg-brand" />
          {Math.round(breakdown.w_semantic * 100)}% × {num(breakdown.semantic)} {t.dialog.meaning}
        </span>
        <span className="text-ink-3">+</span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-sm bg-brand-soft" />
          {Math.round(breakdown.w_coverage * 100)}% × {num(breakdown.coverage)} {t.dialog.coverage}
        </span>
        <span className="text-ink-3">=</span>
        <b className="font-medium text-ink">{num(base, 0)}</b>
        {breakdown.factors.map((factor) => (
          <span key={factor.kind} className={`inline-flex items-center gap-1 ${factor.value >= 1 ? 'text-place' : 'text-cond'}`}>
            × {num(factor.value, 1)} {t.dialog.factors[factor.kind]}
          </span>
        ))}
        <span className="text-ink-3">→</span>
        <b className="font-medium text-brand-deep">{percent}%</b>
        {breakdown.capped && <span className="text-ink-3">({t.dialog.capped})</span>}
      </p>
    </div>
  )
}

/**
 * Условия запроса и статус: город, отрасль и опыт показываются, только если о них спрашивали.
 * Если сервер нашёл ограничение по этому полю (другой город, мало опыта, занят), строка становится предупреждением.
 */
function Conditions({ match, reading, constraints }: { match: SearchResult; reading?: ParsedQuery; constraints?: string[] }) {
  const { t } = useI18n()
  const rows = match.reasons
    .map((reason) => ({ reason, source: reasonSource(reason, match, t) }))
    .filter(({ source }) => source !== null && source !== t.card.skills && isAsked(source, reading, t))
  const limitFor = (source: string | null): string | undefined => {
    const values: Record<string, string> = {
      [t.card.city]: match.city,
      [t.card.industry]: match.industry,
      [t.card.experience]: String(match.experience_years),
    }
    if (source === t.card.status) return match.availability === 'available' ? undefined : constraints?.at(-1)
    const value = source ? values[source] : undefined
    // целым словом: отрасль «IT» не должна находиться внутри «city» в ограничении про город
    return value ? constraints?.find((item) => mentions(item, value)) : undefined
  }
  return (
    <ul className="grid gap-1.5">
      {rows.map(({ reason, source }) => {
        const limit = limitFor(source)
        return (
          <li key={reason} className="flex items-start justify-between gap-4 text-[15px]">
            <span className={`flex items-start gap-2 ${limit ? 'text-cond' : 'text-ink'}`}>
              <Icon name={limit ? 'info' : 'check'} size={16} strokeWidth={2.4} className={`mt-0.5 ${limit ? 'text-cond' : 'text-free'}`} />
              {limit ?? reason}
            </span>
            {source && <span className="mt-0.5 whitespace-nowrap text-xs font-semibold text-ink-3">{source}</span>}
          </li>
        )
      })}
    </ul>
  )
}

/** Есть ли значение в тексте целым словом (без учёта регистра): «IT» не находится внутри «city». */
function mentions(text: string, value: string): boolean {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, 'iu').test(text)
}

/** Поле профиля, из которого взята причина: навыки, город, отрасль, стаж или статус. */
function reasonSource(reason: string, match: SearchResult, t: Dict): string | null {
  if ([...match.matched, ...match.related].some((skill) => mentions(reason, skill))) return t.card.skills
  if (mentions(reason, match.position)) return t.card.skills
  if (mentions(reason, match.city)) return t.card.city
  if (mentions(reason, match.industry)) return t.card.industry
  if (mentions(reason, String(match.experience_years))) return t.card.experience
  const lower = reason.toLowerCase()
  if (Object.values(t.status).some((word) => lower.includes(word.toLowerCase().split(' ')[0]))) return t.card.status
  return null
}

/** Город, отрасль и опыт считаются условием, только если о них спрашивали; статус показывается всегда. */
function isAsked(source: string | null, reading: ParsedQuery | undefined, t: Dict): boolean {
  if (!reading) return true
  if (source === t.card.city) return Boolean(reading.city)
  if (source === t.card.industry) return Boolean(reading.industry)
  if (source === t.card.experience) return reading.min_experience !== null
  return true
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
      className="ml-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-ink-3 hover:bg-hover hover:text-ink"
    >
      <Icon name={isCopied ? 'check' : 'copy'} size={13} />
      <span aria-live="polite">{isCopied ? t.copied : t.copy}</span>
    </button>
  )
}
