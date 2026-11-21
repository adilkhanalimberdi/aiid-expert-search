"""RRF, фильтры, бусты и объяснимый процент соответствия."""

from time import perf_counter

import numpy as np

from . import config
from . import feedback as feedback_store
from .explain import explain
from .index import SearchIndex, encode_queries, encode_query, encode_terms
from .query_parser import canonical_city, parse, split_negation
from .schemas import (
    Alternative,
    Expert,
    Language,
    ParsedQuery,
    ScoreBreakdown,
    ScoreFactor,
    SearchRequest,
    SearchResponse,
    SearchResult,
    TermEvidence,
)
from .text import (
    contains_stem,
    covered_terms,
    expand_synonyms,
    expand_vocabulary,
    fix_typing,
    synonym_hints,
)


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


def exclusion_boost(index: SearchIndex, i: int, parsed: ParsedQuery) -> float:
    """Множитель для эксперта, у которого есть исключённое в запросе («не нужен GMP»)."""
    if parsed.excluded_terms and covered_terms(parsed.excluded_terms, index.texts[i]):
        return config.BOOST_EXCLUDED_TERM
    return 1.0


def query_vector(query: str, parsed: ParsedQuery) -> np.ndarray:
    """Вектор запроса с синонимами терминов: «мұғалім», «учитель» и «teacher» дают близкие векторы.

    Единое место для поиска, подбора команды и объяснения, чтобы проценты в них совпадали.
    """
    return encode_query(embedding_text(query, parsed), parsed.terms)


def embedding_text(query: str, parsed: ParsedQuery) -> str:
    """Текст запроса для модели без исключённого («не нужен GMP») и до EMBED_HINTS_MAX синонимов терминов."""
    query = " ".join(split_negation(query)[0].split()).strip(" ,;.") or query
    hints = synonym_hints(parsed.terms, config.EMBED_HINTS_MAX)
    return f"{query} {' '.join(hints)}" if hints else query


def term_credits(index: SearchIndex, parsed: ParsedQuery) -> np.ndarray:
    """Смысловое покрытие терминов по каждому эксперту: от 0 до 1, не зависит от языка и словаря синонимов."""
    if not parsed.terms or index.target_matrix is None:
        return np.zeros((len(index.experts), len(parsed.terms)))
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
    return percent * location_boost(index.experts[i], parsed) * exclusion_boost(index, i, parsed)


def breakdown_for(
    index: SearchIndex, i: int, parsed: ParsedQuery, query_vec: np.ndarray, credits: np.ndarray
) -> ScoreBreakdown:
    """Те же величины, что в match_score, по отдельности: чтобы процент можно было пересчитать руками."""
    expert = index.experts[i]
    cosine = float(index.expert_vecs[i] @ query_vec)
    factors = []
    if parsed.city:
        same = canonical_city(expert.city) == canonical_city(parsed.city)
        factors.append(
            ScoreFactor(
                kind="city_match" if same else "city_mismatch",
                value=config.BOOST_CITY_MATCH if same else config.BOOST_CITY_MISMATCH,
            )
        )
    if exclusion_boost(index, i, parsed) != 1.0:
        factors.append(ScoreFactor(kind="excluded", value=config.BOOST_EXCLUDED_TERM))
    return ScoreBreakdown(
        semantic=float(np.clip((cosine - config.COS_FLOOR) / (config.COS_CEIL - config.COS_FLOOR), 0, 1)),
        coverage=coverage_of(index, i, parsed, credits),
        w_semantic=config.W_SEMANTIC,
        w_coverage=config.W_COVERAGE,
        factors=[factor for factor in factors if factor.value != 1.0],
        capped=match_score(index, i, parsed, query_vec, credits) > config.PERCENT_CAP,
    )


def evidence_for(index: SearchIndex, i: int, parsed: ParsedQuery, credits: np.ndarray) -> list[TermEvidence]:
    """По каждому термину запроса: какая компетенция или должность эксперта его подтверждает и как.

    Точное совпадение ищется по словам и синонимам, смысловое по тем же косинусам, что идут в покрытие,
    поэтому строка «клинические испытания ≈ клинические исследования» и процент не расходятся.
    """
    expert = index.experts[i]
    targets = [*expert.competencies, expert.position]
    exact = covered_terms(parsed.terms, index.texts[i])
    rows = None
    if index.target_matrix is not None and index.target_offsets is not None and parsed.terms:
        start = int(index.target_offsets[i])
        rows = index.target_matrix[start : start + len(targets)] @ encode_terms(parsed.terms).T
    evidence = []
    for k, term in enumerate(parsed.terms):
        if term in exact:
            source = next((text for text in targets if covered_terms([term], text)), None)
            evidence.append(TermEvidence(term=term, kind="exact", source=source, credit=1.0))
        elif rows is not None and float(credits[i, k]) > 0:
            j = int(np.argmax(rows[:, k]))
            evidence.append(
                TermEvidence(
                    term=term,
                    kind="semantic",
                    source=targets[j],
                    similarity=round(float(rows[j, k]), 2),
                    credit=round(float(credits[i, k]), 2),
                )
            )
        else:
            evidence.append(TermEvidence(term=term, kind="missing"))
    return evidence


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
        evidence=evidence_for(index, i, parsed, credits),
        breakdown=breakdown_for(index, i, parsed, query_vec, credits),
        debug={"bm25_rank": bm25_rank, "vec_rank": vec_rank, "cosine": cosine},
    )


# Векторы запросов из отзывов: считаются батчем заранее (старт, новый голос, новый каталог), а не в поиске
_vote_cache: dict[str, object] = {"index": None, "vectors": {}}


def warm_feedback(index: SearchIndex, queries: list[str]) -> None:
    """Кодирует одним вызовом модели все ещё не известные запросы из отзывов для этого индекса.

    Раньше каждый прошлый запрос кодировался отдельно внутри первого поиска после старта:
    с двумя запросами в отзывах первый поиск шёл 300 мс вместо 60, и рос бы с каждым голосом.
    """
    if _vote_cache["index"] != id(index):
        _vote_cache["index"], _vote_cache["vectors"] = id(index), {}
    vectors: dict[str, np.ndarray] = _vote_cache["vectors"]  # type: ignore[assignment]
    missing = [text for text in dict.fromkeys(queries) if text not in vectors]
    if not missing:
        return
    texts = [
        embedding_text(
            text,
            parse(text, index.bm25.idf, index.industry_names, index.city_names, index.competency_industries),
        )
        for text in missing
    ]
    for text, vector in zip(missing, encode_queries(texts), strict=True):
        vectors[text] = vector


def feedback_for(
    index: SearchIndex, query: str, query_vec: np.ndarray, votes: list[tuple[str, str, int]] | None
) -> dict[str, float]:
    """Множители отзывов для этого запроса; векторы прошлых запросов берутся из кэша (см. warm_feedback)."""
    if not votes:
        return {}
    warm_feedback(index, [row[0] for row in votes])
    vectors: dict[str, np.ndarray] = _vote_cache["vectors"]  # type: ignore[assignment]
    return feedback_store.multipliers(votes, query, query_vec, vectors.__getitem__)


def order_by_percent(
    results: list[SearchResult],
    feedback_scores: dict[str, float] | None = None,
    city: str | None = None,
    min_experience: int | None = None,
) -> list[SearchResult]:
    """Окончательный порядок: процент × доступность × опыт × отзывы.

    Без города состав топ-3 решает RRF (так он устойчивее на запросах без ограничений), а внутри групп
    порядок совпадает с процентом. С городом сортируются все кандидаты окна: сначала подходящие эксперты
    из названного города, потом остальные. Иначе эксперт с нужной компетенцией в нужном городе (93%)
    оставался четвёртым за 60%-ными из других городов: вектор его профиля шире запроса, а RRF города не видит.
    """

    def weight(result: SearchResult) -> float:
        availability = config.BOOST_AVAILABILITY[result.availability]
        # «от 15 лет»: эксперт с меньшим стажем не должен стоять выше подходящего по стажу при равном проценте
        below = min_experience is not None and result.experience_years < min_experience
        experience = config.BOOST_EXPERIENCE_BELOW if below else 1.0
        return -result.match_percent * availability * experience * (feedback_scores or {}).get(result.id, 1.0)

    if city or min_experience is not None:
        # названные в запросе город и «от N лет» это прямые требования: сначала те, кто им отвечает
        def fits(result: SearchResult) -> bool:
            in_city = not city or canonical_city(result.city) == canonical_city(city)
            enough = min_experience is None or result.experience_years >= min_experience
            return in_city and enough and result.match_percent >= config.CITY_PRIORITY_MIN_PERCENT

        return sorted(results, key=lambda result: (0 if fits(result) else 1, weight(result)))
    head = config.ORDER_GROUP_SIZE
    return sorted(results[:head], key=weight) + sorted(results[head:], key=weight)


def meets_conditions(result: SearchResult, parsed: ParsedQuery | None) -> bool:
    """Эксперт отвечает названным в запросе городу и минимальному стажу."""
    if parsed is None:
        return True
    if parsed.city and canonical_city(result.city) != canonical_city(parsed.city):
        return False
    return parsed.min_experience is None or result.experience_years >= parsed.min_experience


def with_alternatives(results: list[SearchResult], parsed: ParsedQuery | None = None) -> list[SearchResult]:
    """Занятым и частично занятым в топ-3 подбирает свободную замену из остальной выдачи.

    Замена берётся только среди уже найденных: она не меняет порядок и состав топ-3, это подсказка.
    Общие термины считаются по доказательствам (evidence), а не по тексту, поэтому их можно проверить.
    Замена отвечает тем же условиям запроса, что и топ: названный город и «от N лет».
    """
    head = config.ORDER_GROUP_SIZE
    top_ids = {result.id for result in results[:head]}

    def confirmed(result: SearchResult) -> list[str]:
        return [item.term for item in result.evidence if item.kind != "missing"]

    updated = []
    for result in results[:head]:
        if result.availability == "available":
            updated.append(result)
            continue
        needed = confirmed(result)
        for other in results:
            shared = [term for term in confirmed(other) if term in needed]
            if (
                other.id not in top_ids
                and other.availability == "available"
                and other.match_percent >= config.ALTERNATIVE_MIN_PERCENT
                and meets_conditions(other, parsed)
                and (shared or not needed)
            ):
                alternative = Alternative(
                    id=other.id,
                    full_name=other.full_name,
                    match_percent=other.match_percent,
                    shared_terms=shared,
                )
                result = result.model_copy(update={"alternative": alternative})
                break
        updated.append(result)
    return updated + results[head:]


def is_without_evidence(
    index: SearchIndex, best: list[int], parsed: ParsedQuery, query_vec: np.ndarray, credits: np.ndarray
) -> bool:
    """Никто из найденных не подтверждает термины запроса (словами или по смыслу), нет близкой компетенции."""
    if any(covered_terms(parsed.terms, index.texts[i]) for i in best):
        return False
    if credits.shape[1] and float(credits[best].max()) > 0:
        return False
    # сюда доходим, только если ни одно слово запроса не подтверждено. Близость компетенций меряем
    # и по всей фразе, и по самим терминам с синонимами, и берём меньшую: иначе «сделать сайт» из-за
    # слова «сделать» оказывается рядом с «разработкой API», хотя один «сайт» слабый. Второй вызов
    # модели бывает только здесь, у запросов без подтверждений, и его результат кэшируется
    targets = [query_vec] + ([query_vector(" ".join(parsed.terms), parsed)] if parsed.terms else [])
    closest = min(max(float((index.competency_vecs[i] @ target).max()) for i in best) for target in targets)
    return closest < config.WEAK_COMPETENCY_COS


def is_filter_only(parsed: ParsedQuery) -> bool:
    """В запросе нет терминов, но есть город или отрасль: «специалист из Шымкента», «Алматы»."""
    return not parsed.terms and bool(parsed.city or parsed.industry)


def matches_filters(expert: Expert, parsed: ParsedQuery) -> bool:
    """Эксперт подходит под названные в запросе город и отрасль."""
    if parsed.city and canonical_city(expert.city) != canonical_city(parsed.city):
        return False
    return not parsed.industry or expert.industry == parsed.industry


def filter_only_response(
    index: SearchIndex, req: SearchRequest, parsed: ParsedQuery, candidates: list[int], started: float
) -> SearchResponse:
    """Отбор по городу и отрасли без смысла: порядок по доступности и опыту, процент один на всех."""

    def weight(i: int) -> float:
        expert = index.experts[i]
        below = parsed.min_experience is not None and expert.experience_years < parsed.min_experience
        return config.BOOST_AVAILABILITY[expert.availability] * (
            config.BOOST_EXPERIENCE_BELOW if below else 1.0
        )

    best = sorted(candidates, key=lambda i: (-weight(i), -index.experts[i].experience_years, i))[: req.top_k]
    query_vec = query_vector(req.query, parsed)
    results = []
    for i in best:
        result = result_for(index, i, parsed, query_vec, lang=req.lang)
        below = weight(i) / config.BOOST_AVAILABILITY[index.experts[i].availability] < 1
        percent = round(config.FILTER_ONLY_PERCENT * (config.BOOST_EXPERIENCE_BELOW if below else 1.0))
        results.append(result.model_copy(update={"match_percent": percent}))
    return SearchResponse(
        parsed=parsed,
        weak_match=False,
        took_ms=round((perf_counter() - started) * 1000),
        results=results,
        filter_only=True,
    )


def semantic_phrase(index: SearchIndex, query_vec: np.ndarray) -> tuple[str, ...] | None:
    """Компетенция каталога, ближайшая к запросу по смыслу, если она заметно ближе следующей.

    Словарь не знает всех формулировок («manufacturing defect inspection» → «контроль дефектов
    на производстве»). По рангу ближайшая компетенция верна в 9 из 10 случаев на трёх языках,
    по абсолютному порогу нет; отрыв от второй отсекает случайные зацепки за одно слово.
    """
    phrases, vectors = index.unique_competencies
    if len(phrases) < 2 or vectors.shape[1] != query_vec.shape[0]:
        return None
    scores = vectors @ query_vec
    first, second = np.argsort(-scores)[:2]
    if (
        scores[first] >= config.SEMANTIC_PHRASE_MIN_COS
        and scores[first] - scores[second] >= config.SEMANTIC_PHRASE_MARGIN
    ):
        return phrases[int(first)]
    return None


def phrase_holders(
    index: SearchIndex, terms: list[str], eligible: list[int], query_vec: np.ndarray | None = None
) -> list[int]:
    """Эксперты, у которых в профиле целиком есть компетенция, названная в запросе (с синонимами и языками).

    BM25 видит слова поодиночке: «контроль дефектов на производстве» проигрывал «инженерам производства»,
    а единственный владелец редкой компетенции терялся. Длинная фраза весит больше короткой.
    """
    if not terms:
        return []
    expanded = expand_synonyms(terms)
    asked = [phrase for phrase in index.competency_industries if contains_stem(expanded, phrase)]
    if not asked and query_vec is not None and (nearest := semantic_phrase(index, query_vec)):
        asked = [nearest]
    if not asked:
        return []
    weight = {i: sum(len(p) for p in asked if p in index.competency_phrases[i]) for i in eligible}
    holders = [i for i in eligible if weight[i]]
    return sorted(holders, key=lambda i: (-weight[i], i))[: config.TOP_N_PER_RETRIEVER]


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
    req = req.model_copy(update={"query": fix_typing(req.query, index.bm25.idf)})
    parsed = parse(
        req.query, index.bm25.idf, index.industry_names, index.city_names, index.competency_industries
    )
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
    if is_filter_only(parsed):
        by_filters = [i for i in eligible if matches_filters(index.experts[i], parsed)]
        if by_filters:
            return filter_only_response(index, req, parsed, by_filters, started)
    bm25 = sorted((i for i in eligible if lexical[i] > 0), key=lambda i: (-lexical[i], i))[
        : config.TOP_N_PER_RETRIEVER
    ]
    vector = sorted(eligible, key=lambda i: (-cosines[i], i))[: config.TOP_N_PER_RETRIEVER]
    rankings = [bm25, vector] if mode == "hybrid" else [bm25 if mode == "bm25" else vector]
    if (
        mode == "hybrid"
        and config.PHRASE_RANKING
        and (holders := phrase_holders(index, parsed.terms, eligible, query_vec))
    ):
        rankings.append(holders)
    scores = rrf(rankings)
    for i in scores:
        expert = index.experts[i]
        scores[i] *= location_boost(expert, parsed) * config.BOOST_AVAILABILITY[expert.availability]
        if parsed.min_experience is not None and expert.experience_years < parsed.min_experience:
            scores[i] *= config.BOOST_EXPERIENCE_BELOW
        scores[i] *= exclusion_boost(index, i, parsed)
        scores[i] *= (feedback_scores or {}).get(expert.id, 1.0)
    has_constraint = mode == "hybrid" and (parsed.city or parsed.min_experience is not None)
    window = max(req.top_k, config.RERANK_WINDOW_WITH_CITY) if has_constraint else req.top_k
    candidates = sorted(scores, key=lambda i: (-scores[i], i))[:window]
    bm_ranks = {i: rank for rank, i in enumerate(bm25, 1)}
    vec_ranks = {i: rank for rank, i in enumerate(vector, 1)}
    results = [
        result_for(index, i, parsed, query_vec, bm_ranks.get(i), vec_ranks.get(i), req.lang, credits)
        for i in candidates
    ]
    if mode == "hybrid":
        results = with_alternatives(
            order_by_percent(results, feedback_scores, parsed.city, parsed.min_experience)[: req.top_k],
            parsed,
        )
    position = {expert.id: i for i, expert in enumerate(index.experts)}
    best = [position[result.id] for result in results]
    is_weak = not eligible or float(max(cosines[i] for i in eligible)) < config.WEAK_MATCH_COS
    if not is_weak and results:
        is_weak = is_without_evidence(index, best, parsed, query_vec, credits)
    return SearchResponse(
        parsed=parsed, weak_match=is_weak, took_ms=round((perf_counter() - started) * 1000), results=results
    )
