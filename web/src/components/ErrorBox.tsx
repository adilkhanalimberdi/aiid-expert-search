import { errorText } from '../lib/errors'
import { useI18n } from '../lib/useI18n'
import { Button } from './ui'

interface ErrorBoxProps {
  message: string
  onRetry?: () => void
}

export function ErrorBox({ message, onRetry }: ErrorBoxProps) {
  const { t } = useI18n()
  return (
    <div role="alert" className="flex flex-wrap items-center gap-4 border-2 border-terracotta bg-terracotta-soft p-5 text-grout">
      <span aria-hidden className="size-4 flex-none bg-terracotta" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-terracotta">{t.errors.title}</p>
        <p className="mt-1 text-[15px]">{errorText(message, t)}</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          {t.errors.retry}
        </Button>
      )}
    </div>
  )
}
