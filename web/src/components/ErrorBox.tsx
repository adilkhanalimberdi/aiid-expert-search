import { errorText } from '../lib/errors'
import { useI18n } from '../lib/useI18n'
import { Button } from './ui'

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n()
  return (
    <div role="alert" className="flex flex-wrap items-center gap-4 rounded-xl border border-danger-soft bg-danger-tint p-4 sm:p-5">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="flex-none text-danger">
        <circle cx="12" cy="12" r="9.5" />
        <path d="M12 7.5v5.5M12 16.5v.01" />
      </svg>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-danger">{t.errors.title}</p>
        <p className="mt-0.5 text-[15px] text-ink">{errorText(message, t)}</p>
      </div>
      {onRetry && <Button onClick={onRetry}>{t.errors.retry}</Button>}
    </div>
  )
}
