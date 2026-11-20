import { useState, type FormEvent } from 'react'
import { CompassRose } from '../components/CompassRose'
import { Constellation } from '../components/Constellation'
import { ErrorBox } from '../components/ErrorBox'
import { ExpertCard } from '../components/ExpertCard'
import { ExpertDialog } from '../components/ExpertDialog'
import { ExpertCardSkeleton } from '../components/Skeleton'
import { TeamPanel } from '../components/TeamPanel'
import { useAsync } from '../hooks/useAsync'
import { useRecentQueries } from '../hooks/useRecentQueries'
import { useSearch } from '../hooks/useSearch'
import { api, type ParsedQuery, type SearchResponse } from '../lib/api'
import { EXAMPLE_QUERIES, yearsLabel } from '../lib/format'

const TOP_K = 8

interface SubmittedSearch {
  query: string
  industry: string | null
  hideBusy: boolean
}

export function SearchPage() {
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

  function start(next: SubmittedSearch) {
    setSubmitted(next)
    remember(next.query)
    setIsTeamOpen(false)
    run({ query: next.query, industry: next.industry, hide_busy: next.hideBusy, top_k: TOP_K })
  }

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
      <section className="hero-surface relative overflow-hidden text-ground">
        <Constellation
          dotColorVar="--color-sky"
          lineColorVar="--color-sky"
          density={9}
          intensity={0.75}
          className="absolute inset-0 size-full"
        />
        <CompassRose />
        <div className="relative mx-auto max-w-[1160px] px-4 pb-10 pt-6 sm:px-6">
          <h1 className="max-w-2xl font-display text-2xl font-bold leading-tight text-white sm:text-4xl">
            Lodestar finds the expert <span className="text-sky">for your task</span>
          </h1>
          <p className="mt-3 max-w-2xl text-ground/80">
            Describe the task in your own words: the skill, the city, the experience you need. Lodestar shows who fits and why. Queries work in English, Russian and Kazakh.
          </p>
          <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ground/70">
            {catalog.data && <span>{catalog.data.experts} experts in the database</span>}
            {industries.data && <span>{industries.data.length} industries</span>}
            <span>answers in a fraction of a second</span>
            <span>no internet or external services</span>
          </p>

          <form onSubmit={submit} className="mt-6 flex flex-col gap-3 sm:flex-row" role="search">
            <label htmlFor="query" className="sr-only">
              Query
            </label>
            <input
              id="query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={500}
              placeholder="For example: GMP specialist from Almaty"
              className="min-h-12 flex-1 rounded-xl bg-white px-4 text-ink placeholder:text-muted"
            />
            <button type="submit" className="min-h-12 rounded-xl bg-sky px-6 font-semibold text-ink hover:brightness-95">
              Find experts
            </button>
          </form>
          <p className="mt-2 min-h-5 text-sm text-amber-note" aria-live="polite">
            {emptyHint && 'Type a query: what kind of expert do you need?'}
          </p>

          <div className="mt-2 flex flex-wrap gap-2" aria-label="Example queries">
            {EXAMPLE_QUERIES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => applyExample(example)}
                className="rounded-full bg-white/10 px-3 py-1.5 text-left text-sm text-ground hover:bg-white/20"
              >
                {example}
              </button>
            ))}
          </div>

          {recent.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Recent queries">
              <span className="text-sm text-ground/70">Recent:</span>
              {recent.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => applyExample(item)}
                  className="rounded-full border border-ground/25 px-3 py-1 text-sm text-ground hover:bg-white/10"
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <label className="flex items-center gap-2 text-sm">
              Industry
              <select
                value={industry}
                onChange={(event) => changeFilters(event.target.value, hideBusy)}
                className="rounded-lg bg-white px-3 py-2 text-ink"
              >
                <option value="">Any</option>
                {industries.data?.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hideBusy}
                onChange={(event) => changeFilters(industry, event.target.checked)}
                className="size-4 accent-sky"
              />
              Hide busy experts
            </label>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1160px] px-4 py-8 sm:px-6" aria-live="polite">
        {state.status === 'idle' && (
          <p className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">
            Type a query or pick an example and the experts will appear here.
          </p>
        )}
        {state.status === 'loading' && (
          <div className="space-y-4">
            <ExpertCardSkeleton isLarge />
            <div className="grid gap-4 md:grid-cols-2">
              <ExpertCardSkeleton />
              <ExpertCardSkeleton />
            </div>
          </div>
        )}
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
      </section>

      {openExpertId && (
        <ExpertDialog
          expertId={openExpertId}
          query={submitted?.query ?? ''}
          onOpen={setOpenExpertId}
          onClose={() => setOpenExpertId(null)}
        />
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

function Results({ data, submitted, isTeamOpen, onToggleTeam, onOpen }: ResultsProps) {
  const [best, ...rest] = data.results
  const alsoFit = rest.slice(0, 2)
  const others = rest.slice(2)

  return (
    <div className="space-y-6">
      <ParsedLine parsed={data.parsed} tookMs={data.took_ms} />

      {data.weak_match && (
        <p role="status" className="rounded-2xl border border-partial-fg/30 bg-partial-bg p-4 text-partial-fg">
          No exact matches, here are the closest ones. Try rephrasing the query or removing constraints.
        </p>
      )}

      {!best && (
        <p className="rounded-2xl border border-line bg-white p-8 text-center text-muted">
          Nobody found. Remove the industry filter or “Hide busy experts”.
        </p>
      )}

      {best && (
        <>
          <ExpertCard expert={best} query={submitted.query} variant="featured" onOpen={onOpen} />

          {alsoFit.length > 0 && (
            <div>
              <h2 className="mb-3 font-display text-lg font-bold">Also a good fit</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {alsoFit.map((expert) => (
                  <ExpertCard key={expert.id} expert={expert} query={submitted.query} variant="compact" onOpen={onOpen} />
                ))}
              </div>
            </div>
          )}

          {others.length > 0 && (
            <div>
              <h2 className="mb-3 font-display text-lg font-bold">Other candidates</h2>
              <div className="space-y-3">
                {others.map((expert) => (
                  <ExpertCard key={expert.id} expert={expert} query={submitted.query} variant="row" onOpen={onOpen} />
                ))}
              </div>
            </div>
          )}

          <div>
            <button
              type="button"
              onClick={onToggleTeam}
              aria-expanded={isTeamOpen}
              className="rounded-xl bg-ink px-5 py-3 font-semibold text-white hover:bg-ink-soft"
            >
              {isTeamOpen ? 'Hide the team' : 'Build a team for this query'}
            </button>
            {isTeamOpen && (
              <div className="mt-4">
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

      <MatchExplainer />
    </div>
  )
}

function ParsedLine({ parsed, tookMs }: { parsed: ParsedQuery; tookMs: number }) {
  const chips = [
    parsed.city && `City: ${parsed.city}`,
    parsed.industry && `Industry: ${parsed.industry}`,
    parsed.min_experience !== null && `Experience from ${yearsLabel(parsed.min_experience)}`,
    ...parsed.terms.map((term) => `«${term}»`),
  ].filter(Boolean) as string[]

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted">How the query was understood:</span>
      {chips.length === 0 && <span className="text-muted">no key terms found</span>}
      {chips.map((chip) => (
        <span key={chip} className="rounded-full bg-white px-3 py-1 ring-1 ring-line">
          {chip}
        </span>
      ))}
      <span className="ml-auto text-muted">{tookMs} ms</span>
    </div>
  )
}

function MatchExplainer() {
  return (
    <details className="rounded-2xl border border-line bg-white p-5">
      <summary className="cursor-pointer font-semibold">How the match is calculated</summary>
      <div className="mt-3 space-y-2 text-sm text-ink-soft">
        <p>The percentage has two parts: 60% semantic closeness of the query to the profile, 40% share of query terms found.</p>
        <p>
          The order comes from two searches, by exact words and by meaning. Then city (same: higher, different: lower), industry,
          experience and availability are applied: busy experts move down but never disappear.
        </p>
        <p>Reasons on a card are built from real profile fields; no text is generated.</p>
      </div>
    </details>
  )
}
