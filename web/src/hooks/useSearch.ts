import { useCallback, useEffect, useRef, useState } from 'react'
import { api, isAbort, type SearchRequest, type SearchResponse } from '../lib/api'
import { setPulse } from '../lib/pulse'

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; data: SearchResponse }
  | { status: 'error'; message: string }

/** Поиск с отменой устаревшего запроса: новый запрос или смена языка обрывают предыдущий на сервере. */
export function useSearch() {
  const [state, setState] = useState<SearchState>({ status: 'idle' })
  const controller = useRef<AbortController | null>(null)

  const run = useCallback(async (request: SearchRequest) => {
    controller.current?.abort()
    const current = new AbortController()
    controller.current = current
    setState({ status: 'loading' })
    setPulse({ mode: 'searching' })
    try {
      const data = await api.search(request, current.signal)
      setState({ status: 'done', data })
      setPulse({
        mode: data.weak_match ? 'weak' : 'found',
        hits: data.results.length,
        seed: data.results.map((item) => item.id).join(','),
        tookMs: data.took_ms,
      })
    } catch (error) {
      if (isAbort(error)) return
      setState({ status: 'error', message: (error as Error).message })
      setPulse({ mode: 'error', hits: 0 })
    }
  }, [])

  /** Сброс к пустому экрану; запрос, который ещё летит, отменяется. */
  const reset = useCallback(() => {
    controller.current?.abort()
    setState({ status: 'idle' })
    setPulse({ mode: 'idle', hits: 0, seed: '' })
  }, [])

  useEffect(() => () => controller.current?.abort(), [])

  return { state, run, reset }
}
