import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Все три шрифта содержат казахские буквы ә ғ қ ң ө ұ ү һ і (проверено fontTools по подмножествам cyrillic и cyrillic-ext)
import '@fontsource-variable/commissioner/wght.css'
import '@fontsource-variable/tektur/wght.css'
import '@fontsource-variable/fira-code/wght.css'
import './index.css'
import App from './App.tsx'
import { I18nProvider } from './lib/i18nContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)
