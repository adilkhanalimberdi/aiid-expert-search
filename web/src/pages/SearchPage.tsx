import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ErrorBox } from '../components/ErrorBox'
import { ExpertPane, ExpertPaneSkeleton } from '../components/ExpertPane'
import { Formula } from '../components/Formula'
import { SarapMark } from '../components/Logo'
import { Readback } from '../components/Readback'
import { RECOMMENDED, ResultList, ResultListSkeleton, TopCards } from '../components/ResultList'
import { Icon } from '../components/Icon'
import { CONTAINER } from '../components/Shell'
import { TeamView } from '../components/TeamView'
import { Button, Checkbox, Panel, Segmented, Select } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useRecentQueries } from '../hooks/useRecentQueries'
import { useSearch } from '../hooks/useSearch'
import { api, type SearchResponse } from '../lib/api'
import type { AnatomyKind } from '../lib/i18n'
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
  const { state, run, reset } = useSearch()
  const { recent, remember } = useRecentQueries()
  const previousLang = useRef(lang)
  const input = useRef<HTMLTextAreaElement>(null)

  function start(next: SubmittedSearch) {
    setSubmitted(next)
    remember(next.query)
    run({ query: next.query, industry: next.industry, hide_busy: next.hideBusy, top_k: TOP_K })
  }

  // «/» с любого места страницы ставит курсор в поле запроса, как в привычных поисковиках
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (event.key !== '/' || event.metaKey || event.ctrlKey || target.closest('input, textarea, select, [contenteditable]')) return
      event.preventDefault()
      input.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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

  // «Новый поиск»: пустое поле, стартовый экран и фокус в поле; фильтры остаются, их видно в карточке запроса
  function startOver() {
    setQuery('')
    setSubmitted(null)
    setEmptyHint(false)
    reset()
    input.current?.focus()
  }

  return (
    <div className={CONTAINER}>
      {/* крупный заголовок только до первого поиска: потом место отдаётся выдаче */}
      {isIdle ? (
        <div className="grid gap-x-10 gap-y-4 pb-6 pt-9 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:pt-14">
          <div className="min-w-0">
            <h1 className="serif max-w-[18ch] text-[38px] font-semibold leading-[1.05] tracking-[-0.02em] text-ink sm:text-[52px]">{t.search.h1}</h1>
            <p className="mt-3 max-w-[56ch] text-pretty text-base text-ink-2">{t.search.sub}</p>
          </div>
          {catalog.data && industries.data && (
            <dl className="flex gap-8 border-l-2 border-action pl-5">
              <div>
                <dd className="mono text-[28px] font-medium leading-none text-ink">{catalog.data.experts}</dd>
                <dt className="mt-1.5 text-[13px] text-ink-3">{t.search.expertsWord(catalog.data.experts)}</dt>
              </div>
              <div>
                <dd className="mono text-[28px] font-medium leading-none text-ink">{industries.data.length}</dd>
                <dt className="mt-1.5 text-[13px] text-ink-3">{t.search.industriesWord(industries.data.length)}</dt>
              </div>
            </dl>
          )}
        </div>
      ) : (
        <h1 className="sr-only">{t.search.h1}</h1>
      )}
      <form onSubmit={submit} role="search" aria-label={t.search.queryLabel} className={`${isIdle ? '' : 'mt-6'} rounded-2xl border border-line-strong bg-surface transition-[border-color,box-shadow] focus-within:border-brand focus-within:shadow-[0_0_0_4px_var(--color-brand-tint)]`}>
        <div className="flex items-end gap-2 p-2 pl-4 sm:pl-5">
          <label htmlFor="query" className="sr-only">
            {t.search.queryLabel}
          </label>
          <Icon name="search" size={20} className="mb-[15px] hidden text-ink-3 sm:block" />
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
          {!query && (
            <span aria-hidden className="mb-[15px] hidden items-center gap-1.5 text-xs text-ink-3 lg:flex">
              <kbd>/</kbd>
              {t.focusHint}
            </span>
          )}
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                input.current?.focus()
              }}
              aria-label={t.search.clear}
              title={t.search.clear}
              className="mb-1.5 grid size-9 flex-none place-items-center rounded-lg text-ink-3 hover:bg-hover hover:text-brand-deep"
            >
              <Icon name="x" size={18} />
            </button>
          )}
          <Button type="submit" variant="primary" size="lg" className="flex-none !rounded-xl">
            <span className="hidden sm:inline">{t.search.submit}</span>
            <Icon name="arrow-right" strokeWidth={2.4} />
            <span className="sr-only sm:hidden">{t.search.submit}</span>
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-b-2xl border-t border-dashed border-line bg-sunken px-4 py-2 sm:px-5">
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
          <Results key={`${submitted.query}|${submitted.industry}|${submitted.hideBusy}`} data={state.data} submitted={submitted} onReset={startOver} />
        )}
      </div>
    </div>
  )
}

/** Язык примера по буквам: казахские буквы, кириллица или латиница. Показывает, что поиск понимает все три. */
function languageOf(text: string): string {
  if (/[әғқңөұүһі]/i.test(text)) return 'KK'
  if (/[а-яё]/i.test(text)) return 'RU'
  return 'EN'
}

/** Пустое состояние: примеры запросов карточками картотеки и три коротких пункта о том, как работает поиск. */
function Welcome({ recent, onPick }: { recent: string[]; onPick: (query: string) => void }) {
  const { t } = useI18n()
  return (
    <div className="fade-in space-y-10">
      <section aria-labelledby="examples-title">
        <h2 id="examples-title" className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          {t.search.tryLabel}
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {t.search.examples.map((example) => (
            <li key={example} className="min-w-0">
              <button
                type="button"
                onClick={() => onPick(example)}
                className="group flex h-full w-full items-start gap-3 rounded-xl border border-line bg-surface p-3.5 text-left transition-colors hover:border-brand-soft hover:bg-hover"
              >
                <span className="mono mt-0.5 flex-none rounded border border-line px-1.5 py-0.5 text-[11px] text-ink-3 group-hover:border-brand-soft group-hover:text-brand-deep">
                  {languageOf(example)}
                </span>
                <span className="min-w-0 flex-1 text-[15px] leading-snug text-ink">{example}</span>
                <Icon name="arrow-right" size={16} className="mt-0.5 text-line-strong transition-[transform,color] group-hover:translate-x-0.5 group-hover:text-brand" />
              </button>
            </li>
          ))}
        </ul>
        {recent.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="flex items-center gap-1.5 font-medium text-ink-3">
              <Icon name="clock" size={15} />
              {t.search.recent}
            </span>
            {recent.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onPick(item)}
                className="max-w-full truncate rounded-md px-2 py-1 font-medium text-ink-2 underline decoration-line-strong decoration-dashed underline-offset-4 hover:bg-hover hover:text-brand-deep hover:decoration-brand"
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </section>

      <Anatomy />

      <ol className="grid gap-x-10 gap-y-6 border-t border-line pt-7 md:grid-cols-3">
        {t.search.how.map((item, index) => (
          <li key={item.title} className="min-w-0">
            <span className="mono flex items-center gap-3 text-xs text-ink-3">
              <span className="text-action-ink">
                <span className="rounded bg-action px-1.5 py-0.5">{String(index + 1).padStart(2, '0')}</span>
              </span>
              <span aria-hidden className="h-px flex-1 bg-line" />
            </span>
            <span className="serif mt-3 block text-lg font-semibold text-ink">{item.title}</span>
            <span className="mt-1.5 block text-sm leading-relaxed text-ink-2">{item.body}</span>
          </li>
        ))}
      </ol>

      <Formula />
    </div>
  )
}

const ANATOMY_TONE: Record<AnatomyKind, string> = {
  skill: 'bg-brand-tint text-brand-deep decoration-brand',
  place: 'bg-place-tint text-place decoration-place',
  condition: 'bg-cond-tint text-cond decoration-cond',
  excluded: 'bg-danger-tint text-danger line-through decoration-danger',
}

/**
 * Наглядный разбор: одна фраза, в которой навыки, город, условие и исключение подсвечены и подписаны.
 * Это иллюстрация того, что потом показывает строка «Понято:», а не вызов движка.
 */
function Anatomy() {
  const { t } = useI18n()
  const label: Record<AnatomyKind, string> = {
    skill: t.readback.legendSkill,
    place: t.card.city,
    condition: t.readback.legendCondition,
    excluded: t.readback.legendExcluded,
  }
  return (
    <section aria-labelledby="anatomy-title" className="rounded-2xl border border-line bg-surface px-5 pb-6 pt-5 sm:px-8">
      <h2 id="anatomy-title" className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        {t.search.anatomyTitle}
      </h2>
      <p className="serif mt-4 text-[22px] leading-[2.6] text-ink sm:text-[28px]">
        {t.search.anatomy.map(([text, kind], index) =>
          kind ? (
            <span key={index} className="relative inline-block whitespace-nowrap">
              <span className={`rounded-md px-1.5 py-0.5 ${ANATOMY_TONE[kind]}`}>{text}</span>
              <span className="mono absolute left-1.5 top-full -mt-2 whitespace-nowrap text-[10px] uppercase leading-none tracking-[0.08em] text-ink-3">
                {label[kind]}
              </span>
            </span>
          ) : (
            <span key={index}>{text}</span>
          ),
        )}
      </p>
    </section>
  )
}

function Results({ data, submitted, onReset }: { data: SearchResponse; submitted: SubmittedSearch; onReset: () => void }) {
  const { t } = useI18n()
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [view, setView] = useState<View>('candidates')
  const [chosenId, setChosenId] = useState<string | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const results = data.results
  const showScore = !data.filter_only
  // слабое совпадение не выдаём за рекомендацию: тогда только список «Ближайшие профили»
  const showTopCards = !data.weak_match
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
      parsed={data.parsed}
      isWeak={data.weak_match}
      onClose={isDesktop ? undefined : () => setIsSheetOpen(false)}
    />
  )

  return (
    <div className="fade-in">
      <div className="mb-3">
        <Readback parsed={data.parsed} count={results.length} tookMs={data.took_ms}>
          <Button variant="quiet" size="sm" onClick={onReset}>
            <Icon name="reset" size={16} />
            {t.search.newSearch}
          </Button>
        </Readback>
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
            <div className="mb-4 flex items-center justify-between gap-3">
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
          {view === 'candidates' && showTopCards && (
            <div className="mb-6">
              <TopCards results={results} selectedId={selectedId} onSelect={open} showScore={showScore} />
            </div>
          )}
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="min-w-0 space-y-4">
              {view === 'team' ? (
                <TeamView query={submitted.query} industry={submitted.industry} hideBusy={submitted.hideBusy} onOpen={open} />
              ) : (
                (!showTopCards || results.length > RECOMMENDED) && (
                  <ResultList results={results} selectedId={selectedId} onSelect={open} isWeak={data.weak_match} showScore={showScore} hideTop={showTopCards} />
                )
              )}
              <Formula />
            </div>
            {isDesktop && (
              <Panel className="sticky top-[124px] max-h-[calc(100vh-140px)] overflow-y-auto border-line-strong" aria-label={t.dialog.label}>
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
    <div className="fixed inset-0 z-40 bg-night/50 backdrop-blur-[2px]" onClick={onClose}>
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
