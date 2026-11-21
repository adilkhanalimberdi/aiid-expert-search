import { initials } from '../lib/format'

// Тона из палитры: цвет выбирается по имени и не меняется между экранами
const TONES = [
  'bg-brand-tint text-brand-deep border-brand-soft',
  'bg-place-tint text-place border-place-soft',
  'bg-cond-tint text-cond border-cond-soft',
  'bg-raised text-ink-2 border-line-strong',
]

function toneOf(name: string): string {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return TONES[hash % TONES.length]
}

/** Инициалы в квадрате: у синтетических экспертов фото нет, а список людей не должен выглядеть таблицей. */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'size-14 text-base rounded-lg' : 'size-9 text-[12px] rounded-md'
  return (
    <span aria-hidden className={`mono grid flex-none place-items-center border font-medium ${box} ${toneOf(name)}`}>
      {initials(name)}
    </span>
  )
}
