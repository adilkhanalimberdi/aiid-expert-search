import { useEffect } from 'react'
import { useAsync } from '../hooks/useAsync'
import { api } from '../lib/api'
import { yearsLabel } from '../lib/format'
import { ErrorBox } from './ErrorBox'
import { MatchRing } from './MatchRing'
import { Skeleton } from './Skeleton'
import { StatusPill } from './StatusPill'

interface ExpertDialogProps {
  expertId: string
  query: string
  onOpen: (expertId: string) => void
  onClose: () => void
}

export function ExpertDialog({ expertId, query, onOpen, onClose }: ExpertDialogProps) {
  const expert = useAsync(() => api.expert(expertId), [expertId])
  const explanation = useAsync(query ? () => api.explain(expertId, query) : null, [expertId, query])
  const similar = useAsync(() => api.similar(expertId, 4), [expertId])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Expert profile"
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-ground p-5 sm:rounded-2xl sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold"
            autoFocus
          >
            Close
          </button>
        </div>

        {expert.isLoading && (
          <div className="space-y-3" role="status" aria-label="Loading">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}
        {expert.error && <ErrorBox message={expert.error} />}
        {expert.data && (
          <>
            <h2 className="font-display text-2xl font-bold">{expert.data.full_name}</h2>
            <p className="mt-1 text-muted">
              {expert.data.position}
              {expert.data.organization && `, ${expert.data.organization}`}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <StatusPill availability={expert.data.availability} />
              <span>
                {expert.data.city} · {expert.data.industry} · {yearsLabel(expert.data.experience_years)} of experience
              </span>
            </div>
            {expert.data.bio && <p className="mt-4">{expert.data.bio}</p>}
            <ul className="mt-4 flex flex-wrap gap-2">
              {expert.data.competencies.map((skill) => (
                <li key={skill} className="rounded-full bg-white px-3 py-1 text-sm ring-1 ring-line">
                  {skill}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted">
              Languages: {expert.data.languages.join(', ') || 'not specified'}
              {expert.data.email && ` · ${expert.data.email}`}
            </p>
          </>
        )}

        {query && (
          <section className="mt-6 rounded-2xl border border-line bg-white p-5" aria-labelledby="why-not">
            <h3 id="why-not" className="font-display text-base font-bold">
              Why not them? Match against your query
            </h3>
            <p className="mt-1 text-sm text-muted">«{query}»</p>
            {explanation.isLoading && <Skeleton className="mt-3 h-16 w-full" />}
            {explanation.error && <p className="mt-3 text-danger">{explanation.error}</p>}
            {explanation.data && (
              <div className="mt-3 flex items-start gap-4">
                <MatchRing percent={explanation.data.expert.match_percent} size={64} />
                <div className="space-y-3 text-sm">
                  <ExplanationList
                    title="Confirmed by skills"
                    items={explanation.data.expert.matched}
                    empty="No skill matches"
                  />
                  <ExplanationList
                    title="Missing"
                    items={explanation.data.missing_terms}
                    empty="Every query term is confirmed"
                  />
                  <ExplanationList title="Constraints" items={explanation.data.constraints} empty="No constraints" />
                </div>
              </div>
            )}
          </section>
        )}

        <section className="mt-6" aria-labelledby="similar">
          <h3 id="similar" className="font-display text-base font-bold">
            Similar experts
          </h3>
          {similar.isLoading && <Skeleton className="mt-3 h-16 w-full" />}
          {similar.error && <p className="mt-3 text-danger">{similar.error}</p>}
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {similar.data?.map(({ expert: item, cosine }) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onOpen(item.id)}
                  className="w-full rounded-xl border border-line bg-white p-3 text-left hover:border-teal"
                >
                  <span className="block font-semibold">{item.full_name}</span>
                  <span className="block text-sm text-muted">
                    {item.position}, {item.city}
                  </span>
                  <span className="text-xs text-teal">similarity {Math.round(cosine * 100)}%</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

function ExplanationList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <p className="font-semibold">{title}</p>
      <p className="text-ink-soft">{items.length ? items.join(', ') : empty}</p>
    </div>
  )
}
