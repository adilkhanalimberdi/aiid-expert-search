# Подбор экспертов AIID

Сервис находит экспертов Альянса по запросу обычным языком и объясняет выбор. Работает полностью офлайн.

> Демо-прототип. Все данные синтетические и не содержат реальных персональных данных.

## Что умеет

- Запрос на русском (и казахском) вместо фильтров: «нужен специалист по GMP и клиническим исследованиям из Алматы»
- Топ-3+ эксперта с процентом соответствия и причинами: совпавшие компетенции, отрасль, город, опыт
- Занятые эксперты ниже в выдаче, их можно скрыть
- Фильтр по отрасли поверх текстового запроса
- Загрузка своей базы из CSV без перезапуска
- Кнопки «подошёл / не подошёл» влияют на выдачу
- Дашборд востребованных компетенций

## Точность

На эталонных запросах: **[X] из [N]** в топ-3, среднее время ответа **[0,00] с**. Пересчитать: `.venv\Scripts\python.exe backend\scripts\eval.py`.

## Запуск

Нужны Python 3.11+, Node 20+. Windows (PowerShell), из корня репозитория:

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -U pip "huggingface_hub[cli]"
.venv\Scripts\python.exe -m pip install torch --index-url https://download.pytorch.org/whl/cpu
.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.venv\Scripts\hf.exe download BAAI/bge-m3 --local-dir backend\models\bge-m3 --exclude "onnx/*" "imgs/*"   # ~2,3 ГБ, один раз
Copy-Item .env.example .env

cd backend; ..\.venv\Scripts\python.exe -m uvicorn app.main:app   # API: http://localhost:8000/docs
cd web; npm install; npm run dev                                   # UI:  http://localhost:5173
```

macOS / Linux: те же шаги, `source .venv/bin/activate`, затем `pip`, `hf`, `uvicorn` без путей.

## Как это работает

Гибридный поиск: BM25 по леммам ловит точные термины (GMP, BIM), модель эмбеддингов `bge-m3` ловит смысл («испытания» и «исследования»). Списки сливаются через Reciprocal Rank Fusion, затем учитываются город, отрасль и занятость. Обоснование собирается из реальных полей эксперта, без генерации текста. Подробности в [AGENTS.md](AGENTS.md).

## Команда

[Имена и роли]
