import type { Availability } from '../lib/api'
import { useI18n } from '../lib/useI18n'

const DOT: Record<Availability, string> = {
  available: 'bg-free',
  partial: 'bg-partial',
  busy: 'bg-busy',
}

/** Статус только точкой и словом: цвет не единственный носитель смысла. */
export function StatusDot({ availability }: { availability: Availability }) {
  const { t } = useI18n()
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span aria-hidden className={`size-2.5 rounded-full ${DOT[availability]}`} />
      {t.status[availability]}
    </span>
  )
}
