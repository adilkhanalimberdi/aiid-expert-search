import { LANGUAGES } from '../lib/i18n'
import { useI18n } from '../lib/useI18n'

export function LanguageSwitch() {
  const { lang, setLang, t } = useI18n()
  return (
    <div role="group" aria-label={t.nav.language} className="flex gap-1">
      {LANGUAGES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          lang={code}
          className={`min-h-11 min-w-12 cursor-pointer border-2 text-[13px] font-semibold tracking-[0.08em] transition-colors ${
            lang === code
              ? 'border-lime bg-lime text-ink'
              : 'border-white/55 bg-transparent text-white hover:border-white hover:bg-white/10'
          }`}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
