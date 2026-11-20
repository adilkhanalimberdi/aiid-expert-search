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
    <div role="alert" className="flex flex-wrap items-center gap-4 border-2 border-danger bg-white p-5 text-danger">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{t.errors.title}</p>
        <p className="mt-1 text-[15px]">{errorText(message, t)}</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="!border-danger !text-danger hover:!bg-danger hover:!text-white">
          {t.errors.retry}
        </Button>
      )}
    </div>
  )
}
