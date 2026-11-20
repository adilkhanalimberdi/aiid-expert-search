"""Контракт API. Совпадает с разделом «API» в AGENTS.md."""

from typing import Literal

from pydantic import BaseModel, Field, field_validator

from .config import TEAM_MAX_MEMBERS, TEAM_MIN_MEMBERS

Availability = Literal["available", "partial", "busy"]
Language = Literal["ru", "en", "kk"]  # язык обоснований: reasons и constraints


class Expert(BaseModel):
    id: str
    full_name: str
    position: str
    industry: str
    competencies: list[str]
    city: str
    experience_years: int
    availability: Availability
    organization: str | None = None
    bio: str | None = None
    languages: list[str] = Field(default_factory=list)
    email: str | None = None


class SimilarExpert(BaseModel):
    expert: Expert
    cosine: float


class ExpertPage(BaseModel):
    total: int
    offset: int
    items: list[Expert]


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    industry: str | None = None
    top_k: int = Field(default=5, ge=3, le=20)
    hide_busy: bool = False
    lang: Language = "ru"

    @field_validator("query")
    @classmethod
    def nonblank_query(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Введите непустой поисковый запрос")
        return value.strip()


class ParsedQuery(BaseModel):
    city: str | None = None
    industry: str | None = None
    min_experience: int | None = None
    terms: list[str] = Field(default_factory=list)
    available_only: bool = False  # в запросе просили свободных: занятые не попадают в выдачу
    excluded_terms: list[str] = Field(default_factory=list)  # «не нужен GMP», «без GMP»: такие эксперты ниже


class SearchResult(BaseModel):
    id: str
    full_name: str
    position: str
    organization: str | None = None
    city: str
    industry: str
    experience_years: int
    availability: Availability
    match_percent: int
    matched: list[str]
    related: list[str]
    reasons: list[str]
    debug: dict = Field(default_factory=dict)


class SearchResponse(BaseModel):
    parsed: ParsedQuery
    weak_match: bool
    took_ms: int
    results: list[SearchResult]
    # в запросе нет темы, только город или отрасль: эксперты отобраны по фильтрам, процент не показываем
    filter_only: bool = False


class ExpertExplanation(BaseModel):
    parsed: ParsedQuery
    expert: SearchResult
    missing_terms: list[str]
    constraints: list[str]


class TeamRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    industry: str | None = None
    hide_busy: bool = False
    max_members: int = Field(default=TEAM_MAX_MEMBERS, ge=TEAM_MIN_MEMBERS, le=TEAM_MAX_MEMBERS)
    lang: Language = "ru"

    @field_validator("query")
    @classmethod
    def nonblank_query(cls, value: str) -> str:
        return SearchRequest(query=value).query


class CoverageRow(BaseModel):
    expert_id: str
    terms: dict[str, bool]


class TeamResponse(BaseModel):
    parsed: ParsedQuery
    members: list[SearchResult]
    coverage: list[CoverageRow]
    uncovered_terms: list[str]
    complete: bool
    took_ms: int


class UploadResponse(BaseModel):
    loaded: int
    skipped: int
    errors: list[str] = Field(default_factory=list)


class FeedbackRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    expert_id: str
    verdict: Literal["fit", "not_fit"]


class StatsResponse(BaseModel):
    total_queries: int
    avg_took_ms: float
    fit_rate: float | None
    top_competencies: list[dict]
    unmet_demand: list[dict] = Field(default_factory=list)
    evaluations: list[dict] = Field(default_factory=list)


class HealthResponse(BaseModel):
    status: str
    experts: int
    model: str
