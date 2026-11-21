import { useEffect, useState } from 'react'
import { Shell } from './components/Shell'
import { useAsync } from './hooks/useAsync'
import { api } from './lib/api'
import { setPulse } from './lib/pulse'
import { TABS, type TabId } from './lib/tabs'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { DataPage } from './pages/DataPage'
import { SearchPage } from './pages/SearchPage'

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest('input, textarea, select, [contenteditable]'))
}

export default function App() {
  const [tab, setTab] = useState<TabId>('search')
  // растёт после загрузки CSV: каталог, отрасли и размер неба перечитываются
  const [catalogVersion, setCatalogVersion] = useState(0)
  const health = useAsync((signal) => api.health(signal), [catalogVersion])

  useEffect(() => {
    if (health.data) setPulse({ experts: health.data.experts })
  }, [health.data])

  function changeTab(next: TabId) {
    setTab(next)
    window.scrollTo({ top: 0 })
  }

  function ask() {
    setTab('search')
    // поле в DOM всегда (экраны прячутся, а не размонтируются): фокус после показа раздела
    requestAnimationFrame(() => document.getElementById('query')?.focus())
  }

  // «/» ставит курсор в запрос с любого раздела, 1–3 переключают разделы
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return
      if (document.querySelector('[role="dialog"]')) return
      if (event.key === '/') {
        event.preventDefault()
        ask()
        return
      }
      const index = Number(event.key) - 1
      if (index >= 0 && index < TABS.length) changeTab(TABS[index])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <Shell tab={tab} onTab={changeTab}>
      {/* Экраны остаются в дереве, чтобы поиск не терялся при переключении разделов */}
      <main>
        <div hidden={tab !== 'search'}>
          <SearchPage catalogVersion={catalogVersion} />
        </div>
        <div hidden={tab !== 'data'}>
          <DataPage isActive={tab === 'data'} health={health} onUploaded={() => setCatalogVersion((value) => value + 1)} catalogVersion={catalogVersion} />
        </div>
        <div hidden={tab !== 'analytics'}>
          <AnalyticsPage isActive={tab === 'analytics'} />
        </div>
      </main>
    </Shell>
  )
}
