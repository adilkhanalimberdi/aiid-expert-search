# web

Фронт подбора экспертов: Vite + React + TypeScript + Tailwind v4. Шрифты Onest и Geologica идут локально через Fontsource, без CDN.

```powershell
npm install
npm run dev     # http://localhost:5173, /api проксируется на http://127.0.0.1:8000
npm run build
```

Токены дизайна в `src/index.css`, клиент API в `src/lib/api.ts`, тексты интерфейса на трёх языках в `src/lib/i18n.ts`. Подробности в корневом AGENTS.md.
