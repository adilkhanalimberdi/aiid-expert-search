import { createContext, useContext } from 'react'
import type { Dict, Language } from './i18n'

export interface I18nValue {
  lang: Language
  setLang: (lang: Language) => void
  t: Dict
}

export const I18nContext = createContext<I18nValue | null>(null)

export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n вызван вне I18nProvider')
  return value
}
