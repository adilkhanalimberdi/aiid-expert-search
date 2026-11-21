import type { ReactNode } from 'react'
import { LANGUAGES } from '../lib/i18n'
import { TABS, type TabId } from '../lib/tabs'
import { useI18n } from '../lib/useI18n'
import { Icon, type IconName } from './Icon'
import { Brand } from './Logo'
import { Sky } from './Sky'

/** Ширина и поля рабочей области: одинаковые у панели и у содержимого, края совпадают. */
export const CONTAINER = 'mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8'

const TAB_ICON: Record<TabId, IconName> = { search: 'search', data: 'database', analytics: 'chart' }

function LanguageSwitch() {
  const { lang, setLang, t } = useI18n()
  return (
    <div role="group" aria-label={t.nav.language} className="flex gap-0.5">
      {LANGUAGES.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
          className={`h-8 min-w-9 rounded-md px-2 text-[13px] font-medium transition-colors ${
            lang === code ? 'bg-raised text-ink' : 'text-ink-3 hover:text-ink'
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
 * Оболочка рабочего инструмента: сверху строка со знаком, разделами (клавиши 1–3) и языком,
 * снизу тонкая строка с пометкой о синтетических данных, всегда на виду. За всем небо каталога.
 */
export function Shell({ tab, onTab, children }: ShellProps) {
  const { t } = useI18n()

  return (
    <div className="flex min-h-screen flex-col pb-12">
      <Sky />
      <a
        href="#content"
        className="sr-only z-50 rounded-md bg-action px-4 py-2 font-semibold text-action-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        {t.nav.skip}
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-ground/95">
        <div className={`${CONTAINER} flex h-14 items-center gap-3 sm:gap-5`}>
          <Brand />
          <span aria-hidden className="hidden h-5 w-px bg-line-strong sm:block" />
          <nav aria-label={t.nav.sections} className="h-full">
            <ul className="flex h-full">
              {TABS.map((id, index) => {
                const isActive = tab === id
                return (
                  <li key={id} className="h-full">
                    <button
                      type="button"
                      onClick={() => onTab(id)}
                      aria-current={isActive ? 'page' : undefined}
                      aria-keyshortcuts={String(index + 1)}
                      title={t.bar.sectionKey(index + 1)}
                      className={`relative flex h-full items-center gap-2 px-2.5 text-[14px] font-medium transition-colors sm:px-3 ${
                        isActive ? 'text-ink' : 'text-ink-3 hover:text-ink'
                      }`}
                    >
                      <Icon name={TAB_ICON[id]} size={17} className={isActive ? 'text-action' : ''} />
                      <span className="sr-only sm:not-sr-only">{t.nav[id]}</span>
                      {isActive && <span aria-hidden className="absolute inset-x-2 -bottom-px h-0.5 bg-action" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
          <span className="flex-1" />
          <LanguageSwitch />
        </div>
      </header>

      <div id="content" className="flex-1">
        {children}
      </div>

      {/* строка состояния прилипает к низу на любом экране, поэтому пометка о данных видна всегда, даже поверх окна профиля */}
      <footer className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-sunken">
        <div className={`${CONTAINER} flex min-h-8 items-center gap-4 py-1.5 text-[12px]`}>
          <p className="flex min-w-0 items-center gap-2 text-ink-2">
            <Icon name="info" size={14} className="text-ink-3" />
            <span className="min-w-0">{t.synthetic}</span>
          </p>
        </div>
      </footer>
    </div>
  )
}

/** Заголовок раздела: строка-метка и одна строка пояснения, без крупных лозунгов. */
export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 pb-5 pt-6 lg:pt-8">
      <div className="min-w-0">
        <h1 className="display text-[22px] font-semibold tracking-[0.01em] text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-[14px] text-ink-2">{subtitle}</p>}
      </div>
      {children}
    </header>
  )
}
