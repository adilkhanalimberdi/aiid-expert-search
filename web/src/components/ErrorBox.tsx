interface ErrorBoxProps {
  message: string
  onRetry?: () => void
}

export function ErrorBox({ message, onRetry }: ErrorBoxProps) {
  return (
    <div role="alert" className="rounded-2xl border border-line bg-white p-5">
      <p className="font-semibold">Что-то пошло не так</p>
      <p className="mt-1 text-muted">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">
          Повторить
        </button>
      )}
    </div>
  )
}
