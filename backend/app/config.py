"""Настройки из .env и все веса ранжирования. Числа меняем только по выводу eval.py."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=REPO_DIR / ".env", extra="ignore")

    model_path: str = "models/bge-m3"
    query_prefix: str = ""
    passage_prefix: str = ""

    experts_csv: str = "data/experts.csv"
    uploaded_csv: str = "data/uploaded.csv"
    eval_queries: str = "data/eval_queries.json"
    dictionaries_dir: str = "data/dictionaries"
    cache_dir: str = "data/cache"
    feedback_db: str = "data/feedback.db"

    api_host: str = "127.0.0.1"
    api_port: int = 8000
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    def path(self, value: str) -> Path:
        """Путь из настроек относительно backend/."""
        p = Path(value)
        return p if p.is_absolute() else BACKEND_DIR / p

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()  # Поиск
TOP_N_PER_RETRIEVER = 30  # сколько кандидатов берёт BM25 и вектор
RRF_K = 60  # score = sum(1 / (RRF_K + rank))

# Бусты (множители к RRF-скору)
BOOST_CITY_MATCH = 1.3
BOOST_CITY_MISMATCH = 0.8  # город указан, но другой: не исключаем
BOOST_INDUSTRY_MATCH = 1.2
BOOST_EXPERIENCE_BELOW = 0.85
BOOST_AVAILABILITY = {"available": 1.0, "partial": 0.85, "busy": 0.7}
FEEDBACK_STEP = 0.05  # x(1 + step * (лайки - дизлайки))
FEEDBACK_MIN, FEEDBACK_MAX = (
    0.8,
    1.2,
)  # Процент соответствия: 100 * (W_SEMANTIC * смысл + W_COVERAGE * покрытие)
W_SEMANTIC = 0.6
W_COVERAGE = 0.4
COS_FLOOR, COS_CEIL = 0.3, 0.8  # косинус растягивается с [0.3, 0.8] на [0, 1]
PERCENT_CAP = 99  # Обоснование
RELATED_COS_THRESHOLD = 0.6  # компетенция «близка по смыслу»
WEAK_MATCH_COS = 0.35  # ниже: weak_match = true

# Параметры вычислений и ограничений ресурсов (не веса релевантности).
CPU_THREADS = 4
ENCODE_BATCH_SIZE = 16
UPLOAD_MAX_BYTES = 10 * 1024 * 1024
STATS_TOP_N = 5
TEAM_MIN_MEMBERS = 2
TEAM_MAX_MEMBERS = 3
