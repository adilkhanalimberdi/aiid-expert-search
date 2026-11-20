"""Разбор города, отрасли, минимального опыта и ключевых терминов."""

import json
import re
from difflib import get_close_matches
from functools import lru_cache

from . import config
from .config import settings
from .schemas import ParsedQuery
from .text import contains, lemmas, normalize

MIN_FUZZY_LENGTH = 5
# «от 10 лет», «не менее 5 лет» и английские «5+ years», «at least 10 years»
EXPERIENCE_PATTERN = (
    r"(?:от|не менее|минимум)\s*(\d+)\s*(?:лет|год\w*)"
    r"|(?:at least|minimum|over|more than)?\s*(\d+)\s*\+?\s*(?:years?|yrs?)"
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


def parse(query: str) -> ParsedQuery:
    """Извлекает ограничения, сохраняя предметные компетенции в терминах."""
    normalized = normalize(query)
    words = normalized.split()
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
    min_experience = int(experience[1] or experience[2]) if experience else None
    if experience:
        remaining = remaining[: experience.start()] + remaining[experience.end() :]
    terms = lemmas(remaining)
    scores = {
        name: sum(contains(terms, lemmas(alias)) for alias in aliases)
        for name, aliases in dictionary("industries").items()
    }
    industry = max(scores, key=scores.get) if any(scores.values()) else None
    return ParsedQuery(city=city, industry=industry, min_experience=min_experience, terms=terms)
