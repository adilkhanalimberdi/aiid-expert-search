import type { SearchResult } from '../lib/api'
import { initials, yearsLabel } from '../lib/format'
import { FeedbackButtons } from './FeedbackButtons'
import { MatchRing } from './MatchRing'
import { StatusPill } from './StatusPill'

export type CardVariant = 'featured' | 'compact' | 'row'

interface ExpertCardProps {
  expert: SearchResult
  query: string
  variant: CardVariant
  onOpen: (expertId: string) => void
}

export function ExpertCard({ expert, query, variant, onOpen }: ExpertCardProps) {
  const isFeatured = variant === 'featured'
  const isRow = variant === 'row'
  const reasons = isFeatured ? expert.reasons : expert.reasons.slice(0, 3)

  return (
    <article className={`rounded-2xl border bg-white transition-shadow hover:shadow-md ${isFeatured ? 'border-teal p-6 sm:p-8' : 'border-line p-5'}`}>
      {isFeatured && (
        <p className="mb-4 inline-block rounded-full bg-ink px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky">
          Best match
        </p>
      )}
      <div className="flex items-start gap-4">
        <div
          aria-hidden
          className={`hidden shrink-0 items-center justify-center rounded-full bg-ink font-display sm:flex font-bold text-sky ${isFeatured ? 'size-16 text-lg' : 'size-12 text-sm'}`}
        >
          {initials(expert.full_name)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={`font-display font-bold leading-snug ${isFeatured ? 'text-xl' : 'text-base'}`}>
            {expert.full_name}
          </h3>
          <p className="mt-1 text-muted">{expert.position}</p>
          {expert.organization && !isRow && <p className="text-sm text-muted">{expert.organization}</p>}
          <p className="mt-2 text-sm">
            {expert.city} · {expert.industry} · {yearsLabel(expert.experience_years)} of experience
          </p>
        </div>
        <MatchRing percent={expert.match_percent} size={isFeatured ? 80 : 56} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusPill availability={expert.availability} />
        {expert.matched.map((skill) => (
          <span key={skill} className="rounded-full bg-teal-tint px-3 py-1 text-xs font-semibold text-teal">
            {skill}
          </span>
        ))}
      </div>

      {!isRow && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold">{isFeatured ? 'Why this expert' : 'Reasons'}</h4>
          <ul className="mt-2 space-y-1 text-sm text-ink-soft">
            {reasons.map((reason) => (
              <li key={reason} className="flex gap-2">
                <span aria-hidden className="text-teal">
                  •
                </span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <FeedbackButtons query={query} expertId={expert.id} />
        <button
          type="button"
          onClick={() => onOpen(expert.id)}
          className="text-sm font-semibold text-teal underline-offset-4 hover:underline"
        >
          Details and “Why not them?”
        </button>
      </div>
    </article>
  )
}
