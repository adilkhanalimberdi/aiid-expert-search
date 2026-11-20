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
  /** false: запрос без темы, процент ничего не значит и не показывается */
  showScore?: boolean
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="border-t border-white/20 py-3 pr-8 text-white/70">{label}</dt>
      <dd className="border-t border-white/20 py-3">{children}</dd>
    </>
  )
}

type ReasonKind = 'matched' | 'related' | 'place' | 'other'

/** Плитка у причины по её виду: подтверждённый навык, близкий навык, город или отрасль, остальное. */
function reasonKind(reason: string, expert: SearchResult): ReasonKind {
  if (expert.matched.some((skill) => reason.includes(skill))) return 'matched'
  if (expert.related.some((skill) => reason.includes(skill))) return 'related'
  if (reason.includes(expert.city) || reason.includes(expert.industry)) return 'place'
  return 'other'
}

const REASON_TILE: Record<ReasonKind, string> = {
  matched: 'tile bg-turquoise-glow',
  related: 'border-2 border-turquoise-glow',
  place: 'tile bg-ochre',
  other: 'bg-white/45',
}

/** Лучший кандидат: ультрамариновая панель, слева имя и факты, справа панно оценки и причины. */
export function BestMatch({ expert, query, onOpen, showScore = true }: CardProps) {
  const { t } = useI18n()
  const actions = (
    <>
      <FeedbackButtons query={query} expertId={expert.id} onDark />
      <Button variant="outline-dark" onClick={() => onOpen(expert.id)}>
        {t.card.details}
      </Button>
    </>
  )
  return (
    <article className="on-dark bg-smalt text-white">
      <div className="flex flex-col md:flex-row">
        <div className="flex min-w-0 flex-[1_1_480px] flex-col p-6 sm:p-10">
          <h2 className="font-display text-[34px] font-light leading-[1.08] tracking-[-0.03em] text-balance sm:text-[48px]">
            {expert.full_name}
          </h2>
          <p className="mt-3 text-lg text-white/85">{expert.position}</p>
          {expert.organization && <p className="mt-1 text-[15px] text-white/70">{expert.organization}</p>}
          <dl className="mt-8 grid grid-cols-[auto_1fr] border-b border-white/20 text-base">
            <Fact label={t.card.city}>{expert.city}</Fact>
            <Fact label={t.card.industry}>{expert.industry}</Fact>
            <Fact label={t.card.experience}>
              <span className="tnum">{t.years(expert.experience_years)}</span>
            </Fact>
            <Fact label={t.card.status}>
              <StatusDot availability={expert.availability} onDark />
            </Fact>
          </dl>
          {(expert.matched.length > 0 || expert.related.length > 0) && (
            <ul className="mt-6 flex flex-wrap gap-1.5" aria-label={t.card.why}>
              {expert.matched.map((skill) => (
                <li key={skill} className="tile bg-turquoise px-2.5 py-1 text-sm font-medium text-white">
                  {skill}
                </li>
              ))}
              {expert.related.map((skill) => (
                <li key={skill} className="border-2 border-turquoise-glow/70 px-2.5 py-0.5 text-sm text-white/90">
                  {skill}
                </li>
              ))}
            </ul>
          )}
          {/* на широком экране действия занимают низ левой колонки: колонки заканчиваются вровень */}
          <div className="mt-auto hidden flex-wrap gap-2 pt-8 md:flex">{actions}</div>
        </div>
        <div className="min-w-0 flex-[1_1_460px] bg-smalt-deep/45 p-6 sm:p-10">
          {showScore && <ScoreFigure percent={expert.match_percent} size="hero" onDark />}
          <h3 className={`text-base font-semibold text-white/90 ${showScore ? 'mt-9' : ''}`}>{t.card.why}</h3>
          <ul className="mt-3">
            {expert.reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-3.5 border-t border-white/15 py-2.5 text-[15px] leading-snug">
                <span aria-hidden className={`mt-[5px] size-2.5 flex-none ${REASON_TILE[reasonKind(reason, expert)]}`} />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {/* на телефоне действия внизу панели, после причин */}
      <div className="flex flex-wrap justify-center gap-2 border-t border-white/15 bg-smalt-deep/70 p-5 md:hidden">
        {actions}
      </div>
    </article>
  )
}

/** Тоже подходят: две светлые плиты рядом, панно и цифра сверху. */
export function AlsoFit({ expert, query, onOpen, showScore = true }: CardProps) {
  const { t } = useI18n()
  return (
    <article className="flex h-full flex-col bg-plaster p-6 sm:p-7">
      {showScore && <ScoreFigure percent={expert.match_percent} size="big" />}
      <h3 className={`font-display text-[22px] font-normal leading-tight tracking-[-0.02em] ${showScore ? 'mt-5' : ''}`}>
        {expert.full_name}
      </h3>
      <p className="mt-1.5 text-[15px] text-slate">{expert.position}</p>
      {expert.matched.length > 0 && (
        <ul className="mt-3.5 flex flex-wrap gap-1.5">
          {expert.matched.map((skill) => (
            <li key={skill} className="tile bg-turquoise-deep px-2 py-0.5 text-[13px] font-medium text-white">
              {skill}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate">
        <span>{expert.city}</span>
        <span className="tnum">{t.years(expert.experience_years)}</span>
        <span className="font-medium text-grout">
          <StatusDot availability={expert.availability} />
        </span>
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-5 gap-y-2 pt-5">
        <button
          type="button"
          onClick={() => onOpen(expert.id)}
          className="min-h-11 cursor-pointer text-left text-sm font-semibold text-turquoise-deep underline decoration-[1.5px] underline-offset-4 hover:decoration-ochre"
        >
          {t.card.details}
        </button>
        <FeedbackButtons query={query} expertId={expert.id} variant="icons" />
      </div>
    </article>
  )
}

/** Остальные кандидаты: строки на швах, полоса из плиток и цифра справа. */
export function CandidateRow({ expert, query, onOpen, showScore = true }: CardProps) {
  return (
    <article className="flex flex-wrap items-center gap-x-7 gap-y-3 border-b border-seam px-2 py-4 transition-colors hover:bg-plaster">
      <div className="min-w-0 flex-[2_1_260px]">
        <button
          type="button"
          onClick={() => onOpen(expert.id)}
          className="min-h-11 cursor-pointer text-left font-display text-lg font-normal tracking-[-0.015em] underline-offset-4 hover:underline hover:decoration-ochre hover:decoration-2"
        >
          {expert.full_name}
        </button>
        <p className="text-sm text-slate">{expert.position}</p>
      </div>
      <p className="flex-[1_1_110px] text-[15px] text-slate">{expert.city}</p>
      <p className="flex-[1_1_150px] text-[15px]">
        <StatusDot availability={expert.availability} />
      </p>
      {showScore && (
        <div className="flex flex-[0_0_auto] items-center gap-3">
          <ScoreBar percent={expert.match_percent} />
          <ScoreFigure percent={expert.match_percent} size="row" />
        </div>
      )}
      <div className="ml-auto flex flex-none">
        <FeedbackButtons query={query} expertId={expert.id} variant="icons" />
      </div>
    </article>
  )
}
