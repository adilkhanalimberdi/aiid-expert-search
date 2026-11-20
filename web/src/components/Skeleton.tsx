export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-line/70 ${className}`} />
}

/** Заглушка карточки эксперта: той же высоты, что и готовая, чтобы страница не прыгала. */
export function ExpertCardSkeleton({ isLarge = false }: { isLarge?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5" role="status" aria-label="Загрузка">
      <div className="flex items-center gap-4">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <Skeleton className="size-16 rounded-full" />
      </div>
      <div className="mt-5 space-y-2">
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
        {isLarge && <Skeleton className="h-3 w-3/4" />}
      </div>
    </div>
  )
}
