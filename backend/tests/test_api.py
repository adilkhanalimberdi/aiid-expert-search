"""Интеграционные проверки API с настоящей локальной моделью и временной БД."""

import csv
import io
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import feedback
from app import index as index_module
from app.config import settings
from app.data_loader import load_csv
from app.main import app


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    monkeypatch.setattr(settings, "feedback_db", str(tmp_path / "nested/feedback.db"))
    monkeypatch.setattr(settings, "uploaded_csv", str(tmp_path / "uploaded.csv"))
    # фоновый прогрев словаря (тысячи слов через модель) тестам не нужен и только их тормозит
    monkeypatch.setattr(index_module, "warm_terms_in_background", lambda _index: None)
    with TestClient(app) as session:
        yield session


def test_endpoints(client: TestClient) -> None:
    assert client.get("/api/health").json()["experts"] == 150
    assert len(client.get("/api/industries").json()) == 5
    response = client.post("/api/search", json={"query": "нужен специалист по GMP из Алматы"})
    assert response.status_code == 200
    result = response.json()
    assert result["results"][0]["city"] == "Алматы"
    assert result["results"][0]["reasons"]
    expert_id = result["results"][0]["id"]
    assert client.get(f"/api/experts/{expert_id}").json()["competencies"]
    assert client.get("/api/experts/missing").status_code == 404
    assert (
        client.post(
            "/api/feedback", json={"query": "GMP", "expert_id": expert_id, "verdict": "fit"}
        ).status_code
        == 204
    )
    summary = client.get("/api/stats").json()
    assert summary["total_queries"] == 1
    assert summary["fit_rate"] == 1
    assert summary["top_competencies"]
    assert len(summary["evaluations"]) >= 6
    assert "/api/search" in client.get("/openapi.json").json()["paths"]
    assert feedback.votes() == [("GMP", expert_id, 1)]


@pytest.mark.parametrize("query", ["", "   ", "x" * 501])
def test_empty_query(client: TestClient, query: str) -> None:
    assert client.post("/api/search", json={"query": query}).status_code == 422


def test_filters_and_feedback_validation(client: TestClient) -> None:
    result = client.post(
        "/api/search", json={"query": "STEM", "industry": "Образование", "hide_busy": True}
    ).json()
    assert all(
        item["industry"] == "Образование" and item["availability"] != "busy" for item in result["results"]
    )
    assert (
        client.post(
            "/api/feedback", json={"query": "q", "expert_id": "missing", "verdict": "fit"}
        ).status_code
        == 404
    )
    assert (
        client.post(
            "/api/feedback", json={"query": "q", "expert_id": "E001", "verdict": "invalid"}
        ).status_code
        == 422
    )
    feedback.save("q", "E001", "fit")
    feedback.save("q", "E001", "not_fit")
    assert feedback.votes() == [("q", "E001", 1), ("q", "E001", -1)]


def test_upload_atomicity_and_restart(client: TestClient) -> None:
    raw = settings.path(settings.experts_csv).read_bytes()
    rows = list(csv.DictReader(io.StringIO(raw.decode("utf-8-sig"))))
    stream = io.StringIO()
    writer = csv.DictWriter(stream, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerow(rows[0])
    writer.writerow({**rows[1], "experience_years": "не число"})
    response = client.post(
        "/api/upload", files={"file": ("experts.csv", stream.getvalue().encode("utf-8"), "text/csv")}
    )
    assert response.status_code == 200
    assert response.json()["loaded"] == 1
    assert response.json()["skipped"] == 1
    assert response.json()["errors"]
    assert client.get("/api/health").json()["experts"] == 1
    for invalid in [b"id,name\nx,test", b"\xff\xfe", b""]:
        response = client.post("/api/upload", files={"file": ("bad.csv", invalid, "text/csv")})
        assert response.status_code == 400
        assert client.get("/api/health").json()["experts"] == 1
    with TestClient(app) as restarted:
        assert restarted.get("/api/health").json()["experts"] == 1
    response = client.post("/api/search", json={"query": "GMP"})
    assert response.json()["results"][0]["id"] == rows[0]["id"]


def test_upload_missing_column(client: TestClient) -> None:
    response = client.post("/api/upload", files={"file": ("bad.csv", b"id,name\n1,test", "text/csv")})
    assert response.status_code == 400
    assert "city" in response.json()["detail"]


def test_explain_any_expert(client: TestClient) -> None:
    response = client.get("/api/experts/E008/explain", params={"query": "GMP из Алматы от 30 лет"})
    assert response.status_code == 200
    result = response.json()
    assert result["expert"]["id"] == "E008"
    assert "gmp" in result["missing_terms"]
    assert any("Другой город" in item for item in result["constraints"])
    assert "Занят" in result["constraints"]
    assert any("ниже запрошенных" in item for item in result["constraints"])
    assert client.get("/api/experts/E001/explain", params={"query": "  "}).status_code == 422
    assert client.get("/api/experts/unknown/explain", params={"query": "GMP"}).status_code == 404


def test_team_coverage(client: TestClient) -> None:
    response = client.post("/api/team", json={"query": "GMP и BIM", "hide_busy": True})
    assert response.status_code == 200
    result = response.json()
    assert 2 <= len(result["members"]) <= 3
    assert result["complete"] and result["uncovered_terms"] == []
    assert {row["expert_id"] for row in result["coverage"]} == {item["id"] for item in result["members"]}
    assert all(item["availability"] != "busy" for item in result["members"])
    for term in ["gmp", "bim"]:
        assert any(row["terms"][term] for row in result["coverage"])
    missing = client.post(
        "/api/team", json={"query": "GMP и телепортация", "industry": "Фармацевтика"}
    ).json()
    assert not missing["complete"] and "телепортация" in missing["uncovered_terms"]
    assert client.post("/api/team", json={"query": "  "}).status_code == 422


def test_similar_experts(client: TestClient) -> None:
    response = client.get("/api/experts/E001/similar", params={"limit": 3})
    assert response.status_code == 200
    results = response.json()
    assert len(results) == 3
    assert all(item["expert"]["id"] != "E001" for item in results)
    assert results[0]["expert"]["id"] == "E002"
    assert [item["cosine"] for item in results] == sorted([item["cosine"] for item in results], reverse=True)
    assert client.get("/api/experts/unknown/similar").status_code == 404
    assert client.get("/api/experts/E001/similar?limit=0").status_code == 422


def test_csv_aliases_duplicates_and_quotes() -> None:
    raw = (
        "id,ФИО,Должность,Отрасль,Компетенции,Город,Опыт,Статус\n"
        "T1,Тест,Инженер,IT,Python,Алматы,10,свободен\n"
        "T1,Дубль,Инженер,IT,Python,Алматы,10,свободен\n"
    ).encode()
    experts, report = load_csv(raw)
    assert len(experts) == 1 and report.skipped == 1
    assert experts[0].availability == "available"
    with pytest.raises(ValueError, match="Некорректный CSV"):
        load_csv(raw + b'"broken')


def test_unmet_demand_counts_only_weak_queries(client: TestClient) -> None:
    client.post("/api/search", json={"query": "нужен юрист по налогам"})
    client.post("/api/search", json={"query": "нужен специалист по GMP"})
    summary = client.get("/api/stats").json()
    unmet = {item["term"] for item in summary["unmet_demand"]}
    assert {"юрист", "налог"} <= unmet
    assert "gmp" not in unmet


def test_experts_are_paginated(client: TestClient) -> None:
    page = client.get("/api/experts", params={"offset": 10, "limit": 5}).json()
    assert page["total"] == 150
    assert [item["id"] for item in page["items"]] == ["E011", "E012", "E013", "E014", "E015"]
    assert client.get("/api/experts", params={"offset": 149, "limit": 5}).json()["items"][0]["id"] == "E150"
    assert client.get("/api/experts", params={"limit": 0}).status_code == 422
    assert client.get("/api/experts", params={"limit": 101}).status_code == 422


def test_english_reasons_and_constraints(client: TestClient) -> None:
    result = client.post("/api/search", json={"query": "GMP Алматы", "lang": "en"}).json()
    assert any(reason.startswith("Matched skill") for reason in result["results"][0]["reasons"])
    explanation = client.get(
        "/api/experts/E008/explain", params={"query": "GMP из Алматы от 30 лет", "lang": "en"}
    ).json()
    assert "Busy" in explanation["constraints"]
    assert client.post("/api/search", json={"query": "GMP", "lang": "de"}).status_code == 422


def test_case_and_language_do_not_change_results(client: TestClient) -> None:
    def top(query: str) -> list[str]:
        response = client.post("/api/search", json={"query": query, "top_k": 3}).json()
        return [item["id"] for item in response["results"]]

    assert top("мұғалім") == top("Мұғалім") == top("МҰҒАЛІМ")
    kazakh, russian, english = top("мұғалім"), top("учитель"), top("teacher")
    assert len(set(kazakh) & set(russian)) >= 2
    assert len(set(russian) & set(english)) >= 2


def test_percent_does_not_depend_on_language(client: TestClient) -> None:
    def best_percent(query: str) -> int:
        return client.post("/api/search", json={"query": query, "top_k": 3}).json()["results"][0][
            "match_percent"
        ]

    teachers = [best_percent(word) for word in ("мұғалім", "учитель", "teacher", "преподаватель")]
    assert max(teachers) - min(teachers) <= 15
    ml = [best_percent(word) for word in ("машиналық оқыту", "машинное обучение", "machine learning")]
    assert max(ml) - min(ml) <= 10


def test_unknown_profession_is_still_weak(client: TestClient) -> None:
    for query in ("юрист", "заңгер", "бухгалтер", "повар", "lawyer"):
        assert client.post("/api/search", json={"query": query}).json()["weak_match"], query


def test_feedback_changes_ranking(client: TestClient) -> None:
    query = {"query": "GMP Алматы", "top_k": 20}
    before = client.post("/api/search", json=query).json()["results"]
    # соседи в одной группе порядка (топ-3 или остальные) с одинаковой доступностью и близким процентом
    pairs = [
        (before[i], before[i + 1])
        for i in range(len(before) - 1)
        if (i + 1 < 3 or i >= 3)
        and before[i]["availability"] == before[i + 1]["availability"]
        and before[i]["match_percent"] <= 1.4 * before[i + 1]["match_percent"]
    ]
    assert pairs
    first, second = pairs[-1]
    for _ in range(6):  # множитель отзывов ограничен: от 0,8 до 1,2
        client.post(
            "/api/feedback", json={"query": "GMP Алматы", "expert_id": first["id"], "verdict": "not_fit"}
        )
        client.post(
            "/api/feedback", json={"query": "GMP Алматы", "expert_id": second["id"], "verdict": "fit"}
        )
    after = [item["id"] for item in client.post("/api/search", json=query).json()["results"]]
    # демотированный эксперт либо стоит ниже соседа, либо выпал из выдачи совсем
    assert first["id"] not in after or after.index(second["id"]) < after.index(first["id"])
    assert second["id"] in after


def test_feedback_from_another_topic_does_not_change_ranking(client: TestClient) -> None:
    query = {"query": "GMP Алматы", "top_k": 8}
    before = [item["id"] for item in client.post("/api/search", json=query).json()["results"]]
    for _ in range(8):
        client.post(
            "/api/feedback", json={"query": "кибербезопасность", "expert_id": before[0], "verdict": "not_fit"}
        )
    after = [item["id"] for item in client.post("/api/search", json=query).json()["results"]]
    assert after == before


@pytest.mark.parametrize("query", ["специалист из Шымкента", "Шымкент"])
def test_city_only_query_filters_by_city(client: TestClient, query: str) -> None:
    result = client.post("/api/search", json={"query": query, "top_k": 5}).json()
    assert result["weak_match"] is False
    assert result["results"]
    assert {item["city"] for item in result["results"]} == {"Шымкент"}


def test_city_only_query_orders_by_availability(client: TestClient) -> None:
    result = client.post("/api/search", json={"query": "Алматы", "top_k": 20}).json()
    statuses = [item["availability"] for item in result["results"]]
    assert statuses == sorted(statuses, key={"available": 0, "partial": 1, "busy": 2}.__getitem__)


def test_excluded_term_is_not_searched_and_pushes_experts_down(client: TestClient) -> None:
    result = client.post("/api/search", json={"query": "не нужен GMP, нужен BIM", "top_k": 5}).json()
    assert result["parsed"]["terms"] == ["bim"]
    assert result["parsed"]["excluded_terms"] == ["gmp"]
    assert all("GMP" not in item["matched"] for item in result["results"])
    assert result["results"][0]["matched"] == ["BIM"]


def test_filter_only_flag_only_without_topic(client: TestClient) -> None:
    city_only = client.post("/api/search", json={"query": "специалист из Шымкента"}).json()
    assert city_only["filter_only"] and not city_only["weak_match"]
    assert all(item["city"] == "Шымкент" for item in city_only["results"])
    with_topic = client.post("/api/search", json={"query": "GMP из Шымкента"}).json()
    assert not with_topic["filter_only"]


def test_kazakh_terms_shown_as_typed(client: TestClient) -> None:
    body = client.post("/api/search", json={"query": "Мұғалім керек"}).json()
    assert "мұғалім" in body["parsed"]["terms"]
    assert "мугалим" not in body["parsed"]["terms"]
