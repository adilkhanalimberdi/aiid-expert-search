import { useState } from 'react'
import { api } from '../lib/api'
import { errorText } from '../lib/errors'
import { useI18n } from '../lib/useI18n'
import { Button } from './ui'

interface FeedbackButtonsProps {
  query: string
  expertId: string
  onDark?: boolean
  compact?: boolean
}

export function FeedbackButtons({ query, expertId, onDark = false, compact = false }: FeedbackButtonsProps) {
  const { t } = useI18n()
  const [verdict, setVerdict] = useState<'fit' | 'not_fit' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function send(next: 'fit' | 'not_fit') {
    setError(null)
    try {
      await api.feedback(query, expertId, next)
      setVerdict(next)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (verdict) {
    return (
      <p role="status" className={`min-h-11 content-center text-[15px] font-medium ${onDark ? 'text-lime' : 'text-cobalt-deep'}`}>
        {verdict === 'fit' ? t.card.thanksFit : t.card.thanksNotFit}
      </p>
    )
  }
  return (
    <>
      <Button size={compact ? 'sm' : 'md'} variant={onDark ? 'lime' : 'ink'} onClick={() => send('fit')}>
        {t.card.fit}
      </Button>
      <Button size={compact ? 'sm' : 'md'} variant={onDark ? 'outline-dark' : 'outline'} onClick={() => send('not_fit')}>
        {t.card.notFit}
      </Button>
      {error && (
        <span role="alert" className={`self-center text-sm ${onDark ? 'text-amber' : 'text-danger'}`}>
          {errorText(error, t)}
        </span>
      )}
    </>
  )
}
