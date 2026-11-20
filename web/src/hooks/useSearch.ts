import { useCallback, useRef, useState } from 'react'
import { api, type SearchRequest, type SearchResponse } from '../lib/api'

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; data: SearchResponse }
  | { status: 'error'; message: string }

export function useSearch() {
  const [state, setState] = useState<SearchState>({ status: 'idle' })
  const lastRequest = useRef(0)

  const run = useCallback(async (request: SearchRequest) => {
    const id = ++lastRequest.current
    setState({ status: 'loading' })
    try {
      const data = await api.search(request)
      if (id === lastRequest.current) setState({ status: 'done', data })
    } catch (error) {
      if (id === lastRequest.current) setState({ status: 'error', message: (error as Error).message })
    }
  }, [])

  return { state, run }
}
