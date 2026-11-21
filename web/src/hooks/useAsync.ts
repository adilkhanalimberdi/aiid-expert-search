import { useEffect, useState } from 'react'
import { isAbort } from '../lib/api'

export interface AsyncState<T> {
  data: T | null
  error: string | null
  isLoading: boolean
}

/**
 * Загружает данные при смене зависимостей. Предыдущий запрос отменяется (AbortController),
 * а не просто игнорируется: сервер не считает лишнего. load = null: ничего не грузить (скрытая вкладка).
 */
export function useAsync<T>(load: ((signal: AbortSignal) => Promise<T>) | null, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, isLoading: load !== null })

  useEffect(() => {
    if (!load) return
    const controller = new AbortController()
    setState((previous) => ({ ...previous, error: null, isLoading: true }))
    load(controller.signal).then(
      (data) => setState({ data, error: null, isLoading: false }),
      (error: Error) => {
        if (!isAbort(error)) setState({ data: null, error: error.message, isLoading: false })
      },
    )
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}
