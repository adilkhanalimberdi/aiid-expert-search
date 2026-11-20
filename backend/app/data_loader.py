"""CSV → список Expert. Маппинг заголовков-синонимов, валидация, подсчёт битых строк."""

import csv
import io

from pydantic import ValidationError

from .schemas import Expert, UploadResponse

REQUIRED = [
    "id",
    "full_name",
    "position",
    "industry",
    "competencies",
    "city",
    "experience_years",
    "availability",
]

HEADER_ALIASES = {
    "фио": "full_name",
    "имя": "full_name",
    "name": "full_name",
    "должность": "position",
    "role": "position",
    "отрасль": "industry",
    "компетенции": "competencies",
    "skills": "competencies",
    "город": "city",
    "опыт": "experience_years",
    "стаж": "experience_years",
    "experience": "experience_years",
    "статус": "availability",
    "доступность": "availability",
    "status": "availability",
    "организация": "organization",
    "компания": "organization",
    "company": "organization",
    "о себе": "bio",
    "описание": "bio",
    "языки": "languages",
}

AVAILABILITY_ALIASES = {
    "свободен": "available",
    "свободна": "available",
    "available": "available",
    "частично": "partial",
    "partial": "partial",
    "занят": "busy",
    "занята": "busy",
    "busy": "busy",
}


def load_csv(raw: bytes) -> tuple[list[Expert], UploadResponse]:
    """Читает CSV (UTF-8, с BOM или без), компетенции и языки делит по ';'."""
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValueError("CSV должен быть в кодировке UTF-8") from exc
    reader = csv.DictReader(io.StringIO(text), strict=True)
    try:
        original = reader.fieldnames or []
        headers = [HEADER_ALIASES.get(name.strip().lower(), name.strip().lower()) for name in original]
        missing = [name for name in REQUIRED if name not in headers]
        if missing:
            raise ValueError("Отсутствуют обязательные колонки: " + ", ".join(missing))
        if len(set(headers)) != len(headers):
            raise ValueError("Повторяющиеся колонки CSV после преобразования заголовков")
        reader.fieldnames = headers
        experts, errors, seen = [], [], set()
        for row in reader:
            try:
                if None in row or any(not (row.get(key) or "").strip() for key in REQUIRED):
                    raise ValueError("пустое обязательное поле или лишняя колонка")
                data = {key: (value or "").strip() for key, value in row.items()}
                data["competencies"] = [
                    value.strip() for value in data["competencies"].split(";") if value.strip()
                ]
                data["languages"] = [
                    value.strip() for value in data.get("languages", "").split(";") if value.strip()
                ]
                data["availability"] = AVAILABILITY_ALIASES.get(
                    data["availability"].lower(), data["availability"]
                )
                expert = Expert(**data)
                if expert.id in seen or not expert.competencies or expert.experience_years < 0:
                    raise ValueError("повтор id, пустые компетенции или отрицательный опыт")
                experts.append(expert)
                seen.add(expert.id)
            except (ValueError, ValidationError) as exc:
                errors.append(f"Строка {reader.line_num}: {exc}")
    except csv.Error as exc:
        raise ValueError(f"Некорректный CSV: {exc}") from exc
    if not experts:
        raise ValueError("CSV не содержит корректных экспертов" + (": " + errors[0] if errors else ""))
    return experts, UploadResponse(loaded=len(experts), skipped=len(errors), errors=errors)
