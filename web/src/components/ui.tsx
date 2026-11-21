import type { ComponentPropsWithRef, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

// Общие элементы интерфейса: скругление 8 px, шафран для главного действия, тонкие рамки для остального.
// Наведение подсвечивает тёплым тоном или зеленью, но никогда не затемняет элемент.

type Variant = 'primary' | 'secondary' | 'ghost' | 'positive' | 'quiet'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-action text-action-ink hover:bg-action-hover active:translate-y-px',
  secondary: 'border border-line-strong bg-surface text-ink hover:border-brand-soft hover:bg-hover',
  ghost: 'text-brand-deep hover:bg-brand-tint',
  quiet: 'text-ink-2 hover:bg-hover hover:text-brand-deep',
  positive: 'border border-brand bg-surface text-brand-deep hover:bg-brand-tint',
}

interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ variant = 'secondary', size = 'md', className = '', type = 'button', ...rest }: ButtonProps) {
  const sizing = { sm: 'min-h-9 px-3 text-sm', md: 'min-h-11 px-4 text-[15px]', lg: 'min-h-12 px-6 text-base' }[size]
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-[background-color,border-color,color,transform] duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${sizing} ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  )
}

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative inline-flex">
      <select
        className={`h-10 min-w-0 max-w-full appearance-none rounded-lg border border-line-strong bg-surface py-0 pl-3 pr-9 text-sm font-medium text-ink hover:border-brand-soft ${className}`}
        {...rest}
      >
        {children}
      </select>
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </span>
  )
}

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
}

export function Checkbox({ label, className = '', ...rest }: CheckboxProps) {
  return (
    <label className={`inline-flex min-h-10 items-center gap-2.5 text-sm font-medium text-ink-2 ${className}`}>
      <input type="checkbox" className="check" {...rest} />
      {label}
    </label>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`sk ${className}`} />
}

/** Белая панель рабочей области. */
export function Panel({ className = '', children, ...rest }: ComponentPropsWithRef<'section'>) {
  return (
    <section className={`rounded-xl border border-line bg-surface ${className}`} {...rest}>
      {children}
    </section>
  )
}

/** Заголовок панели: обычный регистр, вес вместо прописных. */
export function PanelTitle({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <h2 id={id} className={`serif text-[19px] font-semibold tracking-[-0.01em] text-ink ${className}`}>
      {children}
    </h2>
  )
}

interface SegmentedProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}

/** Переключатель вида: родные радиокнопки, выглядят как сегменты. */
export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex gap-1 border-b border-line">
      {options.map((option) => (
        <label
          key={option.value}
          className={`-mb-px border-b-2 px-3 pb-2 pt-1 text-sm font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${
            value === option.value ? 'border-brand text-brand-deep' : 'border-transparent text-ink-3 hover:text-brand-deep'
          }`}
        >
          <input
            type="radio"
            className="sr-only"
            name={label}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  )
}
