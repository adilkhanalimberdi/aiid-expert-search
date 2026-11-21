import { useSyncExternalStore } from 'react'

/**
 * Общее состояние поиска для фона-неба и строки состояния: оба живут вне страницы поиска,
 * поэтому не через пропсы, а через маленькое хранилище. Только то, что нужно для отображения.
 */
export type PulseMode = 'idle' | 'searching' | 'found' | 'weak' | 'error'

export interface Pulse {
  mode: PulseMode
  /** сколько экспертов в выдаче: столько точек неба загорается */
  hits: number
  /** id найденных: от них зависит, какие точки загорятся (одинаковый ответ, одинаковая картина) */
  seed: string
  tookMs: number | null
  /** размер каталога: столько точек на небе */
  experts: number
}

let pulse: Pulse = { mode: 'idle', hits: 0, seed: '', tookMs: null, experts: 0 }
const listeners = new Set<() => void>()

export function setPulse(next: Partial<Pulse>): void {
  pulse = { ...pulse, ...next }
  listeners.forEach((listener) => listener())
}

export function getPulse(): Pulse {
  return pulse
}

export function subscribePulse(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePulse(): Pulse {
  return useSyncExternalStore(subscribePulse, getPulse, getPulse)
}
