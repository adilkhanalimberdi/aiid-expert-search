import { useState } from 'react'
import { Shell } from './components/Shell'
import type { TabId } from './lib/tabs'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { DataPage } from './pages/DataPage'
import { SearchPage } from './pages/SearchPage'

export default function App() {
  const [tab, setTab] = useState<TabId>('search')

  function changeTab(next: TabId) {
    setTab(next)
    window.scrollTo({ top: 0 })
  }

  return (
    <Shell tab={tab} onTab={changeTab}>
      {/* Экраны остаются в дереве, чтобы поиск не терялся при переключении разделов */}
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
    </Shell>
  )
}
