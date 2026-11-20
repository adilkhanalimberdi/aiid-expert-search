"""CSV → список Expert. Маппинг заголовков-синонимов, валидация, подсчёт битых строк."""

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
    raise NotImplementedError
