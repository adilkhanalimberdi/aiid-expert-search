import { useCallback, useState } from 'react'

const STORAGE_KEY = 'lodestar.recent-queries'
const MAX_RECENT = 5

function read(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

/** Последние запросы пользователя; без доступа к localStorage просто работает без истории. */
export function useRecentQueries() {
  const [recent, setRecent] = useState<string[]>(read)

  const remember = useCallback((query: string) => {
    setRecent((previous) => {
      const next = [query, ...previous.filter((item) => item !== query)].slice(0, MAX_RECENT)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // история необязательна: ошибку хранилища игнорируем осознанно
      }
      return next
    })
  }, [])

  return { recent, remember }
}
