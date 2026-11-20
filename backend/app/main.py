"""FastAPI: атомарная замена каталога, поиск, отзывы и аналитика."""

import logging
import threading
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from time import perf_counter

from fastapi import FastAPI, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from . import explain as explain_module
from . import feedback as feedback_store
from . import index, ranker, team
from . import stats as stats_store
from .config import UPLOAD_MAX_BYTES, settings
from .data_loader import load_csv
from .query_parser import parse
from .schemas import (
    Expert,
    ExpertExplanation,
    ExpertPage,
    FeedbackRequest,
    HealthResponse,
    Language,
    SearchRequest,
    SearchResponse,
    SimilarExpert,
    StatsResponse,
    TeamRequest,
    TeamResponse,
    UploadResponse,
)
from .text import covered_terms, fix_keyboard_layout

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
    ranker.search(
        application.state.index, SearchRequest(query="проверка готовности")
    )  # прогрев морфологии и модели
    # векторы запросов из отзывов считаем сейчас, иначе их посчитает первый поиск пользователя
    ranker.warm_feedback(application.state.index, [row[0] for row in feedback_store.votes()])
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
    response = ranker.search(snapshot, req, feedback_votes=feedback_store.votes())
    stats_store.log_query(response.parsed.terms, response.took_ms, response.weak_match)
    return response


@app.post("/api/team", response_model=TeamResponse)
def assemble_team(req: TeamRequest) -> TeamResponse:
    return team.assemble(app.state.index, req)


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
    ranker.warm_feedback(replacement, [row[0] for row in feedback_store.votes()])
    return report


@app.get("/api/experts", response_model=ExpertPage)
def list_experts(
    offset: int = Query(default=0, ge=0), limit: int = Query(default=20, ge=1, le=100)
) -> ExpertPage:
    """Постраничный список каталога, чтобы показать загруженную базу."""
    experts = app.state.index.experts
    return ExpertPage(total=len(experts), offset=offset, items=experts[offset : offset + limit])


@app.get("/api/experts/{expert_id}", response_model=Expert)
def get_expert(expert_id: str) -> Expert:
    for expert in app.state.index.experts:
        if expert.id == expert_id:
            return expert
    raise HTTPException(404, "Эксперт не найден")


@app.get("/api/experts/{expert_id}/explain", response_model=ExpertExplanation)
def explain_expert(
    expert_id: str, query: str = Query(min_length=1, max_length=500), lang: Language = "ru"
) -> ExpertExplanation:
    """Показывает подтверждённые совпадения и ограничения любого профиля."""
    if not query.strip():
        raise HTTPException(422, "Введите непустой поисковый запрос")
    snapshot = app.state.index
    candidate = next((i for i, expert in enumerate(snapshot.experts) if expert.id == expert_id), None)
    if candidate is None:
        raise HTTPException(404, "Эксперт не найден")
    query = fix_keyboard_layout(query, snapshot.bm25.idf)
    parsed = parse(
        query, snapshot.bm25.idf, snapshot.industry_names, snapshot.city_names, snapshot.competency_industries
    )
    expert = snapshot.experts[candidate]
    confirmed = covered_terms(parsed.terms, "; ".join(expert.competencies))
    return ExpertExplanation(
        parsed=parsed,
        expert=ranker.result_for(snapshot, candidate, parsed, ranker.query_vector(query, parsed), lang=lang),
        missing_terms=list(dict.fromkeys(term for term in parsed.terms if term not in confirmed)),
        constraints=explain_module.constraints(expert, parsed, lang),
    )


@app.get("/api/experts/{expert_id}/similar", response_model=list[SimilarExpert])
def similar_experts(expert_id: str, limit: int = Query(default=5, ge=1, le=20)) -> list[SimilarExpert]:
    """Возвращает ближайшие векторы профилей, исключая исходного эксперта."""
    snapshot = app.state.index
    source = next((i for i, expert in enumerate(snapshot.experts) if expert.id == expert_id), None)
    if source is None:
        raise HTTPException(404, "Эксперт не найден")
    scores = snapshot.expert_vecs @ snapshot.expert_vecs[source]
    candidates = sorted(
        (i for i in range(len(snapshot.experts)) if i != source), key=lambda i: (-scores[i], i)
    )
    return [SimilarExpert(expert=snapshot.experts[i], cosine=float(scores[i])) for i in candidates[:limit]]


@app.get("/api/industries", response_model=list[str])
def industries() -> list[str]:
    return sorted({expert.industry for expert in app.state.index.experts})


@app.post("/api/feedback", status_code=204)
def feedback(req: FeedbackRequest) -> None:
    get_expert(req.expert_id)
    feedback_store.save(req.query, req.expert_id, req.verdict)
    # вектор запроса этого голоса считаем сразу: следующий поиск не будет ждать модель
    ranker.warm_feedback(app.state.index, [req.query])


@app.get("/api/stats", response_model=StatsResponse)
def stats() -> StatsResponse:
    return StatsResponse(**stats_store.summary())
