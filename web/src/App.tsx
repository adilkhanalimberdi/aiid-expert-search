import { useState } from 'react'
import { AiidLogo } from './components/Logo'
import { Frieze, SarapMark } from './components/Mosaic'
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
      <footer className="on-dark bg-grout text-white">
        <Frieze />
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-6 px-4 py-10 sm:px-6">
          <div className="flex items-center gap-4">
            <SarapMark size={34} />
            <span className="font-display text-2xl font-medium tracking-[-0.02em]">Sarap</span>
            <span aria-hidden className="h-7 w-0.5 bg-white/30" />
            <AiidLogo height={34} />
          </div>
          <p className="max-w-[460px] text-sm leading-relaxed text-white/70">{t.footer}</p>
        </div>
      </footer>
    </div>
  )
}
