import { useI18n } from '../lib/useI18n'
import { SarapMark } from './Mosaic'

export function Skeleton({ className = '', dark = false }: { className?: string; dark?: boolean }) {
  return <div aria-hidden className={`${dark ? 'sk-dark' : 'sk'} ${className}`} />
}

/** Заглушка выдачи повторяет структуру готовой: панель, пара, строки; страница не прыгает. */
export function ResultsSkeleton() {
  const { t } = useI18n()
  return (
    <div role="status" aria-label={t.search.searching} className="space-y-10">
      <div className="flex items-center gap-4">
        <span className="grid size-14 place-items-center bg-smalt">
          <SarapMark size={30} isLaying />
        </span>
        <span className="font-display text-xl font-light tracking-[-0.02em] sm:text-2xl">{t.search.searching}</span>
      </div>
      <Skeleton className="h-10 w-3/4" />
      <div className="flex flex-col bg-smalt md:flex-row">
        <div className="flex-1 p-8">
          <Skeleton dark className="h-11 w-4/5" />
          <Skeleton dark className="mt-4 h-5 w-1/2" />
          <Skeleton dark className="mt-9 h-11 w-full" />
          <Skeleton dark className="mt-2 h-11 w-full" />
        </div>
        <div className="flex flex-1 gap-6 bg-smalt-deep/45 p-8">
          <Skeleton dark className="size-[168px] flex-none" />
          <div className="flex-1">
            <Skeleton dark className="h-24 w-28" />
            <Skeleton dark className="mt-8 h-4 w-full" />
            <Skeleton dark className="mt-4 h-4 w-4/5" />
          </div>
        </div>
      </div>
      <div className="grid gap-0.5 bg-seam md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="bg-plaster p-7">
            <Skeleton className="h-[84px] w-40" />
            <Skeleton className="mt-5 h-6 w-3/5" />
            <Skeleton className="mt-3 h-4 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  )
}
