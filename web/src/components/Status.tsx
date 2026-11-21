import type { Availability } from '../lib/api'
import { useI18n } from '../lib/useI18n'

/** Статус: знак разной формы (точка, кольцо, тире) и слово, чтобы смысл не держался на одном цвете. */
export function Status({ availability, className = '' }: { availability: Availability; className?: string }) {
  const { t } = useI18n()
  const mark = {
    available: <span className="size-2 rounded-full bg-free" />,
    partial: <span className="size-2.5 rounded-full border-2 border-partial" />,
    busy: <span className="h-0.5 w-2.5 rounded-full bg-busy" />,
  }[availability]
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium ${availability === 'busy' ? 'text-ink-3' : 'text-ink-2'} ${className}`}>
      <span aria-hidden className="grid w-2.5 place-items-center">
        {mark}
      </span>
      {t.status[availability]}
    </span>
  )
}
