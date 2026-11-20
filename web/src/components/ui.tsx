import type { ComponentPropsWithRef, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

// Общие элементы интерфейса Sarap: острые углы, рамка 2 px, лайм для главного действия.

type Variant = 'lime' | 'ink' | 'cobalt' | 'outline' | 'outline-dark' | 'quiet'

const VARIANTS: Record<Variant, string> = {
  lime: 'bg-lime text-ink hover:-translate-y-0.5 hover:bg-lime-soft',
  ink: 'bg-ink text-white hover:bg-cobalt-deep',
  cobalt: 'bg-cobalt text-white hover:bg-cobalt-deep',
  outline: 'border-2 border-ink bg-white text-ink hover:bg-lime',
  'outline-dark': 'border-2 border-white/55 bg-transparent text-white hover:border-lime hover:bg-lime hover:text-ink',
  quiet: 'bg-transparent text-cobalt-deep hover:bg-ink/5',
}

interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ variant = 'ink', size = 'md', className = '', type = 'button', ...rest }: ButtonProps) {
  const sizing = { sm: 'min-h-11 px-4 text-sm', md: 'min-h-12 px-6 text-[15px]', lg: 'min-h-16 px-14 text-[19px]' }[size]
  return (
    <button
      type={type}
      className={`inline-flex cursor-pointer items-center justify-center gap-3 font-semibold transition-[transform,background,color,border-color] duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${sizing} ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  )
}

export function ArrowRight() {
  return (
    <svg width="22" height="14" viewBox="0 0 22 14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" aria-hidden>
      <path d="M1 7h19M14 1l6 6-6 6" />
    </svg>
  )
}

function Chevron() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="square"
      aria-hidden
      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2"
    >
      <path d="M5 9l7 7 7-7" />
    </svg>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  tone?: 'dark' | 'light'
}

/** Список с нарисованной стрелкой: родное поведение select, внешний вид системы. */
export function Select({ tone = 'light', className = '', children, ...rest }: SelectProps) {
  const palette = tone === 'dark' ? 'bg-ink text-white' : 'border-2 border-ink bg-white text-ink'
  return (
    <span className={`relative inline-block ${tone === 'dark' ? 'text-white' : 'text-ink'}`}>
      <select
        className={`h-12 min-w-52 cursor-pointer appearance-none rounded-none py-0 pl-4 pr-12 text-[15px] font-medium ${palette} ${className}`}
        {...rest}
      >
        {children}
      </select>
      <Chevron />
    </span>
  )
}

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
  tone?: 'dark' | 'light'
}

export function Checkbox({ label, tone = 'light', className = '', ...rest }: CheckboxProps) {
  return (
    <label className={`flex min-h-12 cursor-pointer items-center gap-3 text-[15px] font-medium ${className}`}>
      <input type="checkbox" className={`check ${tone === 'dark' ? 'check-on-dark' : ''}`} {...rest} />
      {label}
    </label>
  )
}
