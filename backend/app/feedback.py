"""Отзывы в SQLite; один запрос агрегации на весь поиск."""

import sqlite3
from collections.abc import Callable, Iterator
from contextlib import contextmanager

import numpy as np

from .config import FEEDBACK_MAX, FEEDBACK_MIN, FEEDBACK_SIM_FLOOR, FEEDBACK_STEP, settings
from .text import model_text


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


def votes() -> list[tuple[str, str, int]]:
    """Все голоса: (запрос, эксперт, +1 «подошёл» или -1 «не подошёл»)."""
    with connection() as db:
        rows = db.execute("SELECT query, expert_id, verdict FROM feedback").fetchall()
    return [(query, expert_id, 1 if verdict == "fit" else -1) for query, expert_id, verdict in rows]


def multipliers(
    rows: list[tuple[str, str, int]],
    query: str,
    query_vec: np.ndarray,
    vector_of: Callable[[str], np.ndarray],
) -> dict[str, float]:
    """Множитель эксперта для этого запроса: голоса по похожим запросам, чем ближе тема, тем сильнее.

    Голос «не подошёл» по теме GMP не должен понижать эксперта в запросе про кибербезопасность.
    Тот же запрос весит 1, запрос другой темы (косинус ниже FEEDBACK_SIM_FLOOR) не весит ничего.
    """
    same = model_text(query)
    weights: dict[str, float] = {}
    for text in {row[0] for row in rows}:
        if model_text(text) == same:
            weights[text] = 1.0
            continue
        similarity = float(vector_of(text) @ query_vec)
        weights[text] = max(0.0, (similarity - FEEDBACK_SIM_FLOOR) / (1 - FEEDBACK_SIM_FLOOR))
    delta: dict[str, float] = {}
    for text, expert_id, sign in rows:
        delta[expert_id] = delta.get(expert_id, 0.0) + sign * weights[text]
    return {
        expert_id: max(FEEDBACK_MIN, min(FEEDBACK_MAX, 1 + FEEDBACK_STEP * total))
        for expert_id, total in delta.items()
        if total
    }
