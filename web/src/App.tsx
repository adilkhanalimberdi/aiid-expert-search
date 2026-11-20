import { useState } from 'react'
import { Constellation } from './components/Constellation'
import { AiidLogo, Brand } from './components/Logo'
import { SyntheticNotice } from './components/SyntheticNotice'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { DataPage } from './pages/DataPage'
import { SearchPage } from './pages/SearchPage'

const TABS = [
  { id: 'search', label: 'Search' },
  { id: 'data', label: 'Data' },
  { id: 'analytics', label: 'Analytics' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function App() {
  const [tab, setTab] = useState<TabId>('search')

  return (
    <div className="relative min-h-screen">
      {/* Лёгкое созвездие на светлом фоне страницы; за шапкой, карточками и тёмным блоком его не видно */}
      <Constellation
        dotColorVar="--color-teal"
        lineColorVar="--color-teal"
        density={5}
        intensity={0.35}
        className="fixed inset-0 z-0 size-full"
      />
      <div className="relative z-10 flex min-h-screen flex-col">
      <header className="bg-ink">
        <nav className="mx-auto flex max-w-[1160px] flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-6" aria-label="Sections">
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
      <main className="flex-1">
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
      <footer className="bg-ink text-ground">
        <div className="mx-auto flex max-w-[1160px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-6 sm:px-6">
          <AiidLogo height={52} />
          <p className="max-w-xl text-sm text-ground/80">
            Lodestar is an expert matching service for the AIID ecosystem. It runs offline, with no external
            services. The AIID logo is shown here to demonstrate how the service fits into the AIID portal.
          </p>
        </div>
      </footer>
      </div>
    </div>
  )
}
