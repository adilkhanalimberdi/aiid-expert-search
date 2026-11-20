import { useState } from 'react'
import { api } from '../lib/api'
import { errorText } from '../lib/errors'
import { useI18n } from '../lib/useI18n'
import { Button } from './ui'

type Verdict = 'fit' | 'not_fit'

interface FeedbackButtonsProps {
  query: string
  expertId: string
  onDark?: boolean
  /** icons: два квадратных значка для строк списка, чтобы отзыв не перебивал имя и оценку */
  variant?: 'buttons' | 'icons'
}

function VerdictIcon({ verdict }: { verdict: Verdict }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" aria-hidden>
      {verdict === 'fit' ? <path d="M4 12.5l5.5 5.5L20 7" /> : <path d="M6 6l12 12M18 6L6 18" />}
    </svg>
  )
}

export function FeedbackButtons({ query, expertId, onDark = false, variant = 'buttons' }: FeedbackButtonsProps) {
  const { t } = useI18n()
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function send(next: Verdict) {
    setError(null)
    try {
      await api.feedback(query, expertId, next)
      setVerdict(next)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const thanks = verdict === 'fit' ? t.card.thanksFit : t.card.thanksNotFit
  const errorNote = error && (
    <span role="alert" className={`self-center text-sm ${onDark ? 'text-amber' : 'text-danger'}`}>
      {errorText(error, t)}
    </span>
  )

  if (variant === 'icons') {
    if (verdict) {
      return (
        <p role="status" title={thanks} className="flex min-h-11 items-center gap-2 text-sm font-semibold text-cobalt-deep">
          <VerdictIcon verdict={verdict} />
          {t.card.noted}
          <span className="sr-only">{thanks}</span>
        </p>
      )
    }
    const base =
      'grid size-11 cursor-pointer place-items-center border-2 border-ink/25 bg-transparent text-ink transition-colors duration-150'
    return (
      <div className="flex gap-1.5">
        <button type="button" aria-label={t.card.fit} title={t.card.fit} onClick={() => send('fit')} className={`${base} hover:border-ink hover:bg-lime`}>
          <VerdictIcon verdict="fit" />
        </button>
        <button
          type="button"
          aria-label={t.card.notFit}
          title={t.card.notFit}
          onClick={() => send('not_fit')}
          className={`${base} hover:border-ink hover:bg-ink hover:text-white`}
        >
          <VerdictIcon verdict="not_fit" />
        </button>
        {errorNote}
      </div>
    )
  }

  if (verdict) {
    return (
      <p role="status" className={`min-h-11 content-center text-[15px] font-medium ${onDark ? 'text-lime' : 'text-cobalt-deep'}`}>
        {thanks}
      </p>
    )
  }
  return (
    <>
      <Button variant={onDark ? 'lime' : 'ink'} onClick={() => send('fit')}>
        {t.card.fit}
      </Button>
      <Button variant={onDark ? 'outline-dark' : 'outline'} onClick={() => send('not_fit')}>
        {t.card.notFit}
      </Button>
      {errorNote}
    </>
  )
}
