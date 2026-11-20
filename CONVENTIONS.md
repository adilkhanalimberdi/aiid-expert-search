# Соглашения команды

Обязательно для людей и агентов. Цель одна: к 09:00 на `master` лежит рабочая версия, которую можно показать жюри.

## Язык

- Код, имена переменных и файлов, ветки: английский.
- Комментарии, docstring, сообщения коммитов, документация: русский.
- Интерфейс (тексты на экране): английский.

## Git

### Ветки

- `master` всегда рабочая. С неё запускается демо.
- Работаем в коротких ветках от `master`. Живут часы, не дни.
- Имя ветки: `<тип>/<коротко-латиницей>`.

| Тип | Пример | Для чего |
| --- | --- | --- |
| `feat` | `feat/engine-rrf` | новая функциональность |
| `fix` | `fix/csv-bom` | исправление |
| `ui` | `ui/expert-card` | фронт |
| `data` | `data/generator` | данные, словари, эталонные запросы |
| `docs` | `docs/readme` | документация |
| `chore` | `chore/ruff` | инструменты, зависимости |

### Коммиты

Формат [Conventional Commits](https://www.conventionalcommits.org/ru/): `<тип>(<зона>): <что сделано>`.

```text
feat(engine): добавить слияние BM25 и вектора через RRF
fix(api): вернуть 400 вместо 500 на CSV без колонки city
data(dict): добавить синонимы для промбезопасности
ui(web): карточка лучшего кандидата по макету
```

- Типы: `feat`, `fix`, `refactor`, `perf`, `data`, `ui`, `docs`, `test`, `chore`.
- Зоны: `engine`, `api`, `data`, `dict`, `web`, `docs`, `infra`.
- Описание по-русски, с глагола в инфинитиве, до 72 символов, без точки в конце.
- Один коммит = одна логическая правка. «Поправил всё» не принимается.

### Как вливаем в master

1. `git pull --rebase origin master` в своей ветке.
2. Проверки по зоне (раздел «Готово» ниже) зелёные.
3. Pull request на GitHub, один человек смотрит diff. Ночью, если ждать некого: владелец зоны сам делает merge, но пишет в чат команды.
4. После merge ветку удаляем.

- Напрямую в `master` можно только правки документации.
- `push --force` только в свою ветку, никогда в `master`.
- Конфликт в чужой зоне: не решаем сами, зовём владельца.

### Не коммитим

`.env`, `.venv/`, `backend/models/`, `*.npy`, `backend/data/cache/`, `backend/data/feedback.db`, `node_modules/`, `web/dist/`. Всё это уже в `.gitignore`.

## Зоны владения

Чтобы не править одни и те же файлы одновременно.

| Зона | Файлы | Владелец |
| --- | --- | --- |
| engine | `backend/app/` кроме `main.py`, `schemas.py` | [имя] |
| api | `backend/app/main.py`, `backend/app/schemas.py` | [имя] |
| data | `backend/data/`, `backend/scripts/generate_data.py` | [имя] |
| web | `web/` | [имя] |
| docs, питч | `*.md`, презентация | [имя] |

Контракт API общий: `backend/app/schemas.py` и `web/src/lib/api.ts` меняются только вместе, одним коммитом.

## Python (backend)

- Python 3.12 из `.venv`. Стиль PEP 8.
- Форматирование и линт: ruff, настройки в `backend/pyproject.toml`. Перед коммитом: `.venv\Scripts\ruff.exe format backend` и `.venv\Scripts\ruff.exe check backend --fix`.
- Типы обязательны в сигнатурах функций. Пишем `list[str]`, `X | None`.

| Что | Как | Пример |
| --- | --- | --- |
| модули, функции, переменные | `snake_case` | `query_parser.py`, `expand_synonyms()` |
| классы, Pydantic-модели | `PascalCase` | `SearchIndex`, `SearchResponse` |
| константы и веса | `UPPER_SNAKE_CASE`, только в `config.py` | `BOOST_CITY_MATCH` |
| булевы | `is_`, `has_` | `is_weak_match` |
| приватное | `_` в начале | `_load_stopwords()` |

- Внутри `app` импорты относительные: `from .config import settings`.
- В `app` никаких `print`: только `logging.getLogger(__name__)`. В `scripts` `print` можно.
- Ошибки API: `HTTPException` с понятным `detail` по-русски. Плохой ввод пользователя даёт 400 или 422, никогда 500.
- Дорогое (модель, словари, морфология) загружается один раз: при старте или через `functools.lru_cache`.
- Docstring одной строкой по-русски: что делает функция, а не как.

## TypeScript и React (web)

- Только функциональные компоненты и хуки.
- Линт `npm run lint` (oxlint), сборка `npm run build` перед merge.

| Что | Как | Пример |
| --- | --- | --- |
| компоненты и их файлы | `PascalCase`, файл = компонент | `ExpertCard.tsx` |
| хуки | `useSomething` | `useSearch.ts` |
| утилиты, переменные, функции | `camelCase` | `formatPercent()` |
| типы и интерфейсы | `PascalCase` | `SearchResult`, `ExpertCardProps` |
| константы модуля | `UPPER_SNAKE_CASE` | `EXAMPLE_QUERIES` |

```text
web/src/
  components/   переиспользуемые куски: ExpertCards, ScoreFigure, StatusDot
  pages/        экраны: SearchPage, DataPage, AnalyticsPage
  hooks/        useSearch, useStats
  lib/          api.ts, i18n.ts, format.ts
```

- Стили только классами Tailwind и токенами из `src/index.css`. HEX-цвета в JSX запрещены: нужен цвет, добавь токен.
- Поля из API остаются в `snake_case` как пришли (`match_percent`). Не переименовываем, чтобы типы совпадали со `schemas.py`.
- Тексты интерфейса только через словари `src/lib/i18n.ts` (EN, RU, KK), строк в JSX нет. Обычный регистр, кнопки начинаются с глагола («Find experts», «Найти экспертов»).

## API и данные

- Пути: `/api/<сущность>`, сущности во множественном числе, через дефис: `/api/experts/{id}`.
- Поля JSON и колонки CSV: `snake_case`.
- id экспертов: `E001`, `E002`, … Эталонные запросы ссылаются на них же.
- Словари (`backend/data/dictionaries/`) пишем в леммах, нижним регистром.

## Готово

| Зона | Когда можно вливать |
| --- | --- |
| engine, dict | `eval.py` не хуже, чем на `master`; итог вставлен в описание PR |
| api | эндпоинт виден в Swagger, ручной запрос отвечает как в контракте |
| web | проверено на ширине 390 и 1280 px, есть состояния загрузки, пусто, ошибка |
| data | `generate_data.py` детерминирован, CSV грузится без ошибок |
