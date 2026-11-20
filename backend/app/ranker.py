"""RRF, фильтры, бусты и объяснимый процент соответствия."""

from time import perf_counter

import numpy as np

from . import config
from .explain import explain
from .index import SearchIndex, encode_query
from .query_parser import parse
from .schemas import Expert, Language, ParsedQuery, SearchRequest, SearchResponse, SearchResult
from .text import covered_terms, expand_synonyms, expand_vocabulary


def rrf(rankings: list[list[int]]) -> dict[int, float]:
    """Сливает списки позиций, не смешивая несопоставимые исходные шкалы."""
    scores = {}
    for ranking in rankings:
        for rank, candidate in enumerate(ranking, 1):
            scores[candidate] = scores.get(candidate, 0.0) + 1 / (config.RRF_K + rank)
    return scores


def location_boost(expert: Expert, parsed: ParsedQuery) -> float:
    boost = 1.0
    if parsed.city:
        boost *= config.BOOST_CITY_MATCH if expert.city == parsed.city else config.BOOST_CITY_MISMATCH
    if expert.industry == parsed.industry:
        boost *= config.BOOST_INDUSTRY_MATCH
    return boost


def match_score(index: SearchIndex, i: int, parsed: ParsedQuery, query_vec: np.ndarray) -> float:
    """Процент без потолка: смысл и покрытие терминов с бустами города и отрасли."""
    cosine = float(index.expert_vecs[i] @ query_vec)
    semantic = float(np.clip((cosine - config.COS_FLOOR) / (config.COS_CEIL - config.COS_FLOOR), 0, 1))
    terms = set(parsed.terms)
    coverage = len(covered_terms(parsed.terms, index.texts[i])) / len(terms) if terms else 0.0
    percent = 100 * (config.W_SEMANTIC * semantic + config.W_COVERAGE * coverage)
    return percent * location_boost(index.experts[i], parsed)


def result_for(
    index: SearchIndex,
    i: int,
    parsed: ParsedQuery,
    query_vec: np.ndarray,
    bm25_rank: int | None = None,
    vec_rank: int | None = None,
    lang: Language = "ru",
) -> SearchResult:
    """Строит карточку и процент по смыслу и покрытию терминов."""
    expert = index.experts[i]
    cosine = float(index.expert_vecs[i] @ query_vec)
    percent = min(config.PERCENT_CAP, round(match_score(index, i, parsed, query_vec)))
    matched, related, reasons = explain(expert, parsed, query_vec, index.competency_vecs[i], lang)
    return SearchResult(
        **{key: value for key, value in expert.model_dump().items() if key in SearchResult.model_fields},
        match_percent=percent,
        matched=matched,
        related=related,
        reasons=reasons,
        debug={"bm25_rank": bm25_rank, "vec_rank": vec_rank, "cosine": cosine},
    )


def order_by_percent(results: list[SearchResult]) -> list[SearchResult]:
    """Упорядочивает по проценту с учётом доступности внутри топа и внутри остальных.

    Кто попал в первую группу, решает RRF (это то, что меряет eval), а порядок внутри группы
    совпадает с процентом на карточке: 60% не стоит выше 80% только из-за города.
    """
    head = config.ORDER_GROUP_SIZE

    def key(result: SearchResult) -> float:
        return -result.match_percent * config.BOOST_AVAILABILITY[result.availability]

    return sorted(results[:head], key=key) + sorted(results[head:], key=key)


def is_without_evidence(
    index: SearchIndex, best: list[int], parsed: ParsedQuery, query_vec: np.ndarray
) -> bool:
    """Ни один найденный эксперт не подтверждает термины запроса и нет близкой компетенции."""
    if any(covered_terms(parsed.terms, index.texts[i]) for i in best):
        return False
    closest = max(float((index.competency_vecs[i] @ query_vec).max()) for i in best)
    return closest < config.WEAK_COMPETENCY_COS


def search(
    index: SearchIndex,
    req: SearchRequest,
    mode: str = "hybrid",
    feedback_scores: dict[str, float] | None = None,
) -> SearchResponse:
    """Возвращает отфильтрованный топ с детерминированным порядком при равных оценках."""
    if mode not in {"hybrid", "bm25", "vector"}:
        raise ValueError("Неизвестный режим поиска")
    started = perf_counter()
    parsed = parse(req.query, index.bm25.idf)
    query_vec = encode_query(req.query)
    cosines = index.expert_vecs @ query_vec
    lexical = index.bm25.get_scores(expand_synonyms(expand_vocabulary(parsed.terms, index.bm25.idf)))
    eligible = [
        i
        for i, expert in enumerate(index.experts)
        if (not req.industry or expert.industry == req.industry)
        and (not (req.hide_busy or parsed.available_only) or expert.availability != "busy")
    ]
    bm25 = sorted((i for i in eligible if lexical[i] > 0), key=lambda i: (-lexical[i], i))[
        : config.TOP_N_PER_RETRIEVER
    ]
    vector = sorted(eligible, key=lambda i: (-cosines[i], i))[: config.TOP_N_PER_RETRIEVER]
    rankings = [bm25, vector] if mode == "hybrid" else [bm25 if mode == "bm25" else vector]
    scores = rrf(rankings)
    for i in scores:
        expert = index.experts[i]
        scores[i] *= location_boost(expert, parsed) * config.BOOST_AVAILABILITY[expert.availability]
        if parsed.min_experience is not None and expert.experience_years < parsed.min_experience:
            scores[i] *= config.BOOST_EXPERIENCE_BELOW
        scores[i] *= (feedback_scores or {}).get(expert.id, 1.0)
    best = sorted(scores, key=lambda i: (-scores[i], i))[: req.top_k]
    bm_ranks = {i: rank for rank, i in enumerate(bm25, 1)}
    vec_ranks = {i: rank for rank, i in enumerate(vector, 1)}
    results = [
        result_for(index, i, parsed, query_vec, bm_ranks.get(i), vec_ranks.get(i), req.lang) for i in best
    ]
    if mode == "hybrid":
        results = order_by_percent(results)
    is_weak = not eligible or float(max(cosines[i] for i in eligible)) < config.WEAK_MATCH_COS
    if not is_weak and results:
        is_weak = is_without_evidence(index, best, parsed, query_vec)
    return SearchResponse(
        parsed=parsed, weak_match=is_weak, took_ms=round((perf_counter() - started) * 1000), results=results
    )
