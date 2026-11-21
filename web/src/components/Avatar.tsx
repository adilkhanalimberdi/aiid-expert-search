import { initials } from '../lib/format'

// Мягкие тона из палитры: цвет выбирается по имени и не меняется между экранами
const TONES = [
  'bg-brand-tint text-brand-deep',
  'bg-place-tint text-place',
  'bg-cond-tint text-cond',
  'bg-[#f3e4dc] text-[#8a3d22]',
  'bg-[#ece6da] text-ink-2',
]

function toneOf(name: string): string {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return TONES[hash % TONES.length]
}

/** Кружок с инициалами: у синтетических экспертов фото нет, а список людей не должен выглядеть таблицей. */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'size-14 text-lg' : 'size-10 text-sm'
  return (
    <span aria-hidden className={`grid flex-none place-items-center rounded-full serif font-semibold ${box} ${toneOf(name)}`}>
      {initials(name)}
    </span>
  )
}
