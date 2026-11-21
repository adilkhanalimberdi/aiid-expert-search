import type { ReactNode } from 'react'
import { LANGUAGES } from '../lib/i18n'
import { TABS, type TabId } from '../lib/tabs'
import { useAsync } from '../hooks/useAsync'
import { api } from '../lib/api'
import { useI18n } from '../lib/useI18n'
import { Brand, SarapMark } from './Logo'

/** Ширина и поля рабочей области: одинаковые у шапки и у содержимого, края совпадают. */
export const CONTAINER = 'mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8'

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
    analytics: <path d="M5 20V11M12 20V5M19 20v-6" />,
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths[tab]}
    </svg>
  )
}

function LanguageSwitch() {
  const { lang, setLang, t } = useI18n()
  return (
    <div role="group" aria-label={t.nav.language} className="flex rounded-lg border border-night-line p-0.5">
      {LANGUAGES.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
          className={`h-8 min-w-10 rounded-md px-2.5 text-[13px] font-semibold transition-colors ${
            lang === code ? 'bg-night-2 text-action' : 'text-night-dim hover:text-night-text'
          }`}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

interface ShellProps {
  tab: TabId
  onTab: (tab: TabId) => void
  children: ReactNode
}

/**
 * Оболочка: тёмно-синяя верхняя панель (лого-лок, разделы, язык) и под ней плашка о синтетических данных.
 * Обе прилипают к верху, поэтому плашка видна на любом экране. На телефоне разделы второй строкой панели.
 */
export function Shell({ tab, onTab, children }: ShellProps) {
  const { t } = useI18n()
  const health = useAsync(() => api.health(), [])

  const tabs = (className: string) =>
    TABS.map((id) => (
      <li key={id} className={className}>
        <button
          type="button"
          onClick={() => onTab(id)}
          aria-current={tab === id ? 'page' : undefined}
          className={`relative flex h-full w-full items-center justify-center gap-2 px-2 text-[15px] font-medium transition-colors md:px-4 ${
            tab === id ? 'text-night-text' : 'text-night-dim hover:text-night-text'
          }`}
        >
          <span className={tab === id ? 'text-spark' : ''}>
            <NavIcon tab={id} />
          </span>
          {t.nav[id]}
          {tab === id && <span aria-hidden className="absolute inset-x-4 bottom-0 h-0.5 rounded-t-full bg-spark" />}
        </button>
      </li>
    ))

  return (
    <div className="min-h-screen">
      <a
        href="#content"
        className="sr-only z-50 rounded-lg bg-action px-4 py-2 font-semibold text-action-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        {t.nav.skip}
      </a>

      <header className="on-dark sticky top-0 z-30 bg-night shadow-[0_1px_0_var(--color-night-line)]">
        <div className={`${CONTAINER} flex h-16 items-center gap-6 lg:h-[72px]`}>
          <Brand />
          <nav aria-label={t.nav.sections} className="hidden h-full flex-1 justify-center md:flex">
            <ul className="flex h-full">{tabs('h-full')}</ul>
          </nav>
          <div className="ml-auto md:ml-0">
            <LanguageSwitch />
          </div>
        </div>
        <nav aria-label={t.nav.sections} className="border-t border-night-line md:hidden">
          <ul className="grid h-12 grid-cols-3">{tabs('h-full')}</ul>
        </nav>
        <div className="border-t border-night-line bg-night-2 text-night-dim">
          <p className={`${CONTAINER} flex items-center gap-3 py-1.5 text-xs`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden className="flex-none">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5M12 7.6v.01" />
            </svg>
            <span className="min-w-0 text-night-text">{t.synthetic}</span>
            {health.data && (
              <span className="mono ml-auto hidden items-center gap-2 whitespace-nowrap sm:flex">
                <span aria-hidden className="size-1.5 rounded-full bg-brand-soft" />
                {t.offline} · {health.data.model.split('/').pop()}
              </span>
            )}
          </p>
        </div>
      </header>

      <div id="content">{children}</div>

      <footer className="mt-10 border-t border-line">
        <div className={`${CONTAINER} flex flex-wrap items-center justify-between gap-3 py-6 text-sm text-ink-3`}>
          <span className="flex items-center gap-2.5">
            <SarapMark size={18} />
            {t.footer}
          </span>
          <span className="mono text-xs">AIID · 2026</span>
        </div>
      </footer>
    </div>
  )
}

/** Заголовок раздела внутри рабочей области. */
export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 pb-6 pt-8 lg:pt-10">
      <div className="min-w-0">
        <h1 className="serif text-[30px] font-semibold leading-tight tracking-[-0.015em] sm:text-[36px]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[15px] text-ink-2">{subtitle}</p>}
      </div>
      {children}
    </header>
  )
}
