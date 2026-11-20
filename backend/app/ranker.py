"""BM25 + вектор → RRF → бусты → процент соответствия. Все числа в config.py."""

from .index import SearchIndex
from .schemas import SearchRequest, SearchResponse


def search(index: SearchIndex, req: SearchRequest, mode: str = "hybrid") -> SearchResponse:
    """mode: hybrid | bm25 | vector (последние два для сравнения в eval.py)."""
    raise NotImplementedError
