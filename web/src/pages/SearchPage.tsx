import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ErrorBox } from '../components/ErrorBox'
import { ExpertPane, ExpertPaneSkeleton } from '../components/ExpertPane'
import { Formula } from '../components/Formula'
import { SarapMark } from '../components/Logo'
import { Readback } from '../components/Readback'
import { ResultList, ResultListSkeleton } from '../components/ResultList'
import { TeamView } from '../components/TeamView'
import { Button, Checkbox, Panel, Segmented, Select } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useRecentQueries } from '../hooks/useRecentQueries'
import { useSearch } from '../hooks/useSearch'
import { api, type SearchResponse } from '../lib/api'
import { useI18n } from '../lib/useI18n'

const TOP_K = 8

interface SubmittedSearch {
  query: string
  industry: string | null
  hideBusy: boolean
}

type View = 'candidates' | 'team'

export function SearchPage() {
  const { t, lang } = useI18n()
  const [query, setQuery] = useState('')
  const [industry, setIndustry] = useState('')
  const [hideBusy, setHideBusy] = useState(false)
  const [submitted, setSubmitted] = useState<SubmittedSearch | null>(null)
  const [emptyHint, setEmptyHint] = useState(false)
  const industries = useAsync(() => api.industries(), [])
  const catalog = useAsync(() => api.health(), [])
  const { state, run } = useSearch()
  const { recent, remember } = useRecentQueries()
  const previousLang = useRef(lang)
  const input = useRef<HTMLTextAreaElement>(null)

  function start(next: SubmittedSearch) {
    setSubmitted(next)
    remember(next.query)
    run({ query: next.query, industry: next.industry, hide_busy: next.hideBusy, top_k: TOP_K })
  }

  // Обоснования приходят с сервера на языке интерфейса: при смене языка перезапрашиваем текущий поиск
  useEffect(() => {
    if (previousLang.current === lang) return
    previousLang.current = lang
    if (submitted) run({ query: submitted.query, industry: submitted.industry, hide_busy: submitted.hideBusy, top_k: TOP_K })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = query.trim()
    setEmptyHint(!trimmed)
    if (trimmed) start({ query: trimmed, industry: industry || null, hideBusy })
    else input.current?.focus()
  }

  function applyExample(example: string) {
    setQuery(example)
    setEmptyHint(false)
    start({ query: example, industry: industry || null, hideBusy })
  }

  function changeFilters(nextIndustry: string, nextHideBusy: boolean) {
    setIndustry(nextIndustry)
    setHideBusy(nextHideBusy)
    if (submitted) start({ ...submitted, industry: nextIndustry || null, hideBusy: nextHideBusy })
  }

  const isIdle = state.status === 'idle'

  return (
    <div>
      <h1 className="sr-only">{t.search.h1}</h1>

      {/* строка запроса прилипает к верху: новый запрос можно задать из любой точки выдачи */}
      <div className="z-20 border-b border-line bg-ground/95 px-4 pb-3 pt-4 backdrop-blur sm:px-7 lg:sticky lg:top-0 lg:pt-5">
        <form onSubmit={submit} role="search" aria-label={t.search.queryLabel}>
          <div className="flex items-end gap-2 rounded-xl border border-line-strong bg-surface p-1.5 pl-4 shadow-[var(--shadow-panel)] focus-within:border-brand focus-within:shadow-[0_0_0_3px_var(--color-brand-tint)]">
            <label htmlFor="query" className="sr-only">
              {t.search.queryLabel}
            </label>
            {/* поле растёт по тексту; Enter ищет, Shift+Enter переносит строку */}
            <textarea
              ref={input}
              id="query"
              rows={1}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault()
                  event.currentTarget.form?.requestSubmit()
                }
              }}
              maxLength={500}
              placeholder={t.search.placeholder}
              aria-describedby="query-hint"
              className="min-h-11 flex-1 resize-none self-center bg-transparent py-2 text-[17px] font-medium leading-snug text-ink outline-none [field-sizing:content] placeholder:font-normal placeholder:text-ink-3 sm:text-lg"
            />
            <Button type="submit" variant="primary" size="lg" className="flex-none">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
                <circle cx="11" cy="11" r="6.5" />
                <path d="M16 16l4.5 4.5" />
              </svg>
              <span className="hidden sm:inline">{t.search.submit}</span>
              <span className="sr-only sm:hidden">{t.search.submit}</span>
            </Button>
          </div>
          <p id="query-hint" className="min-h-0 text-sm font-medium text-danger" aria-live="polite">
            {emptyHint && <span className="mt-2 block">{t.search.emptyQuery}</span>}
          </p>
        </form>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1">
          <label className="flex items-center gap-2 text-sm font-medium text-ink-2">
            {t.search.industry}
            <Select value={industry} onChange={(event) => changeFilters(event.target.value, hideBusy)}>
              <option value="">{t.search.anyIndustry}</option>
              {industries.data?.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </label>
          <Checkbox checked={hideBusy} onChange={(event) => changeFilters(industry, event.target.checked)} label={t.search.hideBusy} />
          {!isIdle && (
            <div className="hidden min-w-0 flex-1 items-center justify-end gap-x-3 text-sm text-ink-3 xl:flex">
              <span className="flex-none">{t.search.tryLabel}</span>
              {t.search.examples.slice(0, 3).map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => applyExample(example)}
                  className="truncate font-medium text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink hover:decoration-brand"
                >
                  {example}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-8 pt-4 sm:px-7" aria-live="polite" aria-busy={state.status === 'loading'}>
        {isIdle && (
          <Welcome
            experts={catalog.data?.experts}
            industriesCount={industries.data?.length}
            recent={recent}
            onPick={applyExample}
          />
        )}

        {state.status === 'loading' && (
          <div role="status" aria-label={t.search.searching}>
            <p className="mb-3 flex items-center gap-2.5 text-sm font-semibold text-ink-2">
              <SarapMark size={22} isDrawing />
              {t.search.searching}
            </p>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
              <ResultListSkeleton />
              <Panel className="hidden lg:block">
                <ExpertPaneSkeleton />
              </Panel>
            </div>
          </div>
        )}

        {state.status === 'error' && <ErrorBox message={state.message} onRetry={submitted ? () => start(submitted) : undefined} />}

        {state.status === 'done' && submitted && (
          <Results key={`${submitted.query}|${submitted.industry}|${submitted.hideBusy}`} data={state.data} submitted={submitted} />
        )}
      </div>
    </div>
  )
}

interface WelcomeProps {
  experts?: number
  industriesCount?: number
  recent: string[]
  onPick: (query: string) => void
}

/** Пустое состояние: что умеет поиск и с чего начать, без лендинговой шапки. */
function Welcome({ experts, industriesCount, recent, onPick }: WelcomeProps) {
  const { t } = useI18n()
  return (
    <div className="fade-in grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
      <Panel className="p-5 sm:p-7">
        <SarapMark size={40} />
        <h2 className="mt-5 text-[26px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[30px]">{t.search.h1}</h2>
        <p className="mt-2 max-w-[52ch] text-[15px] leading-relaxed text-ink-2">{t.search.sub}</p>
        {experts !== undefined && industriesCount !== undefined && (
          <p className="tnum mt-5 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-3">
            <span>
              <b className="text-lg font-extrabold text-ink">{experts}</b> {t.search.expertsWord(experts)}
            </span>
            <span>
              <b className="text-lg font-extrabold text-ink">{industriesCount}</b> {t.search.industriesWord(industriesCount)}
            </span>
          </p>
        )}
        <ul className="mt-6 space-y-3 border-t border-line pt-5">
          {t.search.how.map((item, index) => (
            <li key={item.title} className="flex gap-3.5">
              <span className="tnum grid size-7 flex-none place-items-center rounded-full bg-brand-tint text-xs font-extrabold text-brand-deep">{index + 1}</span>
              <span className="min-w-0">
                <span className="block text-[15px] font-bold text-ink">{item.title}</span>
                <span className="block text-sm leading-snug text-ink-2">{item.body}</span>
              </span>
            </li>
          ))}
        </ul>
        {recent.length > 0 && (
          <div className="mt-6 border-t border-line pt-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-ink-3">{t.search.recent}</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {recent.map((item) => (
                <li key={item} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onPick(item)}
                    className="max-w-full truncate rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-2 hover:border-brand-soft hover:text-ink"
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>
      {/* на телефоне примеры первыми: с них проще всего начать */}
      <Panel className="order-first p-5 sm:p-7 lg:order-none">
        <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-ink-3">{t.search.tryLabel}</h2>
        <ul className="mt-3 space-y-2">
          {t.search.examples.map((example, index) => (
            <li key={example}>
              <button
                type="button"
                onClick={() => onPick(example)}
                className="group flex w-full items-center gap-3 rounded-lg border border-line px-4 py-3 text-left transition-colors hover:border-brand-soft hover:bg-brand-tint/40"
              >
                <span className="tnum grid size-7 flex-none place-items-center rounded-md bg-sunken text-xs font-bold text-ink-3 group-hover:bg-brand group-hover:text-white">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 text-[15px] font-medium text-ink">{example}</span>
                <span aria-hidden className="text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-brand">
                  →
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-5">
          <Formula />
        </div>
      </Panel>
    </div>
  )
}

function Results({ data, submitted }: { data: SearchResponse; submitted: SubmittedSearch }) {
  const { t } = useI18n()
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [view, setView] = useState<View>('candidates')
  const [chosenId, setChosenId] = useState<string | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const results = data.results
  const showScore = !data.filter_only
  // по умолчанию открыт лучший; выбранный вне выдачи (участник команды) тоже допустим
  const selectedId = chosenId ?? results[0]?.id ?? null
  const selectedIndex = results.findIndex((item) => item.id === selectedId)
  const selected = selectedIndex >= 0 ? results[selectedIndex] : undefined

  function open(expertId: string) {
    setChosenId(expertId)
    if (!isDesktop) setIsSheetOpen(true)
  }

  function labelFor(): string {
    if (selectedIndex < 0) return t.card.profile
    if (data.weak_match) return t.card.closestOne
    if (selectedIndex === 0 && showScore) return t.card.best
    return t.card.rank(selectedIndex + 1)
  }

  const pane = selectedId && (
    <ExpertPane
      key={`${selectedId}-${data.took_ms}`}
      expertId={selectedId}
      result={selected}
      label={labelFor()}
      query={submitted.query}
      showScore={showScore && (selected !== undefined || data.parsed.terms.length > 0)}
      onClose={isDesktop ? undefined : () => setIsSheetOpen(false)}
    />
  )

  return (
    <div className="fade-in">
      <div className="mb-3">
        <Readback parsed={data.parsed} count={results.length} tookMs={data.took_ms} />
      </div>

      {data.weak_match && (
        <Notice tone="weak">{t.search.weak}</Notice>
      )}
      {data.filter_only && (
        <Notice tone="info">{t.search.filterOnly([data.parsed.city, data.parsed.industry].filter(Boolean).join(', '))}</Notice>
      )}

      {results.length === 0 ? (
        <Panel className="p-8 text-center">
          <p className="mx-auto max-w-[48ch] text-[15px] text-ink-2">{t.search.nobody}</p>
        </Panel>
      ) : (
        <>
          {!data.weak_match && !data.filter_only && (
            <div className="mb-3 flex items-center justify-between gap-3">
              <Segmented
                label={t.search.viewLabel}
                value={view}
                onChange={setView}
                options={[
                  { value: 'candidates', label: t.search.viewCandidates },
                  { value: 'team', label: t.search.viewTeam },
                ]}
              />
            </div>
          )}
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
            <div className="min-w-0 space-y-4">
              {view === 'team' ? (
                <TeamView query={submitted.query} industry={submitted.industry} hideBusy={submitted.hideBusy} onOpen={open} />
              ) : (
                <ResultList results={results} selectedId={selectedId} onSelect={open} isWeak={data.weak_match} showScore={showScore} />
              )}
              <Formula />
            </div>
            {isDesktop && (
              <Panel className="sticky top-[150px] max-h-[calc(100vh-170px)] overflow-y-auto" aria-label={t.dialog.label}>
                {pane}
              </Panel>
            )}
          </div>
        </>
      )}

      {!isDesktop && isSheetOpen && pane && <Sheet onClose={() => setIsSheetOpen(false)}>{pane}</Sheet>}
    </div>
  )
}

function Notice({ tone, children }: { tone: 'weak' | 'info'; children: string }) {
  return (
    <p
      role="status"
      className={`mb-4 flex items-start gap-3 rounded-xl border p-4 text-[15px] font-medium ${
        tone === 'weak' ? 'border-medium-bar/50 bg-cond-tint text-cond' : 'border-place/20 bg-place-tint text-place'
      }`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden className="mt-0.5 flex-none">
        <circle cx="12" cy="12" r="9.5" />
        <path d="M12 11v5.5M12 7.5v.01" />
      </svg>
      <span>{children}</span>
    </p>
  )
}

/** Профиль на телефоне: окно на весь экран поверх выдачи, Esc и «К списку» закрывают, фокус возвращается. */
function Sheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const { t } = useI18n()
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    box.current?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus()
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 bg-night/60" onClick={onClose}>
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label={t.dialog.label}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="sheet-in absolute inset-x-0 bottom-0 top-3 overflow-y-auto rounded-t-2xl bg-surface outline-none"
      >
        {children}
      </div>
    </div>
  )
}
