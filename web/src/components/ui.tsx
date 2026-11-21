import type { ComponentPropsWithRef, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

// Общие элементы интерфейса: скругление 6 px, сигнал для главного действия, тонкие рамки для остального.
// Наведение светлеет (слой графита выше, текст ярче), но никогда не затемняет элемент.

type Variant = 'primary' | 'secondary' | 'ghost' | 'positive' | 'quiet'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-action text-action-ink hover:bg-action-hover active:translate-y-px',
  secondary: 'bg-raised text-ink hover:bg-hover',
  ghost: 'text-ink-2 hover:bg-hover hover:text-ink',
  quiet: 'text-ink-2 hover:bg-hover hover:text-ink',
  positive: 'bg-raised text-ink hover:bg-hover',
}

interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ variant = 'secondary', size = 'md', className = '', type = 'button', ...rest }: ButtonProps) {
  const sizing = { sm: 'min-h-9 px-3 text-sm', md: 'min-h-10 px-4 text-[14px]', lg: 'min-h-12 px-5 text-[15px]' }[size]
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-[background-color,border-color,color,transform] duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${sizing} ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  )
}

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative inline-flex">
      <select
        className={`h-9 min-w-0 max-w-full appearance-none rounded-md border border-line-strong bg-sunken py-0 pl-3 pr-9 text-sm font-medium text-ink hover:border-ink-3 ${className}`}
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
    <label className={`inline-flex min-h-9 items-center gap-2.5 text-sm font-medium text-ink-2 hover:text-ink ${className}`}>
      <input type="checkbox" className="check" {...rest} />
      {label}
    </label>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`sk ${className}`} />
}

/** Панель рабочей области: слой графита над небом, без рамки. */
export function Panel({ className = '', children, ...rest }: ComponentPropsWithRef<'section'>) {
  return (
    <section className={`rounded-xl bg-surface ${className}`} {...rest}>
      {children}
    </section>
  )
}

/** Заголовок панели: моноширинная метка прописными, как подпись прибора. */
export function PanelTitle({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <h2 id={id} className={`label text-ink-2 ${className}`}>
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
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-line bg-sunken p-0.5">
      {options.map((option) => (
        <label
          key={option.value}
          className={`rounded-[5px] px-3 py-1.5 text-[13px] font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-action ${
            value === option.value ? 'bg-raised text-ink shadow-[inset_0_-2px_0_var(--color-action)]' : 'text-ink-3 hover:text-ink'
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
