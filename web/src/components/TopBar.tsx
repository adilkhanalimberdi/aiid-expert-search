import { TABS, type TabId } from '../lib/tabs'
import { useI18n } from '../lib/useI18n'
import { LanguageSwitch } from './LanguageSwitch'
import { Brand } from './Logo'

interface TopBarProps {
  tab: TabId
  onTab: (tab: TabId) => void
}

/** Бренд слева, разделы по центру, язык справа. */
export function TopBar({ tab, onTab }: TopBarProps) {
  const { t } = useI18n()
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4 py-5">
      <div className="flex flex-[1_1_240px] items-center">
        <Brand />
      </div>
      <nav aria-label={t.nav.sections} className="order-last flex w-full justify-center gap-1 sm:order-none sm:w-auto">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onTab(id)}
            aria-current={tab === id ? 'page' : undefined}
            className={`min-h-11 cursor-pointer px-5 text-[15px] transition-colors ${
              tab === id ? 'bg-ink font-semibold text-white' : 'font-medium text-white hover:bg-white/10'
            }`}
          >
            {t.nav[id]}
          </button>
        ))}
      </nav>
      <div className="flex flex-[1_1_120px] justify-end">
        <LanguageSwitch />
      </div>
    </div>
  )
}
