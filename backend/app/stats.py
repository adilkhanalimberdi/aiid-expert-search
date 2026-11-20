"""Статистика запросов и отзывов в той же локальной SQLite."""

import json
from collections import Counter

from .config import STATS_TOP_N, settings
from .feedback import connection


def log_query(parsed_terms: list[str], took_ms: int, is_weak_match: bool = False) -> None:
    """Записывает один поисковый запрос без повторного учёта одинаковых терминов."""
    with connection() as db:
        db.execute(
            "INSERT INTO queries(terms, took_ms, weak_match) VALUES (?, ?, ?)",
            (json.dumps(list(dict.fromkeys(parsed_terms)), ensure_ascii=False), took_ms, is_weak_match),
        )


def summary() -> dict:
    """Возвращает востребованные термины, скорость, отзывы и сохранённый eval."""
    with connection() as db:
        total, average = db.execute("SELECT COUNT(*), AVG(took_ms) FROM queries").fetchone()
        fit_rate = db.execute(
            "SELECT AVG(CASE verdict WHEN 'fit' THEN 1.0 ELSE 0.0 END) FROM feedback"
        ).fetchone()[0]
        rows = db.execute("SELECT terms FROM queries").fetchall()
    terms = Counter(term for row in rows for term in json.loads(row[0]))
    evaluation = settings.path("data/eval_results.json")
    evaluations = json.loads(evaluation.read_text(encoding="utf-8")) if evaluation.exists() else {}
    return {
        "total_queries": total,
        "avg_took_ms": round(average or 0.0, 1),
        "fit_rate": fit_rate,
        "top_competencies": [
            {"term": term, "count": count} for term, count in terms.most_common(STATS_TOP_N)
        ],
        "evaluations": [
            {key: value for key, value in run.items() if key != "queries"} for run in evaluations.values()
        ],
    }
