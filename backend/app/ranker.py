"""RRF, фильтры, бусты и объяснимый процент соответствия."""

from time import perf_counter

import numpy as np

from . import config
from . import feedback as feedback_store
from .explain import explain
from .index import SearchIndex, encode_query, encode_terms
from .query_parser import canonical_city, parse
from .schemas import Expert, Language, ParsedQuery, SearchRequest, SearchResponse, SearchResult
from .text import covered_terms, expand_synonyms, expand_vocabulary, synonym_hints


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
        same = canonical_city(expert.city) == canonical_city(parsed.city)
        boost *= config.BOOST_CITY_MATCH if same else config.BOOST_CITY_MISMATCH
    if expert.industry == parsed.industry:
        boost *= config.BOOST_INDUSTRY_MATCH
    return boost


def query_vector(query: str, parsed: ParsedQuery) -> np.ndarray:
    """Вектор запроса с синонимами терминов: «мұғалім», «учитель» и «teacher» дают близкие векторы.

    Единое место для поиска, подбора команды и объяснения, чтобы проценты в них совпадали.
    """
    hints = synonym_hints(parsed.terms, config.EMBED_HINTS_MAX)
    return encode_query(f"{query} {' '.join(hints)}" if hints else query, parsed.terms)


def term_credits(index: SearchIndex, parsed: ParsedQuery) -> np.ndarray:
    """Смысловое покрытие терминов по каждому эксперту: от 0 до 1, не зависит от языка и словаря синонимов."""
    if not parsed.terms:
        return np.zeros((len(index.experts), 0))
    scores = index.term_scores(encode_terms(parsed.terms))
    span = config.TERM_SEMANTIC_CEIL - config.TERM_SEMANTIC_FLOOR
    return np.clip((scores - config.TERM_SEMANTIC_FLOOR) / span, 0, 1)


def coverage_of(index: SearchIndex, i: int, parsed: ParsedQuery, credits: np.ndarray) -> float:
    """Доля терминов, подтверждённых профилем: точно (слова, синонимы) или по смыслу (частичный зачёт)."""
    if not parsed.terms:
        return 0.0
    exact = covered_terms(parsed.terms, index.texts[i])
    return sum(1.0 if term in exact else float(credits[i, k]) for k, term in enumerate(parsed.terms)) / len(
        parsed.terms
    )


def match_score(
    index: SearchIndex, i: int, parsed: ParsedQuery, query_vec: np.ndarray, credits: np.ndarray
) -> float:
    """Процент без потолка: смысл и покрытие терминов с бустами города и отрасли."""
    cosine = float(index.expert_vecs[i] @ query_vec)
    semantic = float(np.clip((cosine - config.COS_FLOOR) / (config.COS_CEIL - config.COS_FLOOR), 0, 1))
    coverage = coverage_of(index, i, parsed, credits)
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
    credits: np.ndarray | None = None,
) -> SearchResult:
    """Строит карточку и процент по смыслу и покрытию терминов."""
    expert = index.experts[i]
    cosine = float(index.expert_vecs[i] @ query_vec)
    if credits is None:
        credits = term_credits(index, parsed)
    percent = min(config.PERCENT_CAP, round(match_score(index, i, parsed, query_vec, credits)))
    position_vec = index.position_vecs[i] if index.position_vecs is not None else None
    matched, related, reasons = explain(
        expert, parsed, query_vec, index.competency_vecs[i], lang, position_vec=position_vec
    )
    return SearchResult(
        **{key: value for key, value in expert.model_dump().items() if key in SearchResult.model_fields},
        match_percent=percent,
        matched=matched,
        related=related,
        reasons=reasons,
        debug={"bm25_rank": bm25_rank, "vec_rank": vec_rank, "cosine": cosine},
    )


_vote_vectors: dict[tuple[int, str], np.ndarray] = {}


def feedback_for(
    index: SearchIndex, query: str, query_vec: np.ndarray, votes: list[tuple[str, str, int]] | None
) -> dict[str, float]:
    """Множители отзывов для этого запроса; векторы прошлых запросов считаются один раз и кэшируются."""
    if not votes:
        return {}

    def vector_of(text: str) -> np.ndarray:
        key = (id(index), text)
        if key not in _vote_vectors:
            parsed = parse(text, index.bm25.idf, index.industry_names, index.city_names)
            _vote_vectors[key] = query_vector(text, parsed)
        return _vote_vectors[key]

    return feedback_store.multipliers(votes, query, query_vec, vector_of)


def order_by_percent(
    results: list[SearchResult], feedback_scores: dict[str, float] | None = None
) -> list[SearchResult]:
    """Упорядочивает по проценту с учётом доступности и отзывов внутри топа и внутри остальных.

    Кто попал в первую группу, решает RRF (это то, что меряет eval), а порядок внутри группы
    совпадает с процентом на карточке: 60% не стоит выше 80% только из-за города.
    Отзывы («подошёл» / «не подошёл») двигают эксперта и внутри группы, иначе в топ-3 они бы не работали.
    """
    head = config.ORDER_GROUP_SIZE

    def key(result: SearchResult) -> float:
        weight = config.BOOST_AVAILABILITY[result.availability] * (feedback_scores or {}).get(result.id, 1.0)
        return -result.match_percent * weight

    return sorted(results[:head], key=key) + sorted(results[head:], key=key)


def is_without_evidence(
    index: SearchIndex, best: list[int], parsed: ParsedQuery, query_vec: np.ndarray, credits: np.ndarray
) -> bool:
    """Никто из найденных не подтверждает термины запроса (словами или по смыслу), нет близкой компетенции."""
    if any(covered_terms(parsed.terms, index.texts[i]) for i in best):
        return False
    if credits.shape[1] and float(credits[best].max()) > 0:
        return False
    closest = max(float((index.competency_vecs[i] @ query_vec).max()) for i in best)
    return closest < config.WEAK_COMPETENCY_COS


def search(
    index: SearchIndex,
    req: SearchRequest,
    mode: str = "hybrid",
    feedback_votes: list[tuple[str, str, int]] | None = None,
) -> SearchResponse:
    """Возвращает отфильтрованный топ с детерминированным порядком при равных оценках."""
    if mode not in {"hybrid", "bm25", "vector"}:
        raise ValueError("Неизвестный режим поиска")
    started = perf_counter()
    parsed = parse(req.query, index.bm25.idf, index.industry_names, index.city_names)
    query_vec = query_vector(req.query, parsed)
    cosines = index.expert_vecs @ query_vec
    credits = term_credits(index, parsed)
    feedback_scores = feedback_for(index, req.query, query_vec, feedback_votes)
    base_terms = expand_vocabulary(parsed.terms, index.bm25.idf)
    synonyms = [word for word in expand_synonyms(base_terms) if word not in base_terms]
    lexical = index.bm25.get_scores(base_terms)
    if synonyms:
        lexical = lexical + config.SYNONYM_BM25_WEIGHT * index.bm25.get_scores(synonyms)
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
        result_for(index, i, parsed, query_vec, bm_ranks.get(i), vec_ranks.get(i), req.lang, credits)
        for i in best
    ]
    if mode == "hybrid":
        results = order_by_percent(results, feedback_scores)
    is_weak = not eligible or float(max(cosines[i] for i in eligible)) < config.WEAK_MATCH_COS
    if not is_weak and results:
        is_weak = is_without_evidence(index, best, parsed, query_vec, credits)
    return SearchResponse(
        parsed=parsed, weak_match=is_weak, took_ms=round((perf_counter() - started) * 1000), results=results
    )
