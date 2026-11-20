"""Обоснование для карточки. Только из реальных полей эксперта, без генерации текста."""


def explain(expert, parsed, query_vec, competency_vecs) -> tuple[list[str], list[str], list[str]]:
    """Возвращает (matched, related, reasons).

    matched: компетенции с точным совпадением лемм/синонимов.
    related: компетенции с косинусом к запросу >= RELATED_COS_THRESHOLD.
    reasons: короткие строки: «Совпала компетенция GMP», «Отрасль: фармацевтика», «Город: Алматы», «Свободна».
    """
    raise NotImplementedError
