import type { ReactNode } from 'react'
import type { SearchResult } from '../lib/api'
import { useI18n } from '../lib/useI18n'
import { FeedbackButtons } from './FeedbackButtons'
import { ScoreBar, ScoreFigure } from './ScoreFigure'
import { StatusDot } from './StatusDot'
import { Button } from './ui'


interface CardProps {
  expert: SearchResult
  query: string
  onOpen: (expertId: string) => void
}

function Fact({ label, children, isLast = false }: { label: string; children: ReactNode; isLast?: boolean }) {
  const edge = `border-t border-white/20 ${isLast ? 'border-b' : ''}`
  return (
    <>
      <dt className={`py-3.5 pr-8 text-white/70 ${edge}`}>{label}</dt>
      <dd className={`py-3.5 ${edge}`}>{children}</dd>
    </>
  )
}

/** Лучший кандидат: чёрная панель, имя и факты слева, оценка и причины справа, действия по центру. */
export function BestMatch({ expert, query, onOpen }: CardProps) {
  const { t } = useI18n()
  return (
    <article className="on-dark bg-ink text-white">
      <div className="flex flex-col md:flex-row">
        <div className="min-w-0 flex-[1_1_520px] p-6 sm:p-12 sm:pb-9">
          <h2 className="font-display text-[40px] font-light leading-[1.02] tracking-[-0.035em] text-balance sm:text-[60px]">
            {expert.full_name}
          </h2>
          <p className="mt-3.5 text-xl text-white/80">{expert.position}</p>
          {expert.organization && <p className="mt-1 text-[15px] text-white/70">{expert.organization}</p>}
          <dl className="mt-9 grid grid-cols-[auto_1fr] text-[17px]">
            <Fact label={t.card.city}>{expert.city}</Fact>
            <Fact label={t.card.industry}>{expert.industry}</Fact>
            <Fact label={t.card.experience}>{t.years(expert.experience_years)}</Fact>
            <Fact label={t.card.status} isLast>
              <StatusDot availability={expert.availability} />
            </Fact>
          </dl>
        </div>
        <div className="min-w-0 flex-[1_1_440px] border-white/20 p-6 sm:p-12 sm:pb-9 md:border-l">
          <ScoreFigure percent={expert.match_percent} size="hero" onDark />
          <h3 className="mt-9 text-lg font-semibold">{t.card.why}</h3>
          <ul className="mt-3.5">
            {expert.reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-3.5 border-t border-white/20 py-3 text-base leading-snug">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-lime)"
                  strokeWidth="3"
                  strokeLinecap="square"
                  aria-hidden
                  className="mt-0.5 flex-none"
                >
                  <path d="M4 12.5l5.5 5.5L20 7" />
                </svg>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-3 border-t border-white/20 p-6">
        <FeedbackButtons query={query} expertId={expert.id} onDark />
        <Button variant="outline-dark" onClick={() => onOpen(expert.id)}>
          {t.card.details}
        </Button>
      </div>
    </article>
  )
}

/** Тоже подходят: два блока в общей рамке, крупная цифра слева. */
export function AlsoFit({ expert, query, onOpen }: CardProps) {
  const { t } = useI18n()
  return (
    <article className="flex gap-5 p-6 sm:gap-6 sm:p-7">
      <div className="min-w-[88px] flex-none sm:min-w-28">
        <ScoreFigure percent={expert.match_percent} size="big" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-2xl font-normal leading-tight tracking-[-0.02em]">{expert.full_name}</h3>
        <p className="mt-1.5 text-[15px] text-muted">{expert.position}</p>
        {expert.matched.length > 0 && (
          <p className="mt-3.5 text-sm font-semibold leading-normal text-cobalt-deep">{expert.matched.join(' · ')}</p>
        )}
        <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span>{expert.city}</span>
          <span>{t.years(expert.experience_years)}</span>
          <span className="font-medium text-ink">
            <StatusDot availability={expert.availability} />
          </span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1">
          <button
            type="button"
            onClick={() => onOpen(expert.id)}
            className="min-h-11 cursor-pointer text-sm font-semibold text-cobalt-deep underline decoration-[1.5px] underline-offset-4 hover:decoration-lime"
          >
            {t.card.details}
          </button>
          <FeedbackLinks query={query} expertId={expert.id} />
        </div>
      </div>
    </article>
  )
}

function FeedbackLinks({ query, expertId }: { query: string; expertId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <FeedbackButtons query={query} expertId={expertId} compact />
    </div>
  )
}

/** Остальные кандидаты: линованная таблица, оценка справа. */
export function CandidateRow({ expert, query, onOpen }: CardProps) {
  return (
    <article className="flex flex-wrap items-center gap-x-7 gap-y-3 border-b border-rule px-2 py-5 transition-colors hover:bg-ink/[0.04]">
      <div className="min-w-0 flex-[2_1_260px]">
        <button
          type="button"
          onClick={() => onOpen(expert.id)}
          className="min-h-11 cursor-pointer text-left font-display text-xl font-normal tracking-[-0.02em] hover:underline hover:decoration-lime hover:decoration-2 hover:underline-offset-4"
        >
          {expert.full_name}
        </button>
        <p className="mt-0.5 text-sm text-muted">{expert.position}</p>
      </div>
      <p className="flex-[1_1_110px] text-[15px]">{expert.city}</p>
      <p className="flex-[1_1_150px] text-[15px]">
        <StatusDot availability={expert.availability} />
      </p>
      <div className="flex flex-[1_1_180px] items-center gap-4">
        <ScoreBar percent={expert.match_percent} />
        <ScoreFigure percent={expert.match_percent} size="row" />
      </div>
      <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
        <FeedbackLinks query={query} expertId={expert.id} />
      </div>
    </article>
  )
}
