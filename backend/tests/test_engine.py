"""Проверки морфологии, фразовых синонимов, ограничений и RRF."""

import numpy as np
import pytest
from rank_bm25 import BM25Okapi

from app.index import SearchIndex
from app.query_parser import parse
from app.ranker import order_by_percent, rrf, search
from app.schemas import Expert, SearchRequest, SearchResult
from app.text import correct_terms, covered_terms, expand_synonyms, lemmas, normalize, same_stem


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


def test_abbreviations_and_kazakh_filler_are_not_terms():
    assert "ии" in lemmas("специалист по ИИ")
    assert "ml" in lemmas("ML инженер")
    assert lemmas("маманы керек") == []


def test_years_label_declension():
    from app.explain import years_label

    assert [years_label(n) for n in (1, 2, 5, 11, 21, 22, 15)] == [
        "1 год",
        "2 года",
        "5 лет",
        "11 лет",
        "21 год",
        "22 года",
        "15 лет",
    ]


def test_city_typo_is_fixed_but_ordinary_words_are_not():
    assert parse("специалист из Алмты").city == "Алматы"
    assert parse("из Шымкнте").city == "Шымкент"
    assert parse("нужен станок и тариф").city is None


def test_cyrillic_spelling_of_latin_term_expands_synonyms():
    assert "devops" in expand_synonyms(["девопс"])
    assert "python" in expand_synonyms(["питон"])


def test_unknown_word_is_not_distorted_and_prefix_is_confirmed():
    assert lemmas("деплой") == ["деплой"]
    assert covered_terms(["кибер"], "кибербезопасность; DevOps") == {"кибер"}
    assert covered_terms(["каб"], "кабель") == set()  # короче порога: не приставка


def test_vocabulary_expansion_by_prefix_and_typo():
    from app.text import expand_vocabulary

    vocabulary = ["кибербезопасность", "devops", "промышленный"]
    assert "кибербезопасность" in expand_vocabulary(["кибер"], vocabulary)
    assert "кибербезопасность" in expand_vocabulary(["кибирбезопасность"], vocabulary)
    assert expand_vocabulary(["devops"], vocabulary) == ["devops"]


def test_english_explanations():
    from app.explain import TEXTS, years_label

    assert years_label(1, "en") == "1 year" and years_label(5, "en") == "5 years"
    assert set(TEXTS["ru"]) == set(TEXTS["en"])


def test_english_query_parsing():
    parsed = parse("I need a cybersecurity expert from Almaty with 5+ years")
    assert (parsed.city, parsed.min_experience, parsed.terms) == ("Алматы", 5, ["cybersecurity"])
    assert "кибербезопасность" in expand_synonyms(["cybersecurity"])
    assert parse("audit at least 10 years").min_experience == 10


@pytest.mark.parametrize(
    ("query", "years"),
    [
        ("металлург 20+ лет", 20),
        ("более 7 лет опыта", 7),
        ("опыт 5 лет", 5),
        ("10 жылдан астам тәжірибе", 10),
        ("5+ years", 5),
        ("GMP в Алматы", None),
    ],
)
def test_experience_forms(query: str, years: int | None) -> None:
    assert parse(query).min_experience == years


def test_availability_intent_is_not_a_term() -> None:
    parsed = parse("специалист по GMP, свободный сейчас")
    assert parsed.available_only and parsed.terms == ["gmp"]
    assert not parse("специалист по GMP").available_only


def test_kazakh_phrases_reach_russian_competencies() -> None:
    assert covered_terms(lemmas("клиникалық зерттеулер"), "клинические исследования")
    assert covered_terms(lemmas("өнеркәсіптік қауіпсіздігі"), "промышленная безопасность")
    assert "кибербезопасность" in expand_synonyms(lemmas("киберқауіпсіздік"))


def test_same_stem_is_strict_for_latin_and_short_words() -> None:
    assert same_stem("нейросетях", "нейросеть")
    assert not same_stem("gmps", "gmp")
    assert not same_stem("банкир", "банк")


def test_typo_is_corrected_only_against_the_base() -> None:
    vocabulary = ["кибербезопасность", "промбезопасность", "аудит"]
    assert correct_terms(["кибербезопастность"], vocabulary) == ["кибербезопасность"]
    assert correct_terms(["аудитор", "зерттеулер"], vocabulary) == ["аудитор", "зерттеулер"]


def test_order_inside_top_follows_percent_and_availability() -> None:
    def card(i: str, percent: int, availability: str) -> SearchResult:
        return SearchResult(
            id=i, full_name=i, position="", city="", industry="", experience_years=1,
            availability=availability, match_percent=percent, matched=[], related=[], reasons=[],
        )  # fmt: skip

    ordered = order_by_percent(
        [
            card("a", 22, "available"),
            card("b", 53, "available"),
            card("c", 60, "busy"),
            card("d", 90, "available"),
        ]
    )
    assert [r.id for r in ordered] == ["b", "c", "a", "d"]  # 53 > 0.7*60 > 22; d остаётся вне топ-3
