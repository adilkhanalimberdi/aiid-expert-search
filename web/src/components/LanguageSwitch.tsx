import { LANGUAGES } from '../lib/i18n'
import { useI18n } from '../lib/useI18n'

export function LanguageSwitch() {
  const { lang, setLang, t } = useI18n()
  return (
    <div role="group" aria-label={t.nav.language} className="flex gap-0.5">
      {LANGUAGES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          lang={code}
          className={`min-h-11 min-w-12 cursor-pointer text-[13px] font-semibold tracking-[0.06em] ${
            lang === code ? 'bg-ochre text-grout' : 'bg-smalt-deep/55 text-white hover:bg-smalt-deep'
          }`}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
