import { useState, type FormEvent } from 'react'
import { ErrorBox } from '../components/ErrorBox'
import { ExpertCard } from '../components/ExpertCard'
import { ExpertDialog } from '../components/ExpertDialog'
import { ExpertCardSkeleton } from '../components/Skeleton'
import { TeamPanel } from '../components/TeamPanel'
import { useAsync } from '../hooks/useAsync'
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
  const { state, run } = useSearch()

  function start(next: SubmittedSearch) {
    setSubmitted(next)
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
      <section className="bg-ink text-ground">
        <div className="mx-auto max-w-[1160px] px-4 pb-10 pt-4 sm:px-6">
          <h1 className="font-display text-2xl font-bold leading-tight text-white sm:text-4xl">
            Найдём эксперта по вашему запросу
          </h1>
          <p className="mt-3 max-w-2xl text-ground/80">
            Опишите задачу своими словами: компетенцию, город, нужный опыт. Сервис покажет, кто подходит и почему.
          </p>

          <form onSubmit={submit} className="mt-6 flex flex-col gap-3 sm:flex-row" role="search">
            <label htmlFor="query" className="sr-only">
              Запрос
            </label>
            <input
              id="query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={500}
              placeholder="Например: специалист по GMP из Алматы"
              className="min-h-12 flex-1 rounded-xl bg-white px-4 text-ink placeholder:text-muted"
            />
            <button type="submit" className="min-h-12 rounded-xl bg-sky px-6 font-semibold text-ink hover:brightness-95">
              Найти экспертов
            </button>
          </form>
          <p className="mt-2 min-h-5 text-sm text-amber-note" aria-live="polite">
            {emptyHint && 'Введите запрос: что за специалист вам нужен.'}
          </p>

          <div className="mt-2 flex flex-wrap gap-2" aria-label="Примеры запросов">
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

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <label className="flex items-center gap-2 text-sm">
              Отрасль
              <select
                value={industry}
                onChange={(event) => changeFilters(event.target.value, hideBusy)}
                className="rounded-lg bg-white px-3 py-2 text-ink"
              >
                <option value="">Любая</option>
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
              Скрыть занятых
            </label>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1160px] px-4 py-8 sm:px-6" aria-live="polite">
        {state.status === 'idle' && (
          <p className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">
            Введите запрос или выберите пример, и здесь появятся эксперты.
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
          Точных совпадений нет, вот ближайшие. Попробуйте переформулировать запрос или убрать ограничения.
        </p>
      )}

      {!best && (
        <p className="rounded-2xl border border-line bg-white p-8 text-center text-muted">
          Никого не нашли. Снимите фильтр отрасли или «Скрыть занятых».
        </p>
      )}

      {best && (
        <>
          <ExpertCard expert={best} query={submitted.query} variant="featured" onOpen={onOpen} />

          {alsoFit.length > 0 && (
            <div>
              <h2 className="mb-3 font-display text-lg font-bold">Тоже подходят</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {alsoFit.map((expert) => (
                  <ExpertCard key={expert.id} expert={expert} query={submitted.query} variant="compact" onOpen={onOpen} />
                ))}
              </div>
            </div>
          )}

          {others.length > 0 && (
            <div>
              <h2 className="mb-3 font-display text-lg font-bold">Другие кандидаты</h2>
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
              {isTeamOpen ? 'Скрыть команду' : 'Собрать команду под этот запрос'}
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
    parsed.city && `Город: ${parsed.city}`,
    parsed.industry && `Отрасль: ${parsed.industry}`,
    parsed.min_experience !== null && `Опыт от ${yearsLabel(parsed.min_experience)}`,
    ...parsed.terms.map((term) => `«${term}»`),
  ].filter(Boolean) as string[]

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted">Как понят запрос:</span>
      {chips.length === 0 && <span className="text-muted">ключевых терминов не найдено</span>}
      {chips.map((chip) => (
        <span key={chip} className="rounded-full bg-white px-3 py-1 ring-1 ring-line">
          {chip}
        </span>
      ))}
      <span className="ml-auto text-muted">{tookMs} мс</span>
    </div>
  )
}

function MatchExplainer() {
  return (
    <details className="rounded-2xl border border-line bg-white p-5">
      <summary className="cursor-pointer font-semibold">Как считается совпадение</summary>
      <div className="mt-3 space-y-2 text-sm text-ink-soft">
        <p>Процент складывается из двух частей: 60% смысловая близость запроса к профилю, 40% доля найденных терминов.</p>
        <p>
          Порядок в выдаче задают два поиска: по точным словам и по смыслу. Затем учитываются город (совпал: выше,
          другой: ниже), отрасль, опыт и доступность: занятые эксперты опускаются, но не пропадают.
        </p>
        <p>Причины в карточке берутся из реальных полей профиля, текст не генерируется.</p>
      </div>
    </details>
  )
}
