import { useEffect, useState } from 'react'

export interface AsyncState<T> {
  data: T | null
  error: string | null
  isLoading: boolean
}

/** Загружает данные при смене зависимостей; устаревшие ответы игнорируются. */
export function useAsync<T>(load: (() => Promise<T>) | null, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, isLoading: load !== null })

  useEffect(() => {
    if (!load) return
    let isCurrent = true
    setState((previous) => ({ ...previous, error: null, isLoading: true }))
    load().then(
      (data) => isCurrent && setState({ data, error: null, isLoading: false }),
      (error: Error) => isCurrent && setState({ data: null, error: error.message, isLoading: false }),
    )
    return () => {
      isCurrent = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}
