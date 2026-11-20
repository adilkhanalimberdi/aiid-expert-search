import type { Availability } from '../lib/api'
import { useI18n } from '../lib/useI18n'

const TILE: Record<Availability, string> = {
  available: 'bg-free',
  partial: 'bg-partial',
  busy: 'bg-busy',
}

/** Статус квадратной плиткой и словом: цвет не единственный носитель смысла. */
export function StatusDot({ availability, onDark = false }: { availability: Availability; onDark?: boolean }) {
  const { t } = useI18n()
  const tile = onDark && availability === 'available' ? 'bg-turquoise-glow' : TILE[availability]
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span aria-hidden className={`size-2.5 ${tile}`} />
      {t.status[availability]}
    </span>
  )
}
