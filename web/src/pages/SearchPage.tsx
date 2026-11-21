import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { ErrorBox } from '../components/ErrorBox'
import { ExpertPane, ExpertPaneSkeleton } from '../components/ExpertPane'
import { Formula } from '../components/Formula'
import { Icon } from '../components/Icon'
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
import { EXAMPLE_QUERIES, type AnatomyKind, type ExampleHint } from '../lib/i18n'
import { useI18n } from '../lib/useI18n'

const TOP_K = 8

interface SubmittedSearch {
  query: string
  industry: string | null
  hideBusy: boolean
}

type View = 'candidates' | 'team'

export function SearchPage({ catalogVersion }: { catalogVersion: number }) {
  const { t, lang } = useI18n()
  const [query, setQuery] = useState('')
  const [industry, setIndustry] = useState('')
  const [hideBusy, setHideBusy] = useState(false)
  const [submitted, setSubmitted] = useState<SubmittedSearch | null>(null)
  const [emptyHint, setEmptyHint] = useState(false)
  const industries = useAsync((signal) => api.industries(signal), [catalogVersion])
  const { state, run, reset } = useSearch()
  const { recent, remember } = useRecentQueries()
  const previousLang = useRef(lang)

  function start(next: SubmittedSearch) {
    setSubmitted(next)
    remember(next.query)
    run({ query: next.query, industry: next.industry, hide_busy: next.hideBusy, top_k: TOP_K })
  }

  // Обоснования приходят с сервера на языке интерфейса: при смене языка перезапрашиваем текущий поиск
  // (useSearch отменяет запрос на старом языке, если он ещё летит)
  useEffect(() => {
    if (previousLang.current === lang) return
    previousLang.current = lang
    if (submitted) run({ query: submitted.query, industry: submitted.industry, hide_busy: submitted.hideBusy, top_k: TOP_K })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  function submit(text: string) {
    const trimmed = text.trim()
    setEmptyHint(!trimmed)
    if (trimmed) {
      setQuery(trimmed)
      start({ query: trimmed, industry: industry || null, hideBusy })
    }
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
    document.getElementById('query')?.focus()
  }

  const queryCard = (
    <QueryCard
      query={query}
      onQuery={(value) => {
        setQuery(value)
        if (value) setEmptyHint(false)
      }}
      onSubmit={submit}
      recent={recent}
      emptyHint={emptyHint}
      filters={
        <>
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
        </>
      }
    />
  )

  return (
    <div className={CONTAINER}>
      <h1 className="sr-only">{t.search.h1}</h1>
      {isIdle ? (
        <div className="fade-in mx-auto max-w-[960px] space-y-5 pb-6 pt-10 lg:pt-16">
          {queryCard}
          <Anatomy />
          <Formula />
        </div>
      ) : (
        <div className="pt-5">{queryCard}</div>
      )}

      <div className="pb-6 pt-5" aria-live="polite" aria-busy={state.status === 'loading'}>
        {state.status === 'loading' && (
          <div role="status" aria-label={t.search.searching} className="fade-in space-y-5">
            <p className="flex items-center gap-2.5 text-sm font-medium text-ink-2">
              <SarapMark size={18} isScanning />
              {t.search.searching}
            </p>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
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

/** Язык недавнего запроса по буквам: казахские буквы, кириллица или латиница. */
function languageOf(text: string): 'KK' | 'RU' | 'EN' {
  if (/[әғқңөұүһі]/i.test(text)) return 'KK'
  if (/[а-яё]/i.test(text)) return 'RU'
  return 'EN'
}

interface PaletteOption {
  id: string
  query: string
  group: 'recent' | 'examples'
  lang: string
  hint?: ExampleHint
}

interface QueryCardProps {
  query: string
  onQuery: (value: string) => void
  onSubmit: (value: string) => void
  recent: string[]
  emptyHint: boolean
  filters: ReactNode
}

/**
 * Карточка запроса: поле, кнопка, фильтры. Под полем при фокусе или по кнопке «Примеры» выпадает
 * компактный список примеров и недавних запросов (combobox + listbox): у примера то, что он показывает,
 * и язык. Стрелки выбирают, Enter ищет, Esc закрывает.
 */
function QueryCard({ query, onQuery, onSubmit, recent, emptyHint, filters }: QueryCardProps) {
  const { t } = useI18n()
  const listId = useId()
  const [isFocused, setIsFocused] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [active, setActive] = useState(-1)
  const input = useRef<HTMLInputElement>(null)

  const options = useMemo<PaletteOption[]>(() => {
    const needle = query.trim().toLowerCase()
    const fits = (text: string) => !needle || (text.toLowerCase().includes(needle) && text.toLowerCase() !== needle)
    const examples = new Set(EXAMPLE_QUERIES.map((item) => item.query))
    return [
      ...recent.filter((item) => !examples.has(item) && fits(item)).slice(0, 4).map((item, index) => ({ id: `recent-${index}`, query: item, group: 'recent' as const, lang: languageOf(item) })),
      ...EXAMPLE_QUERIES.filter((item) => fits(item.query)).map((item, index) => ({ id: `example-${index}`, query: item.query, group: 'examples' as const, lang: item.lang, hint: item.hint })),
    ]
  }, [query, recent])

  const isOpen = options.length > 0 && !isDismissed && isFocused
  const activeOption = isOpen && active >= 0 ? options[active] : undefined

  function pick(option: PaletteOption) {
    onQuery(option.query)
    setActive(-1)
    setIsDismissed(true)
    onSubmit(option.query)
    input.current?.blur()
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setIsDismissed(false)
      if (options.length === 0) return
      const count = options.length
      const isDown = event.key === 'ArrowDown'
      setActive((current) => (isDown ? (current + 1) % count : current <= 0 ? count - 1 : current - 1))
      return
    }
    if (event.key === 'Escape') {
      if (isOpen) {
        event.preventDefault()
        setIsDismissed(true)
        setActive(-1)
      } else if (query) {
        onQuery('')
      }
      return
    }
    if (event.key === 'Enter' && activeOption) {
      event.preventDefault()
      pick(activeOption)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    setIsDismissed(true)
    setActive(-1)
    onSubmit(query)
    if (!query.trim()) input.current?.focus()
  }

  const groups = (['recent', 'examples'] as const)
    .map((group) => ({ group, items: options.filter((item) => item.group === group) }))
    .filter((entry) => entry.items.length > 0)

  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label={t.search.queryLabel}
      className="relative rounded-2xl border border-line bg-surface transition-colors focus-within:border-line-strong"
    >
      <div id="query-anchor" className="flex items-center gap-2 p-2 pl-4">
        <Icon name="search" size={19} className="hidden text-ink-3 sm:block" />
        <label htmlFor="query" className="sr-only">
          {t.search.queryLabel}
        </label>
        <input
          ref={input}
          id="query"
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeOption ? `${listId}-${activeOption.id}` : undefined}
          aria-describedby="query-hint"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          value={query}
          maxLength={500}
          placeholder={t.search.placeholder}
          onChange={(event) => {
            onQuery(event.target.value)
            setIsDismissed(false)
            setActive(-1)
          }}
          onFocus={() => {
            setIsFocused(true)
            setIsDismissed(false)
          }}
          onBlur={() => {
            setIsFocused(false)
            setActive(-1)
          }}
          onKeyDown={onKeyDown}
          className="h-12 min-w-0 flex-1 bg-transparent text-[17px] text-ink outline-none placeholder:text-ink-3"
        />
        {!query && !isOpen && (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setIsDismissed(false)
              input.current?.focus()
            }}
            className="hidden h-9 flex-none items-center gap-1.5 rounded-md px-2.5 text-[13px] text-ink-3 hover:bg-hover hover:text-ink sm:flex"
          >
            {t.search.palette.examples}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        )}
        {query && (
          <button
            type="button"
            onClick={() => {
              onQuery('')
              setIsDismissed(false)
              input.current?.focus()
            }}
            aria-label={t.search.clear}
            title={t.search.clear}
            className="grid size-9 flex-none place-items-center rounded-md text-ink-3 hover:bg-hover hover:text-ink"
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

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-line px-4 py-1.5">
        {filters}
        <p id="query-hint" className="text-sm font-medium text-danger" aria-live="polite">
          {emptyHint && t.search.emptyQuery}
        </p>
      </div>

      {/* listbox всегда в DOM: aria-controls указывает на существующий элемент; закрытый скрыт */}
      <div
        className={
          isOpen
            ? 'absolute inset-x-0 top-[calc(100%+6px)] z-20 max-h-[min(55vh,360px)] overflow-y-auto rounded-xl border border-line bg-raised py-1 shadow-[0_16px_40px_-12px_rgb(0_0_0/0.75)]'
            : 'hidden'
        }
      >
        <div id={listId} role="listbox" aria-label={t.search.palette.label}>
          {groups.map(({ group, items }) => (
            <div key={group} role="group" aria-labelledby={`${listId}-${group}`}>
              <p id={`${listId}-${group}`} className="px-4 pb-1 pt-2.5 text-[12px] text-ink-3">
                {group === 'recent' ? t.search.palette.recent : t.search.palette.examples}
              </p>
              {items.map((option) => {
                const index = options.indexOf(option)
                const isActive = index === active
                return (
                  <div
                    key={option.id}
                    id={`${listId}-${option.id}`}
                    role="option"
                    aria-selected={isActive}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => pick(option)}
                    className={`mx-1 flex items-center gap-3 rounded-md px-3 py-1.5 ${isActive ? 'bg-hover' : ''}`}
                  >
                    <span className={`min-w-0 flex-1 truncate text-[14px] ${isActive ? 'text-ink' : 'text-ink-2'}`}>{option.query}</span>
                    <span className="flex-none text-[12px] text-ink-3">
                      {option.hint ? `${t.search.hints[option.hint]} · ` : ''}
                      {option.lang}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </form>
  )
}

const ANATOMY_TONE: Record<AnatomyKind, string> = {
  skill: 'text-ink decoration-brand',
  place: 'text-ink decoration-place',
  condition: 'text-ink decoration-cond',
  excluded: 'text-ink-3 line-through decoration-danger',
}

/**
 * Наглядный разбор: одна фраза, в которой навыки, город, условие и исключение подсвечены и подписаны,
 * и три коротких пункта о том, как работает поиск. Иллюстрация того, что потом показывает строка «Понято:».
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
    <section aria-labelledby="anatomy-title" className="rounded-2xl bg-surface">
      <div className="px-5 pb-6 pt-5 sm:px-7">
        <h2 id="anatomy-title" className="label text-ink-3">
          {t.search.anatomyTitle}
        </h2>
        <p className="mt-3 text-[20px] font-light leading-[2.6] text-ink-3 sm:text-[25px]">
          {t.search.anatomy.map(([text, kind], index) =>
            kind ? (
              <span key={index} className="relative inline-block whitespace-nowrap">
                <span className={`font-normal underline decoration-2 underline-offset-[7px] ${ANATOMY_TONE[kind]}`}>{text}</span>
                <span className="absolute left-0 top-full -mt-2 whitespace-nowrap text-[11px] leading-none text-ink-3">{label[kind]}</span>
              </span>
            ) : (
              <span key={index}>{text}</span>
            ),
          )}
        </p>
      </div>
      <ol className="grid border-t border-line md:grid-cols-3">
        {t.search.how.map((item) => (
          <li key={item.title} className="min-w-0 border-line px-5 py-4 max-md:border-t max-md:first:border-t-0 sm:px-7 md:border-l md:first:border-l-0">
            <span className="block text-[14px] font-semibold text-ink">{item.title}</span>
            <span className="mt-1 block text-[13px] leading-relaxed text-ink-3">{item.body}</span>
          </li>
        ))}
      </ol>
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
      <div className="mb-4">
        <Readback parsed={data.parsed} count={results.length} tookMs={data.took_ms}>
          <Button variant="quiet" size="sm" onClick={onReset}>
            <Icon name="reset" size={16} />
            {t.search.newSearch}
          </Button>
        </Readback>
      </div>

      {data.weak_match && <Notice tone="weak">{t.search.weak}</Notice>}
      {data.filter_only && <Notice tone="info">{t.search.filterOnly([data.parsed.city, data.parsed.industry].filter(Boolean).join(', '))}</Notice>}

      {results.length === 0 ? (
        <Panel className="p-8 text-center">
          <p className="mx-auto max-w-[48ch] text-[15px] text-ink-2">{t.search.nobody}</p>
        </Panel>
      ) : (
        <>
          {!data.weak_match && !data.filter_only && (
            <div className="mb-4">
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
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="min-w-0 space-y-4">
              {view === 'team' ? (
                <TeamView query={submitted.query} industry={submitted.industry} hideBusy={submitted.hideBusy} onOpen={open} />
              ) : (
                <ResultList results={results} selectedId={selectedId} onSelect={open} isWeak={data.weak_match} showScore={showScore} />
              )}
            </div>
            {isDesktop && (
              <Panel className="sticky top-[72px] max-h-[calc(100vh-112px)] overflow-y-auto" aria-label={t.dialog.label}>
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
        tone === 'weak' ? 'border-transparent bg-cond-tint text-cond' : 'border-transparent bg-place-tint text-place'
      }`}
    >
      <Icon name="info" size={18} className="mt-0.5" />
      <span>{children}</span>
    </p>
  )
}

/**
 * Профиль на телефоне: окно поверх выдачи, Esc и «К списку» закрывают, фокус возвращается.
 * Строка состояния с пометкой о данных лежит выше окна (z-50), поэтому видна и здесь.
 */
function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const { t } = useI18n()
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const onKey = (event: globalThis.KeyboardEvent) => event.key === 'Escape' && onClose()
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
    <div className="fixed inset-0 z-40 bg-ground/70" onClick={onClose}>
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label={t.dialog.label}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="sheet-in absolute inset-x-0 bottom-0 top-3 overflow-y-auto rounded-t-2xl border-t border-line-strong bg-surface pb-14 outline-none"
      >
        {children}
      </div>
    </div>
  )
}
