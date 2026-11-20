"""Обоснования только из компетенций и полей исходного профиля."""

import numpy as np

from .config import POSITION_RELATED_COS, RELATED_COS_THRESHOLD
from .query_parser import canonical_city
from .schemas import Expert, Language, ParsedQuery
from .text import covered_terms

TEXTS = {
    "ru": {
        "matched": "Совпала компетенция: {}",
        "related": "Близкая компетенция: {}",
        "position": "Совпала должность: {}",
        "related_position": "Близкая должность: {}",
        "industry": "Отрасль: {}",
        "city": "Город: {}",
        "experience": "Опыт: {}",
        "available": "Свободен",
        "partial": "Частично доступен",
        "busy": "Занят",
        "other_city": "Другой город: {}; запрошен {}",
        "other_industry": "Другая отрасль: {}; запрошена {}",
        "low_experience": "Опыт {} ниже запрошенных {}",
    },
    "kk": {
        "matched": "Сәйкес құзыреттілік: {}",
        "related": "Жақын құзыреттілік: {}",
        "position": "Сәйкес лауазым: {}",
        "related_position": "Жақын лауазым: {}",
        "industry": "Сала: {}",
        "city": "Қала: {}",
        "experience": "Тәжірибе: {}",
        "available": "Бос",
        "partial": "Ішінара бос",
        "busy": "Бос емес",
        "other_city": "Басқа қала: {}; сұралған {}",
        "other_industry": "Басқа сала: {}; сұралған {}",
        "low_experience": "Тәжірибе {} сұралған {} мәнінен төмен",
    },
    "en": {
        "matched": "Matched skill: {}",
        "related": "Related skill: {}",
        "position": "Matched job title: {}",
        "related_position": "Related job title: {}",
        "industry": "Industry: {}",
        "city": "City: {}",
        "experience": "Experience: {}",
        "available": "Available",
        "partial": "Partly available",
        "busy": "Busy",
        "other_city": "Different city: {}; requested {}",
        "other_industry": "Different industry: {}; requested {}",
        "low_experience": "Experience {} is below the requested {}",
    },
}


def years_label(years: int, lang: Language = "ru") -> str:
    """Число с правильной формой слова «год» (или «year», «жыл»)."""
    if lang == "kk":
        return f"{years} жыл"
    if lang == "en":
        return f"{years} year" + ("" if years == 1 else "s")
    if years % 100 in range(11, 15):
        return f"{years} лет"
    return f"{years} " + {1: "год", 2: "года", 3: "года", 4: "года"}.get(years % 10, "лет")


def explain(
    expert: Expert,
    parsed: ParsedQuery,
    query_vec: np.ndarray,
    competency_vecs: np.ndarray,
    lang: Language = "ru",
    position_vec: np.ndarray | None = None,
) -> tuple[list[str], list[str], list[str]]:
    """Возвращает точные совпадения, смысловую близость и фактические причины."""
    texts = TEXTS[lang]
    matched, related = [], []
    for competency, vector in zip(expert.competencies, competency_vecs, strict=True):
        if covered_terms(parsed.terms, competency):
            matched.append(competency)
        elif float(vector @ query_vec) >= RELATED_COS_THRESHOLD:
            related.append(competency)
    reasons = [texts["matched"].format(item) for item in matched]
    reasons.extend(texts["related"].format(item) for item in related)
    if not matched and covered_terms(parsed.terms, expert.position):
        reasons.append(texts["position"].format(expert.position))
    elif not matched and position_vec is not None and float(position_vec @ query_vec) >= POSITION_RELATED_COS:
        reasons.append(texts["related_position"].format(expert.position))
    reasons.extend(
        [
            texts["industry"].format(expert.industry),
            texts["city"].format(expert.city),
            texts["experience"].format(years_label(expert.experience_years, lang)),
            texts[expert.availability],
        ]
    )
    return matched, related, reasons


def constraints(expert: Expert, parsed: ParsedQuery, lang: Language = "ru") -> list[str]:
    """Что мешает эксперту подойти: город, отрасль, опыт, доступность."""
    texts = TEXTS[lang]
    result = []
    if parsed.city and canonical_city(parsed.city) != canonical_city(expert.city):
        result.append(texts["other_city"].format(expert.city, parsed.city))
    if parsed.industry and parsed.industry != expert.industry:
        result.append(texts["other_industry"].format(expert.industry, parsed.industry))
    if parsed.min_experience is not None and expert.experience_years < parsed.min_experience:
        result.append(
            texts["low_experience"].format(
                years_label(expert.experience_years, lang), years_label(parsed.min_experience, lang)
            )
        )
    if expert.availability != "available":
        result.append(texts[expert.availability])
    return result
