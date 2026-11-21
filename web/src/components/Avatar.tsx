import { initials } from '../lib/format'

/** Инициалы в круге: у синтетических экспертов фото нет. Один спокойный тон, без цветового шума. */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'size-14 text-base' : 'size-9 text-[13px]'
  return (
    <span aria-hidden className={`grid flex-none place-items-center rounded-full bg-hover font-semibold text-ink-2 ${box}`}>
      {initials(name)}
    </span>
  )
}
