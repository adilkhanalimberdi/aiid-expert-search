"""Проверки морфологии, фразовых синонимов, ограничений и RRF."""

import numpy as np
import pytest
from rank_bm25 import BM25Okapi

from app.index import SearchIndex
from app.query_parser import parse
from app.ranker import rrf, search
from app.schemas import Expert, SearchRequest
from app.text import covered_terms, expand_synonyms, lemmas, normalize


def test_normalize() -> None:
    assert normalize("Ёж, GMP! BIM-проект") == "еж gmp bim-проект"
    assert lemmas("исследования препаратов") == ["исследование", "препарат"]
    assert "специалист" not in lemmas("нужен специалист")


def test_phrase_synonyms() -> None:
    assert "ml" in expand_synonyms(lemmas("машинное обучение"))
    assert "ml" not in expand_synonyms(lemmas("машинное зрение и обучение"))
    assert covered_terms(lemmas("клинические испытания"), "клинические исследования") == {
        "клинический",
        "испытание",
    }


@pytest.mark.parametrize(
    ("query", "city"),
    [
        ("в Алматы", "Алматы"),
        ("Алматыдан маман", "Алматы"),
        ("Астанада", "Астана"),
        ("из Караганды", "Караганда"),
    ],
)
def test_city(query: str, city: str) -> None:
    assert parse(query).city == city


def test_experience_and_industry() -> None:
    parsed = parse("GMP из Алматы с опытом от 10 лет")
    assert parsed.min_experience == 10
    assert parsed.industry == "Фармацевтика"
    assert parsed.terms == ["gmp"]


def test_rrf() -> None:
    scores = rrf([[0, 1], [1, 2]])
    assert scores[1] == pytest.approx(1 / 62 + 1 / 61)
    assert scores[1] > scores[0] > scores[2]


def test_filters_and_zero_bm25(monkeypatch: pytest.MonkeyPatch) -> None:
    experts = [
        Expert(
            id=str(i),
            full_name="Тест",
            position="Инженер",
            industry=industry,
            competencies=["BIM"],
            city="Астана",
            experience_years=10,
            availability=status,
        )
        for i, (industry, status) in enumerate(
            [("Инженерия", "available"), ("Инженерия", "busy"), ("IT", "available")]
        )
    ]
    index = SearchIndex(
        experts,
        BM25Okapi([["bim"], ["bim"], ["python"]]),
        np.array([[1.0, 0.0], [1.0, 0.0], [1.0, 0.0]]),
        [np.array([[1.0, 0.0]])] * 3,
        ["BIM"] * 3,
    )
    monkeypatch.setattr("app.ranker.encode_query", lambda _: np.array([1.0, 0.0]))
    response = search(index, SearchRequest(query="несуществующий", industry="Инженерия", hide_busy=True))
    assert [result.id for result in response.results] == ["0"]
    assert response.results[0].debug["bm25_rank"] is None
    assert response.results[0].matched == []
    monkeypatch.setattr("app.ranker.encode_query", lambda _: np.array([0.0, 1.0]))
    assert search(index, SearchRequest(query="несуществующий")).weak_match
    assert search(index, SearchRequest(query="bim", industry="Нет такой отрасли")).results == []
