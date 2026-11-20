import type { Availability } from '../lib/api'
import { AVAILABILITY_LABEL } from '../lib/format'

const STYLES: Record<Availability, string> = {
  available: 'bg-free-bg text-free-fg',
  partial: 'bg-partial-bg text-partial-fg',
  busy: 'bg-busy-bg text-busy-fg',
}

export function StatusPill({ availability }: { availability: Availability }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${STYLES[availability]}`}>
      {AVAILABILITY_LABEL[availability]}
    </span>
  )
}
