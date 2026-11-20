import { useState } from 'react'
import { api } from '../lib/api'

interface FeedbackButtonsProps {
  query: string
  expertId: string
}

export function FeedbackButtons({ query, expertId }: FeedbackButtonsProps) {
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
      <p className="text-sm text-muted" role="status">
        {verdict === 'fit' ? 'Thanks, noted: a good fit' : 'Thanks, noted: not a fit'}
      </p>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => send('fit')}
        className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-teal-tint"
      >
        Good fit
      </button>
      <button
        type="button"
        onClick={() => send('not_fit')}
        className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-busy-bg"
      >
        Not a fit
      </button>
      {error && <span className="text-sm text-danger">{error}</span>}
    </div>
  )
}
