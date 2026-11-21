import { useState } from 'react'
import { api } from '../lib/api'
import { errorText } from '../lib/errors'
import { useI18n } from '../lib/useI18n'
import { Button } from './ui'

type Verdict = 'fit' | 'not_fit'

function Icon({ verdict }: { verdict: Verdict }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {verdict === 'fit' ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />}
    </svg>
  )
}

/** «Подошёл / не подошёл» по эксперту и запросу; после ответа сервера показывает подтверждение. */
export function FeedbackButtons({ query, expertId }: { query: string; expertId: string }) {
  const { t } = useI18n()
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [pending, setPending] = useState<Verdict | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function send(next: Verdict) {
    setPending(next)
    setError(null)
    try {
      await api.feedback(query, expertId, next)
      setVerdict(next)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setPending(null)
    }
  }

  if (verdict) {
    return (
      <p role="status" className="flex min-h-11 items-center gap-2 rounded-lg bg-brand-tint px-3 text-sm font-semibold text-brand-deep">
        <Icon verdict={verdict} />
        {verdict === 'fit' ? t.card.thanksFit : t.card.thanksNotFit}
      </p>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="positive" onClick={() => send('fit')} disabled={pending !== null}>
        <Icon verdict="fit" />
        {t.card.fit}
      </Button>
      <Button onClick={() => send('not_fit')} disabled={pending !== null}>
        <Icon verdict="not_fit" />
        {t.card.notFit}
      </Button>
      {error && (
        <span role="alert" className="text-sm font-medium text-danger">
          {errorText(error, t)}
        </span>
      )}
    </div>
  )
}
