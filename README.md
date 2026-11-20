# Lodestar: подбор экспертов для AIID

Сервис находит экспертов Альянса по запросу обычным языком и объясняет выбор. Работает полностью офлайн.

> Демо-прототип. Все данные синтетические и не содержат реальных персональных данных.

![Экран поиска](docs/screenshot-search.png)

## Что умеет

- Запрос на русском (и казахском) вместо фильтров: «нужен специалист по GMP и клиническим исследованиям из Алматы»
- Топ-3+ эксперта с процентом соответствия и причинами: совпавшие компетенции, отрасль, город, опыт
- Занятые эксперты ниже в выдаче, их можно скрыть
- Фильтр по отрасли поверх текстового запроса
- Загрузка своей базы из CSV без перезапуска
- Кнопки «подошёл / не подошёл» влияют на выдачу
- Дашборд востребованных компетенций и «спрос без предложения» (запросы, на которые нет подходящих экспертов)
- Why not them?, Build a team, Similar experts (кнопки интерфейса на английском)
- Слабое совпадение честно помечается: на запрос вне базы (например, «юрист по налогам») сервис говорит, что точных совпадений нет

## Точность

Локальная bge-m3, CPU, 4 потока, прогретая модель, без отзывов.

| Набор | Режим | hit@3 | Среднее, мс | p95, мс |
| --- | --- | --- | --- | --- |
| eval_queries.json | hybrid | 7/7 | 161.9 | 185.6 |
| eval_queries.json | bm25 | 6/7 | 180.9 | 194.7 |
| eval_queries.json | vector | 7/7 | 211.4 | 224.5 |
| eval_holdout.json | hybrid | 10/10 | 203.2 | 246.2 |
| eval_holdout.json | bm25 | 10/10 | 188.2 | 222.3 |
| eval_holdout.json | vector | 10/10 | 200.9 | 233.9 |
| eval_jury.json | hybrid | 14/15 | 173.2 | 197.1 |
| eval_jury.json | bm25 | 7/15 | 189.7 | 233.2 |
| eval_jury.json | vector | 15/15 | 173.0 | 193.7 |
| eval_english.json | hybrid | 12/12 | 161.8 | 189.2 |
| eval_english.json | bm25 | 11/12 | 158.1 | 178.2 |
| eval_english.json | vector | 11/12 | 165.0 | 178.2 |

Наборы: `eval_queries` (7 запросов с ловушками), `eval_holdout` (10 запросов, написаны вместе с данными: даже BM25 даёт 10/10, поэтому он слабый показатель), `eval_english` (12 запросов на английском), `eval_jury` (15 запросов другими словами; релевантность считается правилом по компетенциям, а не по id). Единственный промах гибрида на `eval_jury` — «проектирование электрических сетей для завода»: нужный эксперт стоит первым в обоих списках, но занят (×0,7).

Время включает построение объяснений; даже в режиме BM25 вектор нужен для процента и смысловой близости.
Пересчитать все режимы: `.venv\Scripts\python.exe backend\scripts\eval.py --all`.

## Запуск

Нужны Python 3.11+ (у нас 3.12), Node 20+. База данных не нужна. Windows (PowerShell), из корня репозитория:

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -U pip "huggingface_hub[cli]"
.venv\Scripts\python.exe -m pip install torch --index-url https://download.pytorch.org/whl/cpu
.venv\Scripts\python.exe -m pip install -r backend\requirements-dev.txt
.venv\Scripts\hf.exe download BAAI/bge-m3 --local-dir backend\models\bge-m3 --exclude "onnx/*" --exclude "imgs/*"   # ~2,3 ГБ, один раз
Copy-Item .env.example .env

cd backend; ..\.venv\Scripts\python.exe -m uvicorn app.main:app   # API: http://localhost:8000/docs
cd web; npm install; npm run dev                                   # UI:  http://localhost:5173
```

Или всё в Docker (модель всё равно скачать заранее командой выше):

```powershell
docker compose up --build   # UI: http://localhost:8080, API: http://localhost:8000/docs
```

Если `docker compose` пишет `dial tcp 127.0.0.1:2375: connectex: ... refused`, в окружении задана `DOCKER_HOST=tcp://127.0.0.1:2375`, а Docker Desktop не слушает этот порт. Запустите Docker Desktop и дождитесь «Engine running», затем уберите переменную в текущей сессии: `Remove-Item Env:DOCKER_HOST` (PowerShell). Либо включите в настройках Docker Desktop «Expose daemon on tcp://localhost:2375 without TLS».

Деплой на сервер и требования к памяти: [docs/deploy.md](docs/deploy.md).

macOS / Linux: те же шаги, `source .venv/bin/activate`, затем `pip`, `hf`, `uvicorn` без путей.

## Как это работает

Гибридный поиск: BM25 по леммам ловит точные термины (GMP, BIM), модель эмбеддингов `bge-m3` ловит смысл («испытания» и «исследования»). Списки сливаются через Reciprocal Rank Fusion, затем учитываются город, отрасль и занятость. Обоснование собирается из реальных полей эксперта, без генерации текста. Подробности в [AGENTS.md](AGENTS.md).

## Команда

[Имена и роли]
