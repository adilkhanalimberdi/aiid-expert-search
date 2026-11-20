"""Интеграционные проверки API с настоящей локальной моделью и временной БД."""

import csv
import io
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import feedback
from app.config import settings
from app.data_loader import load_csv
from app.main import app


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    monkeypatch.setattr(settings, "feedback_db", str(tmp_path / "nested/feedback.db"))
    monkeypatch.setattr(settings, "uploaded_csv", str(tmp_path / "uploaded.csv"))
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
    assert feedback.multiplier(expert_id) == pytest.approx(1.05)


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
    for _ in range(10):
        feedback.save("q", "E001", "fit")
    assert feedback.multiplier("E001") == 1.2
    for _ in range(30):
        feedback.save("q", "E001", "not_fit")
    assert feedback.multiplier("E001") == 0.8


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
