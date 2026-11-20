"""Разбор запроса: город, отрасль, минимальный опыт, ключевые термины."""

from .schemas import ParsedQuery


def parse(query: str) -> ParsedQuery:
    """Город и отрасль по словарям (по леммам; казахские падежи по префиксу), опыт regex-ом «от N лет»."""
    raise NotImplementedError
