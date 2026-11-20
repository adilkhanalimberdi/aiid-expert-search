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
    monkeypatch.setattr("app.ranker.encode_query", lambda *_: np.array([1.0, 0.0]))
    response = search(index, SearchRequest(query="несуществующий", industry="Инженерия", hide_busy=True))
    assert [result.id for result in response.results] == ["0"]
    assert response.results[0].debug["bm25_rank"] is None
    assert response.results[0].matched == []
    monkeypatch.setattr("app.ranker.encode_query", lambda *_: np.array([0.0, 1.0]))
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


def test_kazakh_explanations() -> None:
    from app.explain import TEXTS, years_label

    assert set(TEXTS["kk"]) == set(TEXTS["ru"])
    assert years_label(23, "kk") == "23 жыл"


def test_embedding_text_ignores_case_and_spaces() -> None:
    from app.text import model_text

    assert model_text("МҰҒАЛІМ ") == model_text("мұғалім") == "мұғалім"
    assert model_text("Ёлка   Вуз") == "елка вуз"


def test_overlapping_synonym_groups_are_merged() -> None:
    from app.text import related_phrases

    related = {" ".join(phrase) for phrase in related_phrases(("искусственный", "интеллект"))}
    assert {"ml", "нейросеть", "жасанды интеллект", "машинный обучение"} <= related


def test_synonyms_cross_languages() -> None:
    position = "Преподаватель. Компетенции: методика преподавания"
    for word in ("мұғалім", "оқытушы", "teacher", "учитель", "педагог"):
        assert covered_terms(lemmas(word), position), word
    assert not covered_terms(lemmas("юрист"), position)


def test_industry_is_found_by_synonym_in_any_language() -> None:
    industries = ("IT", "Образование", "Промышленность")
    assert parse("мұғалім", None, industries).industry == "Образование"
    assert parse("teacher", None, industries).industry == "Образование"
    assert parse("мұнай", None, industries).industry == "Промышленность"
    assert parse("бағдарламашы", None, industries).industry == "IT"
    # отрасль чужого каталога находится по её названию и синонимам, а не по демо-словарю
    assert parse("нужен банк", None, ("Банк", "IT")).industry != "IT"


def test_semantic_coverage_counts_without_dictionary(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.ranker import coverage_of, term_credits

    experts = [
        Expert(
            id=str(i), full_name="Т", position="П", industry="X", competencies=["К"], city="Астана",
            experience_years=1, availability="available",
        )
        for i in range(2)
    ]  # fmt: skip
    index = SearchIndex(
        experts,
        BM25Okapi([["а"], ["б"]]),
        np.eye(2),
        [np.eye(2)[:1]] * 2,
        ["а", "б"],
        position_vecs=np.eye(2),
        target_matrix=np.array([[1.0, 0.0], [1.0, 0.0], [0.0, 1.0], [0.0, 1.0]]),
        target_offsets=np.array([0, 2]),
    )
    monkeypatch.setattr("app.ranker.encode_terms", lambda _: np.array([[1.0, 0.0]]))
    parsed = parse("незнакомоеслово")
    credits = term_credits(index, parsed)
    assert credits.shape == (2, 1)
    assert coverage_of(index, 0, parsed, credits) == 1.0  # косинус 1 выше CEIL: покрытие полное
    assert coverage_of(index, 1, parsed, credits) == 0.0  # косинус 0 ниже FLOOR


def test_feedback_moves_expert_inside_top_group() -> None:
    from app.ranker import order_by_percent
    from app.schemas import SearchResult

    def card(i: str, percent: int) -> SearchResult:
        return SearchResult(
            id=i, full_name=i, position="", city="", industry="", experience_years=1,
            availability="available", match_percent=percent, matched=[], related=[], reasons=[],
        )  # fmt: skip

    results = [card("a", 80), card("b", 78), card("c", 70)]
    assert [r.id for r in order_by_percent(results)] == ["a", "b", "c"]
    assert [r.id for r in order_by_percent(results, {"a": 0.8})] == ["b", "c", "a"] or [
        r.id for r in order_by_percent(results, {"a": 0.8})
    ] == ["b", "a", "c"]
    assert order_by_percent(results, {"a": 0.8})[0].id == "b"


def test_feedback_is_weighted_by_query_similarity() -> None:
    from app.feedback import multipliers

    vectors = {"gmp алматы": np.array([1.0, 0.0]), "кибербезопасность": np.array([0.0, 1.0])}
    rows = [("gmp алматы", "E1", -1), ("gmp алматы", "E1", -1), ("кибербезопасность", "E2", 1)]
    same = multipliers(rows, "GMP Алматы", np.array([1.0, 0.0]), lambda text: vectors[text])
    assert same["E1"] == pytest.approx(0.8)  # тот же запрос: два голоса по 0,1
    assert "E2" not in same  # голос из другой темы ничего не весит
    close = multipliers(rows[:1], "другая формулировка", np.array([0.85, 0.5268]), lambda text: vectors[text])
    assert close["E1"] == pytest.approx(0.95)  # косинус 0,85: вес 0,5
    many = multipliers([("q", "E1", 1)] * 20, "q", np.array([1.0, 0.0]), lambda text: vectors["gmp алматы"])
    assert many["E1"] == pytest.approx(1.3)  # верхний предел


@pytest.mark.parametrize(
    ("query", "city"),
    [
        ("юрист из Москвы", "Москва"),
        ("в Семее", "Семей"),
        ("Қостанайдан", "Костанай"),
        ("welder Almaty", "Алматы"),
    ],
)
def test_extra_cities_are_found(query: str, city: str) -> None:
    assert parse(query).city == city


def test_feedback_queries_are_encoded_once_in_one_batch(monkeypatch: pytest.MonkeyPatch) -> None:
    from app import ranker

    calls: list[list[str]] = []

    def fake_encode(texts: list[str]) -> np.ndarray:
        calls.append(texts)
        return np.ones((len(texts), 2))

    monkeypatch.setattr(ranker, "encode_queries", fake_encode)
    index = SearchIndex([], BM25Okapi([["а"]]), np.zeros((0, 2)), [], [])
    ranker.warm_feedback(index, ["GMP Алматы", "кибербезопасность", "GMP Алматы"])
    ranker.warm_feedback(index, ["GMP Алматы", "мұғалім"])
    assert [len(batch) for batch in calls] == [2, 1]  # дубли и уже известные запросы не кодируются


@pytest.mark.parametrize(
    "query",
    ["проектирование электрических сетей для завода", "семейный бизнес и наследство", "сетевой инженер"],
)
def test_ordinary_words_are_not_cities(query: str) -> None:
    assert parse(query).city is None


@pytest.mark.parametrize(
    ("query", "city"), [("Алматыдан маман", "Алматы"), ("эколог алмты", "Алматы"), ("Шымкентке", "Шымкент")]
)
def test_city_typos_and_kazakh_cases_still_work(query: str, city: str) -> None:
    assert parse(query).city == city


@pytest.mark.parametrize(
    ("query", "terms", "available_only"),
    [
        ("busy expert in clinical trials", ["clinical", "trials"], False),
        ("available expert in clinical trials", ["clinical", "trials"], True),
        ("қолжетімді GMP маманы", ["gmp"], True),
    ],
)
def test_availability_words_are_not_terms(query: str, terms: list[str], available_only: bool) -> None:
    parsed = parse(query)
    assert parsed.available_only is available_only
    assert parsed.terms == terms


@pytest.mark.parametrize(
    ("query", "terms", "excluded"),
    [
        ("не нужен GMP, нужен BIM", ["bim"], ["gmp"]),
        ("BIM, кроме GMP", ["bim"], ["gmp"]),
        ("not GMP, need BIM", ["bim"], ["gmp"]),
        ("не GMP а BIM", ["bim"], ["gmp"]),
        ("не менее 10 лет BIM", ["bim"], []),
    ],
)
def test_negation_moves_terms_to_excluded(query: str, terms: list[str], excluded: list[str]) -> None:
    parsed = parse(query)
    assert parsed.terms == terms
    assert parsed.excluded_terms == excluded
    if "10 лет" in query:
        assert parsed.min_experience == 10


def test_kazakh_without_special_letters_matches() -> None:
    assert normalize("Қауіпсіздік Өндіріс") == normalize("кауипсиздик ондирис") == "кауипсиздик ондирис"
    assert covered_terms(lemmas("онеркасиптик кауипсиздик"), "промышленная безопасность")
    assert parse("колжетимди GMP маманы").available_only


@pytest.mark.parametrize(
    ("typed", "expected"),
    [
        ("vfibyyjt j,extybt", "машинное обучение"),
        ("ye;ty cgtwbfkbcn gj BIM", "нужен специалист gj BIM"),
        ("GMP Алматы", "GMP Алматы"),
        ("data scientist", "data scientist"),
        ("lean manufacturing", "lean manufacturing"),
        ("DevOps", "DevOps"),
    ],
)
def test_keyboard_layout_is_fixed_only_for_russian_words(typed: str, expected: str) -> None:
    from app.text import fix_keyboard_layout

    assert fix_keyboard_layout(typed) == expected


def test_city_query_puts_matching_city_first() -> None:
    from app.ranker import order_by_percent
    from app.schemas import SearchResult

    def card(i: str, percent: int, city: str, availability: str = "available") -> SearchResult:
        return SearchResult(
            id=i, full_name=i, position="", city=city, industry="", experience_years=1,
            availability=availability, match_percent=percent, matched=[], related=[], reasons=[],
        )  # fmt: skip

    results = [card("far", 63, "Астана"), card("near", 76, "Алматы", "busy"), card("weak", 30, "Алматы")]
    assert [r.id for r in order_by_percent(results, city="Алматы")] == ["near", "far", "weak"]
    assert [r.id for r in order_by_percent(results)] == [
        "far",
        "near",
        "weak",
    ]  # без города: процент × доступность


def test_typos_are_corrected_against_dictionary_words_and_stopwords() -> None:
    vocabulary = {"логистика": 1.0}
    assert correct_terms(["logidtics"], vocabulary) == ["logistics"]  # английское слово из словаря синонимов
    assert correct_terms(["мманы", "логистика"], vocabulary) == [
        "логистика"
    ]  # опечатка в стоп-слове «маманы»
    assert correct_terms(["юрист"], vocabulary) == ["юрист"]  # слово вне базы не превращается в другое


def test_phrase_holders_prefer_whole_competency() -> None:
    from app.ranker import phrase_holders

    def expert(i: str, competencies: list[str]) -> Expert:
        return Expert(
            id=i, full_name="Т", position="Инженер производства", industry="X", competencies=competencies,
            city="Астана", experience_years=5, availability="available",
        )  # fmt: skip

    experts = [
        expert("words", ["контроль качества", "производство"]),
        expert("phrase", ["контроль дефектов на производстве"]),
    ]
    index = SearchIndex(experts, BM25Okapi([["а"], ["б"]]), np.zeros((2, 2)), [], ["", ""])
    terms = lemmas("контроль дефектов на производстве")
    # «производство» тоже компетенция каталога, но целая фраза из четырёх слов весит больше
    assert phrase_holders(index, terms, [0, 1]) == [1, 0]
