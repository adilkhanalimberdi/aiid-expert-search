import type { ReactNode } from 'react'
import { HornBackdrop } from './Logo'
import { SyntheticNotice } from './SyntheticNotice'

/** Кобальтовая шапка экрана: узор из завитушек, навигация, содержимое и лаймовая плашка о данных. */
export function HeroBand({ nav, children }: { nav: ReactNode; children: ReactNode }) {
  return (
    <section className="on-dark relative overflow-hidden bg-cobalt text-white">
      <HornBackdrop />
      <div className="relative mx-auto max-w-[1120px] px-4 sm:px-6">
        {nav}
        {children}
      </div>
      <SyntheticNotice />
    </section>
  )
}

/** Заголовок внутренних экранов (Данные, Аналитика) в той же шапке. */
export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="pb-14 pt-10 text-center font-display text-5xl font-light tracking-[-0.035em] sm:text-[72px] sm:leading-none">
      {children}
    </h1>
  )
}
