"""FastAPI: атомарная замена каталога, поиск, отзывы и аналитика."""

import logging
import threading
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from time import perf_counter

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from . import feedback as feedback_store
from . import index, ranker
from . import stats as stats_store
from .config import UPLOAD_MAX_BYTES, settings
from .data_loader import load_csv
from .schemas import (
    Expert,
    FeedbackRequest,
    HealthResponse,
    SearchRequest,
    SearchResponse,
    StatsResponse,
    UploadResponse,
)

logger = logging.getLogger(__name__)
_upload_lock = threading.Lock()


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    """Готовит индекс и модель до приёма первого поискового запроса."""
    started = perf_counter()
    uploaded = settings.path(settings.uploaded_csv)
    path = uploaded if uploaded.exists() else settings.path(settings.experts_csv)
    raw = path.read_bytes()
    experts, report = load_csv(raw)
    application.state.index = index.build(experts, raw)
    index.encode_query("проверка готовности")
    with feedback_store.connection():
        pass
    logger.info(
        "Индекс готов: %d экспертов, пропущено %d, %.2f с",
        len(experts),
        report.skipped,
        perf_counter() - started,
    )
    yield


app = FastAPI(title="AIID: подбор экспертов", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_list, allow_methods=["*"], allow_headers=["*"])


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", experts=len(app.state.index.experts), model=settings.model_path)


@app.post("/api/search", response_model=SearchResponse)
def search(req: SearchRequest) -> SearchResponse:
    snapshot = app.state.index
    response = ranker.search(snapshot, req, feedback_scores=feedback_store.multipliers())
    stats_store.log_query(response.parsed.terms, response.took_ms, response.weak_match)
    return response


@app.post("/api/upload", response_model=UploadResponse)
def upload(file: UploadFile) -> UploadResponse:
    """Публикует новый индекс только после успешной проверки и сохранения CSV."""
    raw = file.file.read(UPLOAD_MAX_BYTES + 1)
    if len(raw) > UPLOAD_MAX_BYTES:
        raise HTTPException(413, "CSV превышает допустимый размер 10 МБ")
    try:
        experts, report = load_csv(raw)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    with _upload_lock:
        replacement = index.build(experts, raw)
        target = settings.path(settings.uploaded_csv)
        target.parent.mkdir(parents=True, exist_ok=True)
        temporary = target.with_suffix(".tmp")
        temporary.write_bytes(raw)
        temporary.replace(target)
        app.state.index = replacement
    return report


@app.get("/api/experts/{expert_id}", response_model=Expert)
def get_expert(expert_id: str) -> Expert:
    for expert in app.state.index.experts:
        if expert.id == expert_id:
            return expert
    raise HTTPException(404, "Эксперт не найден")


@app.get("/api/industries", response_model=list[str])
def industries() -> list[str]:
    return sorted({expert.industry for expert in app.state.index.experts})


@app.post("/api/feedback", status_code=204)
def feedback(req: FeedbackRequest) -> None:
    get_expert(req.expert_id)
    feedback_store.save(req.query, req.expert_id, req.verdict)


@app.get("/api/stats", response_model=StatsResponse)
def stats() -> StatsResponse:
    return StatsResponse(**stats_store.summary())
