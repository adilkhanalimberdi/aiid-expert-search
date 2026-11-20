"""Офлайн-индекс BM25 и нормализованных векторов с дисковым кэшем."""

import hashlib
import json
import os
import threading
from dataclasses import dataclass
from functools import lru_cache
from typing import TYPE_CHECKING

import numpy as np
from rank_bm25 import BM25Okapi

from .config import CPU_THREADS, ENCODE_BATCH_SIZE, settings
from .schemas import Expert
from .text import lemmas

if TYPE_CHECKING:
    from sentence_transformers import SentenceTransformer

_model_lock = threading.RLock()


@lru_cache(maxsize=1)
def model() -> "SentenceTransformer":
    """Загружает единственную локальную модель без обращения к сети."""
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    import torch
    from sentence_transformers import SentenceTransformer

    path = settings.path(settings.model_path).resolve()
    if not path.is_relative_to((settings.path("models")).resolve()) or not path.is_dir():
        raise ValueError("Модель должна находиться в backend/models/")
    torch.set_num_threads(CPU_THREADS)
    return SentenceTransformer(str(path), device="cpu", local_files_only=True)


def encode(texts: list[str]) -> np.ndarray:
    """Кодирует тексты батчем, сериализуя доступ к общей CPU-модели."""
    with _model_lock:
        return model().encode(
            texts,
            batch_size=ENCODE_BATCH_SIZE,
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
        )


def encode_query(text: str) -> np.ndarray:
    return encode([settings.query_prefix + text])[0]


def expert_text(expert: Expert) -> str:
    """Создаёт поисковое представление без города и контактных полей."""
    return (
        f"{expert.position}. Компетенции: {'; '.join(expert.competencies)}. "
        f"Отрасль: {expert.industry}. {expert.bio or ''}"
    )


@dataclass
class SearchIndex:
    experts: list[Expert]
    bm25: BM25Okapi
    expert_vecs: np.ndarray
    competency_vecs: list[np.ndarray]
    texts: list[str]


def build(experts: list[Expert], raw_csv: bytes | None = None) -> SearchIndex:
    """Строит индекс с кэшем по CSV, имени модели, префиксу и текстам."""
    if not experts:
        raise ValueError("Каталог экспертов пуст")
    texts = [expert_text(expert) for expert in experts]
    competencies = list(dict.fromkeys(skill for expert in experts for skill in expert.competencies))
    payload = json.dumps(
        [settings.model_path, settings.passage_prefix, texts, competencies], ensure_ascii=False
    ).encode()
    digest = hashlib.sha256((raw_csv or b"") + payload).hexdigest()
    cache = settings.path(settings.cache_dir)
    cache.mkdir(parents=True, exist_ok=True)
    path = cache / f"{digest}.npy"
    vectors = None
    if path.exists():
        try:
            vectors = np.load(path, allow_pickle=False)
            if (
                vectors.ndim != 2
                or vectors.shape[0] != len(texts) + len(competencies)
                or not np.isfinite(vectors).all()
            ):
                vectors = None
        except (ValueError, OSError):
            vectors = None
    if vectors is None:
        vectors = encode([settings.passage_prefix + text for text in texts + competencies])
        temporary = path.with_suffix(f".{threading.get_ident()}.tmp")
        with temporary.open("wb") as stream:
            np.save(stream, vectors, allow_pickle=False)
        temporary.replace(path)
    by_competency = {skill: vectors[len(texts) + i] for i, skill in enumerate(competencies)}
    return SearchIndex(
        experts,
        BM25Okapi([lemmas(text) or [""] for text in texts]),
        vectors[: len(texts)],
        [np.stack([by_competency[skill] for skill in expert.competencies]) for expert in experts],
        texts,
    )
