#!/usr/bin/env sh
# Sarap одной командой (macOS, Linux): ./start.sh
# Скачивает модель через Docker, если её нет (один раз, ~2,3 ГБ, нужен интернет), собирает и поднимает
# бэкенд и фронт, ждёт готовности и печатает адреса. Дальше работает без сети.
# Порты: WEB_PORT=8090 BACKEND_PORT=8010 ./start.sh   Остановить: docker compose down
set -eu
cd "$(dirname "$0")"

if ! docker info >/dev/null 2>&1; then
  echo "Docker не запущен. Запустите Docker Desktop (или colima start) и повторите." >&2
  exit 1
fi

if [ ! -f backend/models/bge-m3/config.json ]; then
  echo "Модели нет в backend/models/bge-m3: скачиваю через Docker (один раз, ~2,3 ГБ)…"
  docker compose --profile setup run --rm model
fi

docker compose up --build -d

WEB_PORT="${WEB_PORT:-8080}"
echo "Жду готовности (первый старт до ~1 мин: модель и векторы каталога)…"
i=0
until curl -sf "http://localhost:${WEB_PORT}/api/health" >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -gt 120 ]; then
    echo "Не дождался ответа. Логи: docker compose logs backend" >&2
    exit 1
  fi
  sleep 2
done

echo "Готово."
echo "  Интерфейс:       http://localhost:${WEB_PORT}"
echo "  API и Swagger:   http://localhost:${WEB_PORT}/docs"
echo "  В локальной сети: http://<IP этого компьютера>:${WEB_PORT}"
