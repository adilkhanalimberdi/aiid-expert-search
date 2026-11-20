import { useState } from 'react'
import { Brand } from './components/Logo'
import { SyntheticNotice } from './components/SyntheticNotice'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { DataPage } from './pages/DataPage'
import { SearchPage } from './pages/SearchPage'

const TABS = [
  { id: 'search', label: 'Поиск' },
  { id: 'data', label: 'Данные' },
  { id: 'analytics', label: 'Аналитика' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function App() {
  const [tab, setTab] = useState<TabId>('search')

  return (
    <div className="min-h-screen">
      <header className="bg-ink">
        <nav className="mx-auto flex max-w-[1160px] flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-6" aria-label="Разделы">
          <Brand />
          <ul className="flex gap-1">
            {TABS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setTab(item.id)}
                  aria-current={tab === item.id ? 'page' : undefined}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === item.id ? 'bg-white text-ink' : 'text-ground hover:bg-white/10'}`}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mx-auto max-w-[1160px] px-4 pb-3 pt-3 sm:px-6">
          <SyntheticNotice />
        </div>
      </header>

      {/* Экраны остаются в дереве, чтобы поиск не терялся при переключении вкладок */}
      <main>
        <div hidden={tab !== 'search'}>
          <SearchPage />
        </div>
        <div hidden={tab !== 'data'}>
          <DataPage />
        </div>
        <div hidden={tab !== 'analytics'}>
          <AnalyticsPage isActive={tab === 'analytics'} />
        </div>
      </main>
      <footer className="border-t border-line px-4 py-6 text-center text-sm text-muted">
        Компас · подбор экспертов AIID · работает офлайн, без внешних сервисов
      </footer>
    </div>
  )
}
