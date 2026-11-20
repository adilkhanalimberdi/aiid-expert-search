import { useEffect, useRef, useState } from 'react'
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
  onClose: () => void
}

/**
 * Окно профиля фиксированной высоты: содержимое прокручивается внутри, поэтому окно не прыгает при загрузке.
 * Переход по «похожим экспертам» ведёт по цепочке профилей, кнопка «Назад» возвращает к предыдущему.
 */
export function ExpertDialog({ expertId, query, onClose }: ExpertDialogProps) {
  const { t } = useI18n()
  const [trail, setTrail] = useState([expertId])
  const currentId = trail[trail.length - 1]
  const scroller = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    closeButton.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  // Новый профиль всегда открывается с начала
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [currentId])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-smalt-deep/80 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.dialog.label}
        className="flex h-[92vh] w-full max-w-3xl flex-col bg-concrete shadow-[0_30px_70px_-20px_rgb(5_8_30/0.6)] sm:h-[min(88vh,820px)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-none items-center justify-between gap-3 border-b-2 border-grout bg-plaster px-5 py-3 sm:px-9">
          {trail.length > 1 ? (
            <Button variant="quiet" size="sm" onClick={() => setTrail((path) => path.slice(0, -1))}>
              <span aria-hidden>←</span> {t.dialog.back}
            </Button>
          ) : (
            <span />
          )}
          <Button ref={closeButton} variant="outline" size="sm" onClick={onClose}>
            {t.dialog.close}
          </Button>
        </div>
        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-5 pb-9 pt-6 sm:px-9">
          <ExpertBody
            key={currentId}
            expertId={currentId}
            query={query}
            onOpen={(id) => setTrail((path) => [...path, id])}
          />
        </div>
      </div>
    </div>
  )
}

interface ExpertBodyProps {
  expertId: string
  query: string
  onOpen: (expertId: string) => void
}

/** Содержимое одного профиля; ключ по id пересоздаёт его целиком, и старые данные не мелькают. */
function ExpertBody({ expertId, query, onOpen }: ExpertBodyProps) {
  const { t, lang } = useI18n()
  const expert = useAsync(() => api.expert(expertId), [expertId])
  const explanation = useAsync(query ? () => api.explain(expertId, query) : null, [expertId, query, lang])
  const similar = useAsync(() => api.similar(expertId, 4), [expertId])

  return (
    <>
      {expert.isLoading && (
        <div className="space-y-3" role="status" aria-label={t.dialog.loading}>
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-5 w-2/5" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}
      {expert.error && <ErrorBox message={expert.error} />}
      {expert.data && (
        <>
          <h2 className="font-display text-[30px] font-light leading-[1.1] tracking-[-0.025em] sm:text-[36px]">{expert.data.full_name}</h2>
          <p className="mt-2 text-slate">
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
              <li key={skill} className="tile bg-plaster px-3 py-1 text-sm font-medium outline-2 -outline-offset-2 outline-grout/15 outline">
                {skill}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate">
            {t.dialog.languages}: {expert.data.languages.join(', ') || t.dialog.notSpecified}
            {expert.data.email && ` · ${expert.data.email}`}
          </p>
        </>
      )}

      {query && (
        <section className="mt-8 bg-plaster p-5 sm:p-6" aria-labelledby="why-not">
          <h3 id="why-not" className="font-display text-xl font-light tracking-[-0.02em] sm:text-2xl">
            {t.dialog.whyNot}
          </h3>
          <p className="mt-1 text-sm text-slate">«{query}»</p>
          {explanation.isLoading && <Skeleton className="mt-4 h-28 w-full" />}
          {explanation.error && <p className="mt-3 text-terracotta">{errorText(explanation.error, t)}</p>}
          {explanation.data && (
            <div className="mt-5 flex flex-wrap items-start gap-x-8 gap-y-5">
              <ScoreFigure percent={explanation.data.expert.match_percent} size="big" />
              <div className="min-w-[14rem] flex-[1_1_16rem] space-y-4 text-[15px]">
                <ExplanationList title={t.dialog.confirmed} items={explanation.data.expert.matched} empty={t.dialog.noSkills} />
                <ExplanationList title={t.dialog.missing} items={explanation.data.missing_terms} empty={t.dialog.allConfirmed} />
                <ExplanationList title={t.dialog.constraints} items={explanation.data.constraints} empty={t.dialog.noConstraints} />
              </div>
            </div>
          )}
        </section>
      )}

      <section className="mt-8" aria-labelledby="similar">
        <h3 id="similar" className="font-display text-xl font-light tracking-[-0.02em] sm:text-2xl">
          {t.dialog.similar}
        </h3>
        {similar.isLoading && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-[92px]" />
            <Skeleton className="h-[92px]" />
          </div>
        )}
        {similar.error && <p className="mt-3 text-terracotta">{errorText(similar.error, t)}</p>}
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {similar.data?.map(({ expert: item, cosine }) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onOpen(item.id)}
                className="h-full w-full cursor-pointer border-2 border-transparent bg-plaster p-4 text-left transition-colors hover:border-turquoise"
              >
                <span className="block font-semibold">{item.full_name}</span>
                <span className="block text-sm text-slate">
                  {item.position}, {item.city}
                </span>
                <span className="tnum mt-1 block text-xs font-medium text-turquoise-deep">{t.dialog.similarity(Math.round(cosine * 100))}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

function ExplanationList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <p className="font-semibold">{title}</p>
      <p className="text-slate">{items.length ? items.join(', ') : empty}</p>
    </div>
  )
}
