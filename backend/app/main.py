"""FastAPI-приложение. Эндпоинты из AGENTS.md; пока работает только /api/health."""

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .schemas import (
    FeedbackRequest,
    HealthResponse,
    SearchRequest,
    SearchResponse,
    StatsResponse,
    UploadResponse,
)

app = FastAPI(title="AIID: подбор экспертов", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

# TODO(этап 3): при старте загрузить CSV, построить индекс (index.build) и держать его в app.state


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    experts = getattr(app.state, "experts", [])
    return HealthResponse(status="ok", experts=len(experts), model=settings.model_path)


@app.post("/api/search", response_model=SearchResponse)
def search(req: SearchRequest) -> SearchResponse:
    raise HTTPException(status_code=501, detail="Поиск ещё не реализован")


@app.post("/api/upload", response_model=UploadResponse)
async def upload(file: UploadFile) -> UploadResponse:
    raise HTTPException(status_code=501, detail="Загрузка ещё не реализована")


@app.get("/api/experts/{expert_id}")
def get_expert(expert_id: str):
    raise HTTPException(status_code=501, detail="Ещё не реализовано")


@app.get("/api/industries", response_model=list[str])
def industries() -> list[str]:
    raise HTTPException(status_code=501, detail="Ещё не реализовано")


@app.post("/api/feedback", status_code=204)
def feedback(req: FeedbackRequest) -> None:
    raise HTTPException(status_code=501, detail="Ещё не реализовано")


@app.get("/api/stats", response_model=StatsResponse)
def stats() -> StatsResponse:
    raise HTTPException(status_code=501, detail="Ещё не реализовано")
