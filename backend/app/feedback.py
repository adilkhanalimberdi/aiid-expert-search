"""Отзывы «подошёл / не подошёл» в SQLite (settings.feedback_db)."""


def save(query: str, expert_id: str, verdict: str) -> None:
    raise NotImplementedError


def multiplier(expert_id: str) -> float:
    """x(1 + FEEDBACK_STEP * (fit - not_fit)), обрезано в [FEEDBACK_MIN, FEEDBACK_MAX]."""
    raise NotImplementedError
