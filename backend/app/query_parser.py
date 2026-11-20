"""Разбор города, отрасли, минимального опыта и ключевых терминов."""

import json
import re
from functools import lru_cache

from .config import settings
from .schemas import ParsedQuery
from .text import contains, lemmas, normalize


@lru_cache(maxsize=2)
def dictionary(name: str) -> dict:
    return json.loads((settings.path(settings.dictionaries_dir) / f"{name}.json").read_text(encoding="utf-8"))


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
    remaining = " ".join(words)
    experience = re.search(r"(?:от|не менее|минимум)\s*(\d+)\s*(?:лет|год\w*)", remaining)
    min_experience = int(experience[1]) if experience else None
    if experience:
        remaining = remaining[: experience.start()] + remaining[experience.end() :]
    terms = lemmas(remaining)
    scores = {
        name: sum(contains(terms, lemmas(alias)) for alias in aliases)
        for name, aliases in dictionary("industries").items()
    }
    industry = max(scores, key=scores.get) if any(scores.values()) else None
    return ParsedQuery(city=city, industry=industry, min_experience=min_experience, terms=terms)
