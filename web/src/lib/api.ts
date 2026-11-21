// Типы повторяют backend/app/schemas.py. Меняешь там: меняй и здесь.

import type { Language } from './i18n'

export type Availability = 'available' | 'partial' | 'busy'

export interface ParsedQuery {
  city: string | null
  industry: string | null
  min_experience: number | null
  terms: string[]
  /** в запросе просили свободных («свободный сейчас»): занятые не попадают в выдачу */
  available_only: boolean
  excluded_terms: string[]
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
  /** чем профиль подтверждает каждый термин запроса */
  evidence: TermEvidence[]
  /** из чего сложился процент */
  breakdown: ScoreBreakdown | null
  /** свободная замена занятому кандидату из топ-3 */
  alternative: Alternative | null
  debug: Record<string, unknown>
}

export interface TermEvidence {
  term: string
  kind: 'exact' | 'semantic' | 'missing'
  source: string | null
  similarity: number | null
  credit: number
}

export interface ScoreBreakdown {
  semantic: number
  coverage: number
  w_semantic: number
  w_coverage: number
  factors: { kind: 'city_match' | 'city_mismatch' | 'excluded'; value: number }[]
  capped: boolean
}

export interface Alternative {
  id: string
  full_name: string
  match_percent: number
  shared_terms: string[]
}

export interface SearchResponse {
  parsed: ParsedQuery
  weak_match: boolean
  took_ms: number
  results: SearchResult[]
  /** в запросе нет темы, только город или отрасль: процент не показываем */
  filter_only: boolean
}

export interface SearchRequest {
  query: string
  industry?: string | null
  top_k?: number
  hide_busy?: boolean
  lang?: Language
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

export interface ExpertPage {
  total: number
  offset: number
  items: Expert[]
}

export interface ExpertExplanation {
  parsed: ParsedQuery
  expert: SearchResult
  missing_terms: string[]
  constraints: string[]
}

export interface SimilarExpert {
  expert: Expert
  cosine: number
}

export interface TeamRequest {
  query: string
  industry?: string | null
  hide_busy?: boolean
  max_members?: number
  lang?: Language
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

export interface EvalRun {
  dataset: string
  mode: 'hybrid' | 'bm25' | 'vector'
  k: number
  hits: number
  total: number
  avg_ms: number
  p95_ms: number
}

export interface StatsResponse {
  total_queries: number
  avg_took_ms: number
  fit_rate: number | null
  top_competencies: { term: string; count: number }[]
  unmet_demand: { term: string; count: number }[]
  evaluations: EvalRun[]
}

export interface FeedbackRequest {
  query: string
  expert_id: string
  verdict: 'fit' | 'not_fit'
}

// В dev запросы идут через прокси Vite (/api → :8000). В сборке по умолчанию тот же адрес, что у страницы
// (бэкенд отдаёт фронт сам или nginx проксирует /api). VITE_API_URL нужен, только если API на другом хосте.
// Адрес localhost из сборки игнорируется, когда страницу открыли не с localhost: иначе на проде браузер
// посетителя стучится к себе на 127.0.0.1 («Cannot reach the server»).
const CONFIGURED_API = import.meta.env.VITE_API_URL ?? ''
const POINTS_TO_LOCALHOST = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(CONFIGURED_API)
const PAGE_IS_LOCAL = ['localhost', '127.0.0.1'].includes(window.location.hostname)
const BASE = import.meta.env.DEV || (POINTS_TO_LOCALHOST && !PAGE_IS_LOCAL) ? '' : CONFIGURED_API

// Язык обоснований (reasons, constraints) совпадает с языком интерфейса; меняется из I18nProvider
let uiLanguage: Language = 'en'

export function setApiLanguage(lang: Language): void {
  uiLanguage = lang
}

/** Коды ошибок: текст по ним подбирает интерфейс (lib/errors.ts), чтобы он был на языке пользователя. */
export const NETWORK_ERROR = 'network_error'
export const SERVER_ERROR_PREFIX = 'server_error:'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isJsonBody = typeof init?.body === 'string'
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: isJsonBody ? { 'Content-Type': 'application/json' } : undefined,
    })
  } catch (error) {
    // отменённый запрос (новый поиск, смена языка) не ошибка: пробрасываем как есть, вызывающий его игнорирует
    if ((error as Error).name === 'AbortError') throw error
    throw new Error(NETWORK_ERROR)
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(typeof body.detail === 'string' ? body.detail : `${SERVER_ERROR_PREFIX}${res.status}`)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

const post = <T>(path: string, body: unknown, signal?: AbortSignal) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body), signal })

/** Запрос отменён через AbortController: такой ответ просто отбрасываем. */
export function isAbort(error: unknown): boolean {
  return (error as Error)?.name === 'AbortError'
}

// signal в каждом вызове: устаревший запрос отменяется (новый поиск, смена языка, закрытая вкладка)
export const api = {
  search: (req: SearchRequest, signal?: AbortSignal) => post<SearchResponse>('/api/search', { lang: uiLanguage, ...req }, signal),
  team: (req: TeamRequest, signal?: AbortSignal) => post<TeamResponse>('/api/team', { lang: uiLanguage, ...req }, signal),
  industries: (signal?: AbortSignal) => request<string[]>('/api/industries', { signal }),
  experts: (offset = 0, limit = 20, signal?: AbortSignal) => request<ExpertPage>(`/api/experts?offset=${offset}&limit=${limit}`, { signal }),
  expert: (id: string, signal?: AbortSignal) => request<Expert>(`/api/experts/${encodeURIComponent(id)}`, { signal }),
  explain: (id: string, query: string, signal?: AbortSignal) =>
    request<ExpertExplanation>(`/api/experts/${encodeURIComponent(id)}/explain?query=${encodeURIComponent(query)}&lang=${uiLanguage}`, { signal }),
  similar: (id: string, limit = 5, signal?: AbortSignal) =>
    request<SimilarExpert[]>(`/api/experts/${encodeURIComponent(id)}/similar?limit=${limit}`, { signal }),
  feedback: (query: string, expert_id: string, verdict: FeedbackRequest['verdict']) =>
    post<void>('/api/feedback', { query, expert_id, verdict }),
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<UploadResponse>('/api/upload', { method: 'POST', body: form })
  },
  stats: (signal?: AbortSignal) => request<StatsResponse>('/api/stats', { signal }),
  health: (signal?: AbortSignal) => request<Health>('/api/health', { signal }),
}

export interface Health {
  status: string
  experts: number
  model: string
}
