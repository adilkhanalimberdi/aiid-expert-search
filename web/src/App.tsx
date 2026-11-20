import { useState } from 'react'
import { AiidLogo, Volutes } from './components/Logo'
import { TopBar } from './components/TopBar'
import type { TabId } from './lib/tabs'
import { useI18n } from './lib/useI18n'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { DataPage } from './pages/DataPage'
import { SearchPage } from './pages/SearchPage'

export default function App() {
  const { t } = useI18n()
  const [tab, setTab] = useState<TabId>('search')
  const nav = <TopBar tab={tab} onTab={setTab} />

  return (
    <div className="flex min-h-screen flex-col">
      {/* Экраны остаются в дереве, чтобы поиск не терялся при переключении вкладок */}
      <main className="flex-1">
        <div hidden={tab !== 'search'}>
          <SearchPage nav={nav} />
        </div>
        <div hidden={tab !== 'data'}>
          <DataPage nav={nav} />
        </div>
        <div hidden={tab !== 'analytics'}>
          <AnalyticsPage isActive={tab === 'analytics'} nav={nav} />
        </div>
      </main>
      <footer className="on-dark bg-ink px-6 py-14 text-center text-white">
        <div className="flex flex-col items-center gap-4">
          <Volutes width={92} strokeWidth={1.8} />
          <p className="font-display text-3xl font-light tracking-[-0.03em]">Sarap</p>
          <AiidLogo height={44} />
          <p className="max-w-[520px] text-sm leading-relaxed text-white/75">{t.footer}</p>
        </div>
      </footer>
    </div>
  )
}
