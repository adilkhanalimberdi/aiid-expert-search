import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ErrorBox } from '../components/ErrorBox'
import { ExpertPane, ExpertPaneSkeleton } from '../components/ExpertPane'
import { Formula } from '../components/Formula'
import { SarapMark } from '../components/Logo'
import { Readback } from '../components/Readback'
import { ResultList, ResultListSkeleton } from '../components/ResultList'
import { CONTAINER } from '../components/Shell'
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
    <div className={CONTAINER}>
      {/* крупный заголовок только до первого поиска: потом место отдаётся выдаче */}
      {isIdle ? (
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 pb-5 pt-7 lg:pt-10">
          <div className="min-w-0">
            <h1 className="text-[26px] font-bold leading-tight tracking-[-0.025em] sm:text-[32px]">{t.search.h1}</h1>
            <p className="mt-1.5 max-w-[60ch] text-[15px] text-ink-2">{t.search.sub}</p>
          </div>
          {catalog.data && industries.data && (
            <p className="tnum flex gap-5 text-sm text-ink-3">
              <span>
                <b className="text-base font-bold text-ink">{catalog.data.experts}</b> {t.search.expertsWord(catalog.data.experts)}
              </span>
              <span>
                <b className="text-base font-bold text-ink">{industries.data.length}</b> {t.search.industriesWord(industries.data.length)}
              </span>
            </p>
          )}
        </div>
  
      ) : (
        <h1 className="sr-only">{t.search.h1}</h1>
      )}
      <form onSubmit={submit} role="search" aria-label={t.search.queryLabel} className={`${isIdle ? '' : 'mt-6'} rounded-2xl border border-line bg-surface shadow-[var(--shadow-panel)] focus-within:border-brand-soft focus-within:shadow-[0_0_0_4px_var(--color-brand-tint)]`}>
        <div className="flex items-end gap-2 p-2 pl-4 sm:pl-5">
          <label htmlFor="query" className="sr-only">
            {t.search.queryLabel}
          </label>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="mb-[15px] hidden flex-none text-ink-3 sm:block">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4.5 4.5" />
          </svg>
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
            className="min-h-12 flex-1 resize-none self-center bg-transparent py-3 text-[17px] leading-snug text-ink outline-none [field-sizing:content] placeholder:text-ink-3 sm:text-lg"
          />
          <Button type="submit" variant="primary" size="lg" className="flex-none !rounded-xl">
            <span className="hidden sm:inline">{t.search.submit}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
            <span className="sr-only sm:hidden">{t.search.submit}</span>
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-line px-4 py-2 sm:px-5">
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
          <p id="query-hint" className="text-sm font-medium text-danger" aria-live="polite">
            {emptyHint && t.search.emptyQuery}
          </p>
        </div>
      </form>

      {!isIdle && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
          <span className="text-ink-3">{t.search.tryLabel}</span>
          {t.search.examples.slice(0, 3).map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => applyExample(example)}
              className="max-w-full truncate rounded-full border border-line bg-surface px-3 py-1 font-medium text-ink-2 transition-colors hover:border-brand-soft hover:text-brand-deep"
            >
              {example}
            </button>
          ))}
        </div>
      )}

      <div className="pb-6 pt-6" aria-live="polite" aria-busy={state.status === 'loading'}>
        {isIdle && <Welcome recent={recent} onPick={applyExample} />}

        {state.status === 'loading' && (
          <div role="status" aria-label={t.search.searching}>
            <p className="mb-3 flex items-center gap-2.5 text-sm font-semibold text-ink-2">
              <SarapMark size={20} isDrawing />
              {t.search.searching}
            </p>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
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

const HOW_ICONS: ReactNode[] = [
  <path key="a" d="M4 6h16M4 12h10M4 18h7" />,
  <path key="b" d="M3 12s3.5-6.5 9-6.5S21 12 21 12s-3.5 6.5-9 6.5S3 12 3 12zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />,
  <path key="c" d="M5 12.5l4.5 4.5L19 7.5" />,
]

/** Пустое состояние: примеры запросов сеткой и три коротких пункта о том, как работает поиск. */
function Welcome({ recent, onPick }: { recent: string[]; onPick: (query: string) => void }) {
  const { t } = useI18n()
  return (
    <div className="fade-in space-y-8">
      <section aria-labelledby="examples-title">
        <h2 id="examples-title" className="text-sm font-semibold text-ink-2">
          {t.search.tryLabel}
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {t.search.examples.map((example) => (
            <li key={example}>
              <button
                type="button"
                onClick={() => onPick(example)}
                className="group flex h-full w-full items-center justify-between gap-4 rounded-xl border border-line bg-surface px-4 py-3.5 text-left shadow-[var(--shadow-panel)] transition-[border-color,transform] hover:-translate-y-px hover:border-brand-soft"
              >
                <span className="text-[15px] font-medium text-ink">{example}</span>
                <span aria-hidden className="grid size-8 flex-none place-items-center rounded-full bg-sunken text-ink-3 transition-colors group-hover:bg-brand group-hover:text-white">
                  →
                </span>
              </button>
            </li>
          ))}
        </ul>
        {recent.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-ink-2">{t.search.recent}</span>
            {recent.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onPick(item)}
                className="max-w-full truncate rounded-full border border-line bg-surface px-3 py-1 font-medium text-ink-2 hover:border-brand-soft hover:text-brand-deep"
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </section>

      <ul className="grid gap-4 md:grid-cols-3">
        {t.search.how.map((item, index) => (
          <li key={item.title} className="flex gap-4 rounded-xl border border-line bg-surface p-5">
            <span className="grid size-10 flex-none place-items-center rounded-lg bg-brand-tint text-brand-deep">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {HOW_ICONS[index]}
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-ink">{item.title}</span>
              <span className="mt-1 block text-sm leading-relaxed text-ink-2">{item.body}</span>
            </span>
          </li>
        ))}
      </ul>

      <Formula />
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
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="min-w-0 space-y-4">
              {view === 'team' ? (
                <TeamView query={submitted.query} industry={submitted.industry} hideBusy={submitted.hideBusy} onOpen={open} />
              ) : (
                <ResultList results={results} selectedId={selectedId} onSelect={open} isWeak={data.weak_match} showScore={showScore} />
              )}
              <Formula />
            </div>
            {isDesktop && (
              <Panel className="sticky top-[124px] max-h-[calc(100vh-140px)] overflow-y-auto" aria-label={t.dialog.label}>
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
function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
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
