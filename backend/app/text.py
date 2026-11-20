"""Нормализация и лемматизация. Один и тот же пайплайн для экспертов и запросов."""


def normalize(text: str) -> str:
    """Нижний регистр, ё→е, убрать пунктуацию кроме дефиса. Латинские аббревиатуры сохраняются."""
    raise NotImplementedError


def lemmas(text: str, drop_stopwords: bool = True) -> list[str]:
    """Леммы через pymorphy3 (с кэшем), без стоп-слов из dictionaries/stopwords.txt."""
    raise NotImplementedError


def expand_synonyms(terms: list[str]) -> list[str]:
    """Расширяет термины группами из dictionaries/synonyms.json. Только для BM25."""
    raise NotImplementedError
