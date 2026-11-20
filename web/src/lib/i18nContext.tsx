import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setApiLanguage } from './api'
import { DICTIONARIES, isLanguage, type Language } from './i18n'
import { I18nContext } from './useI18n'

const STORAGE_KEY = 'sarap.lang'

function readStored(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isLanguage(stored) ? stored : 'en'
  } catch {
    return 'en'
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const initial = readStored()
    setApiLanguage(initial)
    return initial
  })

  const setLang = useCallback((next: Language) => {
    // сначала язык запросов, затем состояние: эффекты страниц уже перезапросят обоснования на новом языке
    setApiLanguage(next)
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // выбор языка необязательно запоминать: ошибку хранилища игнорируем осознанно
    }
  }, [])

  const t = DICTIONARIES[lang]

  useEffect(() => {
    document.documentElement.lang = lang
    document.title = t.meta.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', t.meta.description)
  }, [lang, t])

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
