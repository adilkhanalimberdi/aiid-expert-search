"""Обоснования только из компетенций и полей исходного профиля."""

import numpy as np

from .config import RELATED_COS_THRESHOLD
from .schemas import Expert, ParsedQuery
from .text import covered_terms


def years_label(years: int) -> str:
    """Число с правильной формой слова «год»."""
    if years % 100 in range(11, 15):
        return f"{years} лет"
    return f"{years} " + {1: "год", 2: "года", 3: "года", 4: "года"}.get(years % 10, "лет")


def explain(
    expert: Expert, parsed: ParsedQuery, query_vec: np.ndarray, competency_vecs: np.ndarray
) -> tuple[list[str], list[str], list[str]]:
    """Возвращает точные совпадения, смысловую близость и фактические причины."""
    matched, related = [], []
    for competency, vector in zip(expert.competencies, competency_vecs, strict=True):
        if covered_terms(parsed.terms, competency):
            matched.append(competency)
        elif float(vector @ query_vec) >= RELATED_COS_THRESHOLD:
            related.append(competency)
    reasons = [f"Совпала компетенция: {item}" for item in matched]
    reasons.extend(f"Близкая компетенция: {item}" for item in related)
    if not matched and covered_terms(parsed.terms, expert.position):
        reasons.append(f"Совпала должность: {expert.position}")
    reasons.extend(
        [
            f"Отрасль: {expert.industry}",
            f"Город: {expert.city}",
            f"Опыт: {years_label(expert.experience_years)}",
            {"available": "Свободен", "partial": "Частично доступен", "busy": "Занят"}[expert.availability],
        ]
    )
    return matched, related, reasons
