import { useI18n } from '../lib/useI18n'
import { Volutes } from './Logo'

export function Skeleton({ className = '', dark = false }: { className?: string; dark?: boolean }) {
  return <div aria-hidden className={`${dark ? 'sk-dark' : 'sk'} ${className}`} />
}

/** Заглушка выдачи повторяет структуру готовой: панель, пара, строки; страница не прыгает. */
export function ResultsSkeleton() {
  const { t } = useI18n()
  return (
    <div role="status" aria-label={t.search.searching} className="space-y-10">
      <div className="flex items-center gap-5">
        <Volutes width={84} left="var(--color-ink)" right="var(--color-cobalt)" strokeWidth={1.8} isDrawing />
        <span className="font-display text-2xl font-light tracking-[-0.03em] sm:text-3xl">{t.search.searching}</span>
      </div>
      <Skeleton className="h-11 w-3/4" />
      <div className="flex flex-col bg-ink md:flex-row">
        <div className="flex-1 p-8">
          <Skeleton dark className="h-12 w-4/5" />
          <Skeleton dark className="mt-4 h-5 w-1/2" />
          <Skeleton dark className="mt-9 h-12 w-full" />
          <Skeleton dark className="mt-2 h-12 w-full" />
        </div>
        <div className="flex-1 border-white/20 p-8 md:border-l">
          <Skeleton dark className="h-32 w-56" />
          <Skeleton dark className="mt-7 h-1 w-full" />
          <Skeleton dark className="mt-11 h-4 w-2/5" />
          <Skeleton dark className="mt-5 h-4 w-full" />
          <Skeleton dark className="mt-4 h-4 w-4/5" />
        </div>
      </div>
      <div className="grid border-2 border-ink bg-white md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-5 p-7 md:border-l-2 md:border-ink md:first:border-l-0">
            <Skeleton className="h-20 w-24 flex-none" />
            <div className="flex-1">
              <Skeleton className="h-6 w-3/5" />
              <Skeleton className="mt-3 h-4 w-4/5" />
              <Skeleton className="mt-5 h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
