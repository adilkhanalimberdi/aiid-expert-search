import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ErrorBox } from '../components/ErrorBox'
import { AlsoFit, BestMatch, CandidateRow } from '../components/ExpertCards'
import { ExpertDialog } from '../components/ExpertDialog'
import { Formula } from '../components/Formula'
import { HeroBand } from '../components/HeroBand'
import { Readback } from '../components/Readback'
import { ResultsSkeleton } from '../components/Skeleton'
import { TeamPanel } from '../components/TeamPanel'
import { ArrowRight, Button, Checkbox, Select } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
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

export function SearchPage({ nav }: { nav: ReactNode }) {
  const { t, lang } = useI18n()
  const [query, setQuery] = useState('')
  const [industry, setIndustry] = useState('')
  const [hideBusy, setHideBusy] = useState(false)
  const [submitted, setSubmitted] = useState<SubmittedSearch | null>(null)
  const [emptyHint, setEmptyHint] = useState(false)
  const [isTeamOpen, setIsTeamOpen] = useState(false)
  const [openExpertId, setOpenExpertId] = useState<string | null>(null)
  const industries = useAsync(() => api.industries(), [])
  const catalog = useAsync(() => api.health(), [])
  const { state, run } = useSearch()
  const { recent, remember } = useRecentQueries()
  const previousLang = useRef(lang)

  function start(next: SubmittedSearch) {
    setSubmitted(next)
    remember(next.query)
    setIsTeamOpen(false)
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

  return (
    <>
      <HeroBand nav={nav}>
        <div className="pt-14 text-center sm:pt-[72px]">
          <h1 className="font-display text-[46px] font-light leading-none tracking-[-0.04em] text-balance sm:text-[96px]">
            {t.search.h1}
          </h1>
          <p className="mx-auto mt-6 max-w-[560px] text-lg leading-relaxed text-white/90">{t.search.sub}</p>
          {catalog.data && industries.data && (
            <p className="mt-3 text-sm text-white/80">
              {t.search.experts(catalog.data.experts)} · {t.search.industriesCount(industries.data.length)}
            </p>
          )}
        </div>

        <form onSubmit={submit} role="search" className="mx-auto mt-11 flex max-w-[920px] flex-col items-center gap-7">
          <div className="w-full shadow-[6px_6px_0_var(--color-ink)] sm:shadow-[10px_10px_0_var(--color-ink)]">
            <label htmlFor="query" className="sr-only">
              {t.search.queryLabel}
            </label>
            <input
              id="query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={500}
              placeholder={t.search.placeholder}
              className="h-[68px] w-full rounded-none bg-paper px-4 font-display text-lg font-light tracking-[-0.02em] text-ink outline-none placeholder:text-ash-deep focus:shadow-[inset_0_-6px_0_var(--color-lime)] sm:h-[88px] sm:px-8 sm:text-[30px]"
            />
          </div>
          <Button type="submit" variant="lime" size="lg" className="w-full sm:w-auto">
            {t.search.submit}
            <ArrowRight />
          </Button>
          <p className="-mt-3 min-h-5 text-sm text-lime" aria-live="polite">
            {emptyHint && t.search.emptyQuery}
          </p>
        </form>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-7 gap-y-1">
          <span className="text-sm text-white/80">{t.search.tryLabel}</span>
          {t.search.examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => applyExample(example)}
              className="min-h-11 cursor-pointer text-[15px] font-medium text-white underline decoration-[1.5px] underline-offset-[5px] hover:decoration-lime"
            >
              {example}
            </button>
          ))}
        </div>

        {recent.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1" aria-label={t.search.recent}>
            <span className="text-sm text-white/80">{t.search.recent}</span>
            {recent.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => applyExample(item)}
                className="min-h-11 cursor-pointer text-sm text-white/90 underline decoration-white/40 decoration-1 underline-offset-[5px] hover:decoration-lime"
              >
                {item}
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 pb-14">
          <label className="flex items-center gap-3.5 text-[15px] font-medium">
            {t.search.industry}
            <Select tone="dark" value={industry} onChange={(event) => changeFilters(event.target.value, hideBusy)}>
              <option value="">{t.search.anyIndustry}</option>
              {industries.data?.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </label>
          <Checkbox
            tone="dark"
            checked={hideBusy}
            onChange={(event) => changeFilters(industry, event.target.checked)}
            label={t.search.hideBusy}
          />
        </div>
      </HeroBand>

      <section className="mx-auto max-w-[1120px] px-4 pb-6 pt-16 sm:px-6" aria-live="polite">
        {state.status === 'idle' && (
          <p className="border-2 border-dashed border-rule p-10 text-center text-muted">{t.search.idle}</p>
        )}
        {state.status === 'loading' && <ResultsSkeleton />}
        {state.status === 'error' && (
          <ErrorBox message={state.message} onRetry={submitted ? () => start(submitted) : undefined} />
        )}
        {state.status === 'done' && submitted && (
          <Results
            data={state.data}
            submitted={submitted}
            isTeamOpen={isTeamOpen}
            onToggleTeam={() => setIsTeamOpen((value) => !value)}
            onOpen={setOpenExpertId}
          />
        )}
        <Formula />
      </section>

      {openExpertId && (
        <ExpertDialog expertId={openExpertId} query={submitted?.query ?? ''} onClose={() => setOpenExpertId(null)} />
      )}
    </>
  )
}

interface ResultsProps {
  data: SearchResponse
  submitted: SubmittedSearch
  isTeamOpen: boolean
  onToggleTeam: () => void
  onOpen: (expertId: string) => void
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-5 mt-[72px] font-display text-4xl font-light leading-[1.1] tracking-[-0.035em] sm:text-[40px]">{children}</h2>
}

function Results({ data, submitted, isTeamOpen, onToggleTeam, onOpen }: ResultsProps) {
  const { t } = useI18n()
  const [best, ...rest] = data.results
  const alsoFit = rest.slice(0, 2)
  const others = rest.slice(2)

  return (
    <div>
      <Readback parsed={data.parsed} tookMs={data.took_ms} count={data.results.length} />

      {data.weak_match && (
        <p role="status" className="mt-8 border-2 border-ink bg-amber p-4 font-medium">
          {t.search.weak}
        </p>
      )}

      {!best && <p className="mt-8 border-2 border-ink bg-white p-10 text-center text-muted">{t.search.nobody}</p>}

      {best && (
        <>
          <div className="mt-12">
            <BestMatch expert={best} query={submitted.query} onOpen={onOpen} />
          </div>

          {alsoFit.length > 0 && (
            <>
              <SectionTitle>{t.card.also}</SectionTitle>
              <div className="grid border-2 border-ink bg-white md:grid-cols-2">
                {alsoFit.map((expert, index) => (
                  <div key={expert.id} className={index > 0 ? 'border-t-2 border-ink md:border-l-2 md:border-t-0' : ''}>
                    <AlsoFit expert={expert} query={submitted.query} onOpen={onOpen} />
                  </div>
                ))}
              </div>
            </>
          )}

          {others.length > 0 && (
            <>
              <SectionTitle>{t.card.others}</SectionTitle>
              <div className="border-t-2 border-ink">
                {others.map((expert) => (
                  <CandidateRow key={expert.id} expert={expert} query={submitted.query} onOpen={onOpen} />
                ))}
              </div>
            </>
          )}

          <div className="mt-14 flex flex-col items-center">
            <Button variant="outline" onClick={onToggleTeam} aria-expanded={isTeamOpen}>
              {isTeamOpen ? t.card.hideTeam : t.card.buildTeam}
            </Button>
            {isTeamOpen && (
              <div className="mt-6 w-full">
                <TeamPanel
                  query={submitted.query}
                  industry={submitted.industry}
                  hideBusy={submitted.hideBusy}
                  onOpen={onOpen}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
