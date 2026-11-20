import type { ReactNode } from 'react'

/** Набор иконок одной толщины (2 px на 24): стрелки, отметки и значки полей разбора запроса. */
export type IconName =
  | 'arrow-right'
  | 'arrow-left'
  | 'check'
  | 'x'
  | 'info'
  | 'search'
  | 'skill'
  | 'pin'
  | 'industry'
  | 'clock'
  | 'available'
  | 'ban'
  | 'reset'
  | 'upload'
  | 'database'
  | 'chart'

const PATHS: Record<IconName, ReactNode> = {
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  'arrow-left': <path d="M19 12H5M11 6l-6 6 6 6" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  x: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.6v.01" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
  skill: <path d="M12 3.5l2.4 5 5.4.7-4 3.8 1 5.4L12 15.8 7.2 18.4l1-5.4-4-3.8 5.4-.7z" />,
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  industry: <path d="M3.5 20.5V10l5 3V10l5 3V6.5h3l1 14M3.5 20.5h17" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  available: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.2l2.4 2.4 4.6-4.8" />
    </>
  ),
  ban: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M6 18L18 6" />
    </>
  ),
  reset: <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4" />,
  upload: <path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />,
  database: (
    <>
      <ellipse cx="12" cy="6" rx="7.5" ry="3" />
      <path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" />
    </>
  ),
  chart: <path d="M5 20V11M12 20V5M19 20v-6" />,
}

export function Icon({ name, size = 18, className = '', strokeWidth = 2 }: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`flex-none ${className}`}
    >
      {PATHS[name]}
    </svg>
  )
}
