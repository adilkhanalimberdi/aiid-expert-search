// Типы повторяют backend/app/schemas.py. Меняешь там: меняй и здесь.

export type Availability = 'available' | 'partial' | 'busy'

export interface ParsedQuery {
  city: string | null
  industry: string | null
  min_experience: number | null
  terms: string[]
}

export interface SearchResult {
  id: string
  full_name: string
  position: string
  organization: string | null
  city: string
  industry: string
  experience_years: number
  availability: Availability
  match_percent: number
  matched: string[]
  related: string[]
  reasons: string[]
  debug: Record<string, unknown>
}

export interface SearchResponse {
  parsed: ParsedQuery
  weak_match: boolean
  took_ms: number
  results: SearchResult[]
}

export interface SearchRequest {
  query: string
  industry?: string | null
  top_k?: number
  hide_busy?: boolean
}

// В dev запросы идут через прокси Vite (/api → :8000). VITE_API_URL нужен для сборки без прокси.
const BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL ?? '')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `Ошибка сервера: ${res.status}`)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

export const api = {
  search: (req: SearchRequest) =>
    request<SearchResponse>('/api/search', { method: 'POST', body: JSON.stringify(req) }),
  industries: () => request<string[]>('/api/industries'),
  feedback: (query: string, expert_id: string, verdict: 'fit' | 'not_fit') =>
    request<void>('/api/feedback', { method: 'POST', body: JSON.stringify({ query, expert_id, verdict }) }),
  health: () => request<{ status: string; experts: number; model: string }>('/api/health'),
}
