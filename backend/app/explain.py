"""Обоснования только из компетенций и полей исходного профиля."""

import numpy as np

from .config import RELATED_COS_THRESHOLD
from .schemas import Expert, ParsedQuery
from .text import covered_terms


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
    reasons.extend(
        [
            f"Отрасль: {expert.industry}",
            f"Город: {expert.city}",
            f"Опыт: {expert.experience_years} лет",
            {"available": "Свободен", "partial": "Частично доступен", "busy": "Занят"}[expert.availability],
        ]
    )
    return matched, related, reasons
