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
          <h1 className="font-display text-[38px] font-light leading-[1.02] tracking-[-0.035em] text-balance sm:text-[76px]">
            {t.search.h1}
          </h1>
          <p className="mx-auto mt-6 max-w-[560px] text-lg leading-relaxed text-white/90">{t.search.sub}</p>
          {catalog.data && industries.data && (
            <p className="tnum mt-3 text-sm text-white/75">
              {t.search.experts(catalog.data.experts)} · {t.search.industriesCount(industries.data.length)}
            </p>
          )}
        </div>

        <form onSubmit={submit} role="search" className="mx-auto mt-11 flex max-w-[920px] flex-col items-center gap-7">
          <div className="w-full shadow-[0_22px_44px_-18px_rgb(8_12_40/0.7)]">
            <label htmlFor="query" className="sr-only">
              {t.search.queryLabel}
            </label>
            {/* поле растёт по тексту: длинный запрос виден целиком и на телефоне; Enter ищет, Shift+Enter переносит */}
            <textarea
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
              className="block min-h-[68px] w-full resize-none rounded-none border-b-[6px] border-ochre bg-plaster px-4 py-[19px] text-lg leading-snug text-grout outline-none [field-sizing:content] placeholder:font-display placeholder:font-light placeholder:tracking-[-0.02em] placeholder:text-stone focus:border-turquoise sm:min-h-[88px] sm:px-8 sm:py-[24px] sm:text-[24px]"
            />
          </div>
          <Button type="submit" variant="primary" size="lg" className="w-full sm:w-auto">
            {t.search.submit}
            <ArrowRight />
          </Button>
          <p className="-mt-3 min-h-5 text-sm text-ochre-soft" aria-live="polite">
            {emptyHint && t.search.emptyQuery}
          </p>
        </form>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-7 gap-y-1">
          <span className="text-sm text-white/80">{t.search.tryLabel}</span>
          {t.search.examples.map((example, index) => (
            <button
              key={example}
              type="button"
              onClick={() => applyExample(example)}
              // на телефоне три примера: остальные отодвигали результаты на второй экран
              className={`${index >= 3 ? 'hidden sm:inline' : ''} min-h-11 cursor-pointer text-[15px] font-medium text-white underline decoration-white/45 decoration-[1.5px] underline-offset-[5px] hover:decoration-ochre`}
            >
              {example}
            </button>
          ))}
        </div>

        {recent.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1" aria-label={t.search.recent}>
            <span className="text-sm text-white/80">{t.search.recent}</span>
            {recent.map((item, index) => (
              <button
                key={item}
                type="button"
                onClick={() => applyExample(item)}
                className={`${index >= 1 ? 'hidden sm:inline' : ''} min-h-11 cursor-pointer text-sm text-white/90 underline decoration-white/35 decoration-1 underline-offset-[5px] hover:decoration-ochre`}
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
          <div className="flex flex-col items-center gap-5 border-2 border-dashed border-seam px-6 py-12 text-center text-slate">
            <span aria-hidden className="flex gap-0.5">
              {['bg-turquoise', 'bg-ochre', 'bg-smalt', 'bg-seam', 'bg-seam'].map((tone, index) => (
                <span key={index} className={`size-4 ${tone}`} />
              ))}
            </span>
            <p className="max-w-[46ch]">{t.search.idle}</p>
          </div>
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
  return (
    <h2 className="mb-5 mt-16 font-display text-[26px] font-light leading-[1.1] tracking-[-0.025em] sm:text-[32px]">{children}</h2>
  )
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
        <p role="status" className="mt-8 flex items-start gap-3 border-2 border-ochre-deep bg-ochre-soft/60 p-4 font-medium">
          <span aria-hidden className="mt-1 size-3 flex-none bg-ochre-deep" />
          <span>{t.search.weak}</span>
        </p>
      )}

      {data.filter_only && (
        <p role="status" className="mt-8 flex items-start gap-3 border-2 border-smalt bg-plaster p-4 font-medium">
          <span aria-hidden className="mt-1 size-3 flex-none bg-smalt" />
          <span>{t.search.filterOnly([data.parsed.city, data.parsed.industry].filter(Boolean).join(', '))}</span>
        </p>
      )}

      {!best && <p className="mt-8 border-2 border-dashed border-seam p-10 text-center text-slate">{t.search.nobody}</p>}

      {best && data.weak_match && (
        // слабое совпадение не получает чёрную панель «лучшего»: это ближайшие профили, а не рекомендация
        <>
          <SectionTitle>{t.card.closest}</SectionTitle>
          <div className="border-t-2 border-grout">
            {data.results.map((expert) => (
              <CandidateRow key={expert.id} expert={expert} query={submitted.query} onOpen={onOpen} />
            ))}
          </div>
        </>
      )}

      {best && !data.weak_match && (
        <>
          <div className="mt-12">
            <BestMatch expert={best} query={submitted.query} onOpen={onOpen} showScore={!data.filter_only} />
          </div>

          {alsoFit.length > 0 && (
            <>
              <SectionTitle>{t.card.also}</SectionTitle>
              <div className="grid gap-0.5 bg-seam p-0.5 md:grid-cols-2">
                {alsoFit.map((expert) => (
                  <div key={expert.id}>
                    <AlsoFit expert={expert} query={submitted.query} onOpen={onOpen} showScore={!data.filter_only} />
                  </div>
                ))}
              </div>
            </>
          )}

          {others.length > 0 && (
            <>
              <SectionTitle>{t.card.others}</SectionTitle>
              <div className="border-t-2 border-grout">
                {others.map((expert) => (
                  <CandidateRow
                    key={expert.id}
                    expert={expert}
                    query={submitted.query}
                    onOpen={onOpen}
                    showScore={!data.filter_only}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {best && !data.weak_match && (
        <>
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
