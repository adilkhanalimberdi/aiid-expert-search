"""Индекс в памяти: BM25 по леммам + нормализованные эмбеддинги экспертов и их компетенций."""

from dataclasses import dataclass

from .schemas import Expert


@dataclass
class SearchIndex:
    experts: list[Expert]
    # bm25: rank_bm25.BM25Okapi
    # expert_vecs: np.ndarray            (n_experts, dim)
    # competency_vecs: list[np.ndarray]  по эксперту: (n_competencies, dim)


def build(experts: list[Expert]) -> SearchIndex:
    """Текст эксперта без города; кэш .npy по хэшу CSV в settings.cache_dir."""
    raise NotImplementedError


def encode_query(text: str):
    """Нормализованный вектор запроса (с QUERY_PREFIX)."""
    raise NotImplementedError
