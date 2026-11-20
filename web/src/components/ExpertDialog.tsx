import { useEffect, useRef } from 'react'
import { useAsync } from '../hooks/useAsync'
import { api } from '../lib/api'
import { errorText } from '../lib/errors'
import { useI18n } from '../lib/useI18n'
import { ErrorBox } from './ErrorBox'
import { ScoreFigure } from './ScoreFigure'
import { Skeleton } from './Skeleton'
import { StatusDot } from './StatusDot'
import { Button } from './ui'

interface ExpertDialogProps {
  expertId: string
  query: string
  onOpen: (expertId: string) => void
  onClose: () => void
}

export function ExpertDialog({ expertId, query, onOpen, onClose }: ExpertDialogProps) {
  const { t, lang } = useI18n()
  const expert = useAsync(() => api.expert(expertId), [expertId])
  const explanation = useAsync(query ? () => api.explain(expertId, query) : null, [expertId, query, lang])
  const similar = useAsync(() => api.similar(expertId, 4), [expertId])
  const closeButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    closeButton.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.dialog.label}
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto bg-paper p-5 sm:p-9"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-end">
          <Button ref={closeButton} variant="outline" size="sm" onClick={onClose}>
            {t.dialog.close}
          </Button>
        </div>

        {expert.isLoading && (
          <div className="space-y-3" role="status" aria-label={t.dialog.loading}>
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}
        {expert.error && <ErrorBox message={expert.error} />}
        {expert.data && (
          <>
            <h2 className="font-display text-4xl font-light leading-[1.05] tracking-[-0.035em]">{expert.data.full_name}</h2>
            <p className="mt-2 text-muted">
              {expert.data.position}
              {expert.data.organization && `, ${expert.data.organization}`}
            </p>
            <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-[15px]">
              <StatusDot availability={expert.data.availability} />
              <span>
                {expert.data.city} · {expert.data.industry} · {t.years(expert.data.experience_years)}
              </span>
            </p>
            {expert.data.bio && <p className="mt-5 leading-relaxed">{expert.data.bio}</p>}
            <ul className="mt-5 flex flex-wrap gap-2">
              {expert.data.competencies.map((skill) => (
                <li key={skill} className="border border-ink px-3 py-1 text-sm font-medium">
                  {skill}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted">
              {t.dialog.languages}: {expert.data.languages.join(', ') || t.dialog.notSpecified}
              {expert.data.email && ` · ${expert.data.email}`}
            </p>
          </>
        )}

        {query && (
          <section className="mt-8 border-2 border-ink bg-white p-5 sm:p-6" aria-labelledby="why-not">
            <h3 id="why-not" className="font-display text-2xl font-light tracking-[-0.03em]">
              {t.dialog.whyNot}
            </h3>
            <p className="mt-1 text-sm text-muted">«{query}»</p>
            {explanation.isLoading && <Skeleton className="mt-4 h-24 w-full" />}
            {explanation.error && <p className="mt-3 text-danger">{errorText(explanation.error, t)}</p>}
            {explanation.data && (
              <div className="mt-4 flex flex-wrap items-start gap-x-8 gap-y-4">
                <ScoreFigure percent={explanation.data.expert.match_percent} size="big" />
                <div className="min-w-0 flex-1 space-y-4 text-[15px]">
                  <ExplanationList title={t.dialog.confirmed} items={explanation.data.expert.matched} empty={t.dialog.noSkills} />
                  <ExplanationList title={t.dialog.missing} items={explanation.data.missing_terms} empty={t.dialog.allConfirmed} />
                  <ExplanationList title={t.dialog.constraints} items={explanation.data.constraints} empty={t.dialog.noConstraints} />
                </div>
              </div>
            )}
          </section>
        )}

        <section className="mt-8" aria-labelledby="similar">
          <h3 id="similar" className="font-display text-2xl font-light tracking-[-0.03em]">
            {t.dialog.similar}
          </h3>
          {similar.isLoading && <Skeleton className="mt-3 h-16 w-full" />}
          {similar.error && <p className="mt-3 text-danger">{errorText(similar.error, t)}</p>}
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {similar.data?.map(({ expert: item, cosine }) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onOpen(item.id)}
                  className="h-full w-full cursor-pointer border-2 border-ink bg-white p-4 text-left transition-colors hover:bg-lime"
                >
                  <span className="block font-semibold">{item.full_name}</span>
                  <span className="block text-sm text-muted">
                    {item.position}, {item.city}
                  </span>
                  <span className="mt-1 block text-xs font-medium text-cobalt-deep">{t.dialog.similarity(Math.round(cosine * 100))}</span>
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
      <p className="text-muted">{items.length ? items.join(', ') : empty}</p>
    </div>
  )
}
