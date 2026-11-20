import type { ReactNode } from 'react'
import { Frieze, MosaicBackdrop } from './Mosaic'
import { SyntheticNotice } from './SyntheticNotice'

/** Ультрамариновая шапка экрана: плитки смальты по краям, навигация, содержимое, фриз и плашка о данных. */
export function HeroBand({ nav, children }: { nav: ReactNode; children: ReactNode }) {
  return (
    <section className="on-dark relative overflow-hidden bg-smalt text-white">
      <MosaicBackdrop />
      <div className="relative mx-auto max-w-[1120px] px-4 sm:px-6">
        {nav}
        {children}
      </div>
      <Frieze className="relative" />
      <SyntheticNotice />
    </section>
  )
}

/** Заголовок внутренних экранов (Данные, Аналитика) в той же шапке. */
export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="pb-14 pt-10 text-center font-display text-[40px] font-light leading-none tracking-[-0.03em] sm:text-[64px]">
      {children}
    </h1>
  )
}
