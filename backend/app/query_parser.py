"""Разбор города, отрасли, минимального опыта и ключевых терминов."""

import json
import re
from collections.abc import Iterable
from difflib import get_close_matches
from functools import lru_cache

from . import config
from .config import settings
from .schemas import ParsedQuery
from .text import contains, correct_terms, lemmas, normalize

MIN_FUZZY_LENGTH = 5
# «от 10 лет», «20+ лет», «более 5 лет», «опыт 7 лет», «10 жыл», «5+ years», «at least 10 years».
# Плюс уже убран нормализацией, поэтому «20+ лет» приходит как «20 лет».
EXPERIENCE_PATTERN = (
    r"\b(?:(?:от|не менее|минимум|более|больше|свыше|опыт\w*|стаж\w*)\s*)?(\d{1,2})\s*(?:лет|год\w*)"
    r"|\b(?:(?:at least|minimum|over|more than)\s*)?(\d{1,2})\s*(?:years?|yrs?)"
    r"|\b(\d{1,2})\s*жыл\w*(?:\s*астам)?"
)
# Просьба о доступности («свободный сейчас», «available now», «қазір бос»): занятых не показываем.
AVAILABILITY_WORDS = frozenset(
    {"свободный", "свободен", "свободна", "доступный", "доступен", "available", "free", "бос"}
)


@lru_cache(maxsize=2)
def dictionary(name: str) -> dict:
    return json.loads((settings.path(settings.dictionaries_dir) / f"{name}.json").read_text(encoding="utf-8"))


def fuzzy_city(words: list[str]) -> tuple[str, str] | None:
    """Город с опечаткой («алмты»): ближайшее написание из словаря; короткие слова не трогаем."""
    spellings = {
        normalize(spelling): canonical
        for canonical, aliases in dictionary("cities").items()
        for spelling in [canonical, *aliases]
        if len(spelling) >= MIN_FUZZY_LENGTH
    }
    for word in words:
        if len(word) < MIN_FUZZY_LENGTH:
            continue
        close = get_close_matches(word, list(spellings), n=1, cutoff=config.CITY_TYPO_CUTOFF)
        if close:
            return spellings[close[0]], word
    return None


def parse(query: str, vocabulary: Iterable[str] | None = None) -> ParsedQuery:
    """Извлекает ограничения, сохраняя предметные компетенции в терминах.

    С `vocabulary` (леммы базы) термины с опечатками заменяются словами базы.
    """
    normalized = normalize(query)
    words = normalized.split()
    available_only = any(word in AVAILABILITY_WORDS for word in words)
    words = [word for word in words if word not in AVAILABILITY_WORDS]
    city = None
    for canonical, aliases in dictionary("cities").items():
        alias_lemmas = [lemmas(alias, False) for alias in aliases]
        matched = [
            word
            for word in words
            if any(lemmas(word, False) == alias for alias in alias_lemmas)
            or word.startswith(normalize(canonical))
        ]
        if matched:
            city = canonical
            words = [word for word in words if word not in matched]
            break
    if city is None and (typo := fuzzy_city(words)):
        city, matched_word = typo
        words = [word for word in words if word != matched_word]
    remaining = " ".join(words)
    experience = re.search(EXPERIENCE_PATTERN, remaining)
    min_experience = int(next(g for g in experience.groups() if g)) if experience else None
    if experience:
        remaining = remaining[: experience.start()] + remaining[experience.end() :]
    terms = lemmas(remaining)
    if vocabulary is not None:
        terms = correct_terms(terms, vocabulary)
    scores = {
        name: sum(contains(terms, lemmas(alias)) for alias in aliases)
        for name, aliases in dictionary("industries").items()
    }
    industry = max(scores, key=scores.get) if any(scores.values()) else None
    return ParsedQuery(
        city=city,
        industry=industry,
        min_experience=min_experience,
        terms=terms,
        available_only=available_only,
    )
