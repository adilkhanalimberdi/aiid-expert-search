import type { ReactNode } from 'react'
import { LANGUAGES } from '../lib/i18n'
import { TABS, type TabId } from '../lib/tabs'
import { useI18n } from '../lib/useI18n'
import { Brand } from './Logo'

function NavIcon({ tab }: { tab: TabId }) {
  const paths: Record<TabId, ReactNode> = {
    search: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4.5 4.5" />
      </>
    ),
    data: (
      <>
        <ellipse cx="12" cy="6" rx="7.5" ry="3" />
        <path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" />
      </>
    ),
    analytics: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths[tab]}
    </svg>
  )
}

function LanguageSwitch({ dense = false }: { dense?: boolean }) {
  const { lang, setLang, t } = useI18n()
  return (
    <div role="group" aria-label={t.nav.language} className="grid grid-cols-3 gap-0.5 rounded-lg bg-night-2 p-0.5">
      {LANGUAGES.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
          className={`rounded-md text-[13px] font-bold tracking-[0.04em] transition-colors ${dense ? 'h-8 min-w-10 px-2' : 'h-9'} ${
            lang === code ? 'bg-white text-night' : 'text-night-text hover:bg-night-line hover:text-white'
          }`}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

function SyntheticNote({ className = '' }: { className?: string }) {
  const { t } = useI18n()
  return (
    <p className={`flex items-start gap-2 text-xs leading-snug ${className}`}>
      <span aria-hidden className="mt-1 size-1.5 flex-none rounded-full bg-spark" />
      {t.synthetic}
    </p>
  )
}

interface ShellProps {
  tab: TabId
  onTab: (tab: TabId) => void
  children: ReactNode
}

/**
 * Оболочка приложения. На широком экране ночная боковая панель с разделами, языком и плашкой о данных.
 * На телефоне шапка с плашкой сверху и разделы в нижней панели: плашка видна всегда.
 */
export function Shell({ tab, onTab, children }: ShellProps) {
  const { t } = useI18n()
  const navItems = TABS.map((id) => ({ id, label: t.nav[id] }))

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_minmax(0,1fr)] lg:bg-[linear-gradient(to_right,var(--color-night)_248px,transparent_248px)]">
      <a
        href="#content"
        className="sr-only z-50 rounded-lg bg-brand px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        {t.nav.skip}
      </a>

      {/* широкий экран */}
      <aside className="on-dark sticky top-0 hidden h-screen flex-col bg-night px-4 pb-5 pt-6 text-night-text lg:flex">
        <div className="px-2">
          <Brand />
        </div>
        <nav aria-label={t.nav.sections} className="mt-9">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onTab(item.id)}
                  aria-current={tab === item.id ? 'page' : undefined}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-[15px] font-semibold transition-colors ${
                    tab === item.id ? 'bg-night-2 text-white' : 'text-night-text hover:bg-night-2/60 hover:text-white'
                  }`}
                >
                  <span className={tab === item.id ? 'text-brand-soft' : 'text-night-dim'}>
                    <NavIcon tab={item.id} />
                  </span>
                  {item.label}
                  {tab === item.id && <span aria-hidden className="ml-auto size-1.5 rounded-full bg-spark" />}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto space-y-4">
          <LanguageSwitch />
          <SyntheticNote className="border-t border-night-line pt-4 text-night-dim" />
          <p className="text-xs leading-snug text-night-dim">{t.footer}</p>
        </div>
      </aside>

      {/* телефон и планшет: шапка */}
      <header className="on-dark sticky top-0 z-30 bg-night text-night-text lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <Brand compact />
          <LanguageSwitch dense />
        </div>
        <SyntheticNote className="border-t border-night-line px-4 py-1.5 text-night-dim" />
      </header>

      <div id="content" className="min-w-0 pb-20 lg:pb-0">
        {children}
      </div>

      {/* телефон и планшет: разделы снизу */}
      <nav aria-label={t.nav.sections} className="on-dark fixed inset-x-0 bottom-0 z-30 border-t border-night-line bg-night lg:hidden">
        <ul className="grid grid-cols-3">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onTab(item.id)}
                aria-current={tab === item.id ? 'page' : undefined}
                className={`flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
                  tab === item.id ? 'text-white' : 'text-night-dim'
                }`}
              >
                <span className={tab === item.id ? 'text-brand-soft' : ''}>
                  <NavIcon tab={item.id} />
                </span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

/** Заголовок служебного раздела внутри рабочей области. */
export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 px-4 pb-2 pt-6 sm:px-7 lg:pt-8">
      <div className="min-w-0">
        <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-ink-2">{subtitle}</p>}
      </div>
      {children}
    </header>
  )
}
