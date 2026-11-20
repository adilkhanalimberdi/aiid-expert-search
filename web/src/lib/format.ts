import type { Availability } from './api'

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  available: 'Available',
  partial: 'Partly available',
  busy: 'Busy',
}

export const EXAMPLE_QUERIES = [
  'GMP and clinical trials specialist in Almaty',
  'Cybersecurity expert from Astana',
  'DevOps engineer with 5+ years of experience',
  'Нужен специалист по BIM-проектированию, Астана',
  'Алматыдан өнеркәсіптік қауіпсіздік маманы керек',
]

export const MODE_LABEL: Record<string, string> = {
  hybrid: 'Hybrid',
  bm25: 'BM25 only',
  vector: 'Vector only',
}

export function initials(fullName: string): string {
  return fullName
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export function yearsLabel(years: number): string {
  return `${years} ${years === 1 ? 'year' : 'years'}`
}
