"""Лог запросов и агрегаты для дашборда: топ-5 компетенций, среднее время, доля «подошёл»."""


def log_query(parsed_terms: list[str], took_ms: int) -> None:
    raise NotImplementedError


def summary() -> dict:
    raise NotImplementedError
