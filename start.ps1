# Sarap одной командой (Windows PowerShell): .\start.ps1
# Скачивает модель через Docker, если её нет (один раз, ~2,3 ГБ, нужен интернет), собирает и поднимает
# бэкенд и фронт, ждёт готовности и печатает адреса. Дальше работает без сети.
# Порты: $env:WEB_PORT=8090; $env:BACKEND_PORT=8010; .\start.ps1   Остановить: docker compose down
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker не запущен. Запустите Docker Desktop и дождитесь «Engine running», затем повторите."
    exit 1
}

if (-not (Test-Path "backend\models\bge-m3\config.json")) {
    Write-Host "Модели нет в backend\models\bge-m3: скачиваю через Docker (один раз, ~2,3 ГБ)…"
    docker compose --profile setup run --rm model
    if ($LASTEXITCODE -ne 0) { exit 1 }
}

docker compose up --build -d
if ($LASTEXITCODE -ne 0) { exit 1 }

$port = if ($env:WEB_PORT) { $env:WEB_PORT } else { "8080" }
Write-Host "Жду готовности (первый старт до ~1 мин: модель и векторы каталога)…"
$ready = $false
for ($i = 0; $i -lt 120; $i++) {
    try {
        Invoke-WebRequest -UseBasicParsing "http://localhost:$port/api/health" -TimeoutSec 3 | Out-Null
        $ready = $true
        break
    } catch {
        Start-Sleep -Seconds 2
    }
}
if (-not $ready) {
    Write-Error "Не дождался ответа. Логи: docker compose logs backend"
    exit 1
}

Write-Host "Готово."
Write-Host "  Интерфейс:        http://localhost:$port"
Write-Host "  API и Swagger:    http://localhost:$port/docs"
Write-Host "  В локальной сети: http://<IP этого компьютера>:$port"
