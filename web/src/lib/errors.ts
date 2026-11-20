import { NETWORK_ERROR, SERVER_ERROR_PREFIX } from './api'
import type { Dict } from './i18n'

/** Переводит код ошибки клиента на язык интерфейса; текст сервера (detail) показываем как есть. */
export function errorText(message: string, t: Dict): string {
  if (message === NETWORK_ERROR) return t.errors.network
  if (message.startsWith(SERVER_ERROR_PREFIX)) return t.errors.server(Number(message.slice(SERVER_ERROR_PREFIX.length)))
  return message
}
