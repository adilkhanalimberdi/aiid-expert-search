import type { Availability } from './api'

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  available: 'Свободен',
  partial: 'Частично занят',
  busy: 'Занят',
}

export const EXAMPLE_QUERIES = [
  'Нужен специалист по GMP и клиническим исследованиям из Алматы',
  'BIM-проектирование промышленных объектов, Астана',
  'Кто может внедрить компьютерное зрение на заводе',
  'Аудитор ISO 9001 с опытом от 10 лет',
  'Алматыдан өнеркәсіптік қауіпсіздік маманы керек',
]

export const MODE_LABEL: Record<string, string> = {
  hybrid: 'Гибрид',
  bm25: 'Только BM25',
  vector: 'Только вектор',
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
  const lastTwo = years % 100
  const last = years % 10
  if (lastTwo >= 11 && lastTwo <= 14) return `${years} лет`
  if (last === 1) return `${years} год`
  if (last >= 2 && last <= 4) return `${years} года`
  return `${years} лет`
}
