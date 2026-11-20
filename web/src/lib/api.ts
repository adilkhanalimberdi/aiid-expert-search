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

export interface Expert {
  id: string
  full_name: string
  position: string
  industry: string
  competencies: string[]
  city: string
  experience_years: number
  availability: Availability
  organization: string | null
  bio: string | null
  languages: string[]
  email: string | null
}

export interface ExpertExplanation {
  parsed: ParsedQuery
  expert: SearchResult
  missing_terms: string[]
  constraints: string[]
}

export interface TeamRequest {
  query: string
  industry?: string | null
  hide_busy?: boolean
  max_members?: number
}

export interface TeamResponse {
  parsed: ParsedQuery
  members: SearchResult[]
  coverage: { expert_id: string; terms: Record<string, boolean> }[]
  uncovered_terms: string[]
  complete: boolean
  took_ms: number
}

export interface UploadResponse {
  loaded: number
  skipped: number
  errors: string[]
}

export interface StatsResponse {
  total_queries: number
  avg_took_ms: number
  fit_rate: number | null
  top_competencies: { term: string; count: number }[]
  evaluations: Record<string, unknown>[]
}

export interface FeedbackRequest {
  query: string
  expert_id: string
  verdict: 'fit' | 'not_fit'
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
