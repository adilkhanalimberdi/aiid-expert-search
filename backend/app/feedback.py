"""Отзывы в SQLite; один запрос агрегации на весь поиск."""

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager

from .config import FEEDBACK_MAX, FEEDBACK_MIN, FEEDBACK_STEP, settings


@contextmanager
def connection() -> Iterator[sqlite3.Connection]:
    """Открывает транзакцию и гарантирует закрытие соединения."""
    path = settings.path(settings.feedback_db)
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path)
    try:
        with db:
            db.execute(
                "CREATE TABLE IF NOT EXISTS feedback "
                "(id INTEGER PRIMARY KEY, query TEXT NOT NULL, expert_id TEXT NOT NULL, "
                "verdict TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)"
            )
            db.execute(
                "CREATE TABLE IF NOT EXISTS queries "
                "(id INTEGER PRIMARY KEY, terms TEXT NOT NULL, took_ms INTEGER NOT NULL, "
                "weak_match INTEGER NOT NULL DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)"
            )
            yield db
    finally:
        db.close()


def save(query: str, expert_id: str, verdict: str) -> None:
    """Сохраняет отзыв параметризованным запросом."""
    with connection() as db:
        db.execute(
            "INSERT INTO feedback(query, expert_id, verdict) VALUES (?, ?, ?)", (query, expert_id, verdict)
        )


def multipliers() -> dict[str, float]:
    """Вычисляет ограниченные множители для всех экспертов одним запросом."""
    with connection() as db:
        rows = db.execute(
            "SELECT expert_id, SUM(CASE verdict WHEN 'fit' THEN 1 ELSE -1 END) "
            "FROM feedback GROUP BY expert_id"
        ).fetchall()
    return {
        expert_id: max(FEEDBACK_MIN, min(FEEDBACK_MAX, 1 + FEEDBACK_STEP * delta))
        for expert_id, delta in rows
    }


def multiplier(expert_id: str) -> float:
    return multipliers().get(expert_id, 1.0)
