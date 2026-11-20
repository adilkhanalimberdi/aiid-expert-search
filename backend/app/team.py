"""Жадное покрытие компетенций несколькими экспертами без генерации текста."""

from time import perf_counter

from .config import BOOST_AVAILABILITY, TEAM_MIN_MEMBERS
from .index import SearchIndex, encode_query
from .query_parser import parse
from .ranker import location_boost, result_for
from .schemas import CoverageRow, TeamRequest, TeamResponse
from .text import covered_terms


def assemble(index: SearchIndex, req: TeamRequest) -> TeamResponse:
    """Сначала максимизирует новые подтверждённые термины, затем релевантность."""
    started = perf_counter()
    parsed = parse(req.query)
    terms = list(dict.fromkeys(parsed.terms))
    query_vec = encode_query(req.query)
    covers = {
        i: covered_terms(terms, "; ".join(expert.competencies))
        for i, expert in enumerate(index.experts)
        if (not req.industry or expert.industry == req.industry)
        and (not req.hide_busy or expert.availability != "busy")
    }
    candidates = {i for i, coverage in covers.items() if coverage}
    uncovered = set(terms)
    selected = []

    def priority(i: int) -> tuple:
        expert = index.experts[i]
        relevance = float(index.expert_vecs[i] @ query_vec)
        relevance *= location_boost(expert, parsed) * BOOST_AVAILABILITY[expert.availability]
        return len(covers[i] & uncovered), relevance, -i

    while candidates and len(selected) < req.max_members:
        best = max(candidates, key=priority)
        if not (covers[best] & uncovered) and len(selected) >= TEAM_MIN_MEMBERS:
            break
        selected.append(best)
        candidates.remove(best)
        uncovered -= covers[best]
        if not uncovered and len(selected) >= TEAM_MIN_MEMBERS:
            break
    return TeamResponse(
        parsed=parsed,
        members=[result_for(index, i, parsed, query_vec) for i in selected],
        coverage=[
            CoverageRow(expert_id=index.experts[i].id, terms={term: term in covers[i] for term in terms})
            for i in selected
        ],
        uncovered_terms=[term for term in terms if term in uncovered],
        complete=bool(terms) and not uncovered,
        took_ms=round((perf_counter() - started) * 1000),
    )
