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


settings = Settings()

# Поиск
CITY_TYPO_CUTOFF = 0.8  # похожесть слова на город (difflib), чтобы поправить опечатку
MIN_TERM_LENGTH = 4  # короче: не ищем по префиксу и не исправляем опечатки
TERM_TYPO_CUTOFF = 0.8  # похожесть термина на слово из базы (difflib)
TERM_FIX_CUTOFF = 0.88  # термин заменяется словом базы («кибербезопастность»), строже расширения
MIN_STEM_LENGTH = 5  # основа короче не сравнивается по префиксу (казахские окончания)
STEM_TAIL_TOLERANCE = 1  # сколько последних букв основы может отличаться («нейросеть» / «нейросетях»)
SYNONYM_MERGE_MIN_SHARED = 2  # группы синонимов с таким числом общих фраз сливаются в одну
SYNONYM_BM25_WEIGHT = 0.5  # вес слов-синонимов в BM25 относительно слов самого запроса
EMBED_HINTS_MAX = 8  # сколько слов-синонимов добавляется к запросу перед эмбеддингом (0 выключает)
TOP_N_PER_RETRIEVER = 30  # сколько кандидатов берёт BM25 и вектор
RRF_K = 60  # score = sum(1 / (RRF_K + rank))
ORDER_GROUP_SIZE = 3  # без города: состав топ-3 решает RRF, порядок внутри по проценту x доступность
# С городом RRF не видит место (ни BM25, ни вектор его не учитывают): берём окно кандидатов шире и ставим
# сначала экспертов из названного города с процентом от CITY_PRIORITY_MIN_PERCENT, затем остальных.
RERANK_WINDOW_WITH_CITY = 15
CITY_PRIORITY_MIN_PERCENT = 40

# Отрасль по компетенции каталога: берём её, если у этой отрасли не меньше такой доли совпавших компетенций
INDUSTRY_FROM_DATA_MIN_SHARE = 0.6

# Бусты (множители к RRF-скору)
BOOST_CITY_MATCH = 1.3
BOOST_CITY_MISMATCH = 0.8  # город указан, но другой: не исключаем
BOOST_INDUSTRY_MATCH = 1.0  # отрасль угадана по тем же словам запроса: усиливать её второй раз значит считать дважды
BOOST_EXPERIENCE_BELOW = 0.85
BOOST_EXCLUDED_TERM = (
    0.3  # у эксперта есть то, что в запросе исключили («не нужен GMP»): опускаем, но не убираем
)
BOOST_AVAILABILITY = {"available": 1.0, "partial": 0.85, "busy": 0.7}
FEEDBACK_STEP = 0.1  # x(1 + step * сумма голосов с весом похожести запросов)
FEEDBACK_MIN, FEEDBACK_MAX = 0.7, 1.3
FEEDBACK_SIM_FLOOR = (
    0.7  # голос из другого запроса действует от этого косинуса запросов; тот же запрос весит 1
)

# Процент соответствия: 100 * (W_SEMANTIC * смысл + W_COVERAGE * покрытие)
W_SEMANTIC = 0.6
W_COVERAGE = 0.4
COS_FLOOR, COS_CEIL = 0.3, 0.8  # косинус растягивается с [0.3, 0.8] на [0, 1]
PERCENT_CAP = 99

# Смысловое покрытие терминов: термин сравнивается с компетенциями и должностью эксперта по эмбеддингам,
# поэтому «мұғалім», «учитель» и «teacher» находят «Преподаватель» без словаря синонимов.
# Косинус ниже FLOOR не даёт покрытия, от CEIL покрытие полное (запросы вне базы дают 0,55–0,67).
TERM_SEMANTIC_FLOOR = 0.66
TERM_SEMANTIC_CEIL = 0.80
POSITION_RELATED_COS = 0.7  # должность «близка по смыслу» к запросу, если нет точных совпадений

# Обоснование
RELATED_COS_THRESHOLD = 0.6  # компетенция «близка по смыслу»
WEAK_MATCH_COS = 0.35  # ниже: weak_match = true
FILTER_ONLY_PERCENT = (
    70  # запрос без терминов, только город или отрасль: все подходящие по фильтру получают это значение
)
WEAK_COMPETENCY_COS = 0.6  # нет ни одного подтверждённого термина и лучшая компетенция ниже: weak_match

# Параметры вычислений и ограничений ресурсов (не веса релевантности).
CPU_THREADS = 4
ENCODE_BATCH_SIZE = 16
UPLOAD_MAX_BYTES = 10 * 1024 * 1024
STATS_TOP_N = 5
TEAM_MIN_MEMBERS = 2
TEAM_MAX_MEMBERS = 3
