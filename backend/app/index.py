"""Офлайн-индекс BM25 и нормализованных векторов с дисковым кэшем."""

import hashlib
import json
import os
import threading
from collections import Counter, OrderedDict
from dataclasses import dataclass
from functools import cached_property, lru_cache
from typing import TYPE_CHECKING

import numpy as np
from rank_bm25 import BM25Okapi

from .config import CPU_THREADS, ENCODE_BATCH_SIZE, settings
from .schemas import Expert
from .text import lemmas, model_text

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


_term_cache: dict[str, np.ndarray] = {}
_query_cache: OrderedDict[str, np.ndarray] = OrderedDict()
QUERY_CACHE_SIZE = 512


def encode_query(text: str, terms: tuple[str, ...] | list[str] = ()) -> np.ndarray:
    """Вектор запроса; новые термины кодируются тем же батчем и кладутся в кэш (один вызов модели).

    Готовые векторы запросов тоже в кэше: профиль (/explain), команда и смена языка повторяют
    тот же запрос, и модель (около 45 мс на вызов на CPU) второй раз не нужна.
    """
    key = settings.query_prefix + model_text(text)
    missing = [term for term in dict.fromkeys(terms) if term not in _term_cache]
    cached = _query_cache.get(key)
    if cached is not None and not missing:
        _query_cache.move_to_end(key)
        return cached
    vectors = encode([key] + [settings.query_prefix + t for t in missing])
    for term, vector in zip(missing, vectors[1:], strict=True):
        _term_cache[term] = vector
    _query_cache[key] = vectors[0]
    while len(_query_cache) > QUERY_CACHE_SIZE:
        _query_cache.popitem(last=False)
    return vectors[0]


def encode_queries(texts: list[str]) -> np.ndarray:
    """Несколько запросов одним вызовом модели, с той же нормализацией, что и encode_query."""
    return encode([settings.query_prefix + model_text(text) for text in texts])


WARM_TERMS_CHUNK = 64


def warm_terms(words: list[str]) -> None:
    """Заранее кодирует слова каталога как термины запроса, кусками, в фоне.

    Новые термины кодируются вместе с запросом и добиваются до его длины: запрос из трёх слов стоил
    модели как четыре запроса. Когда слова каталога уже в кэше, поиск прогоняет через модель только
    сам запрос. Куски по 64 слова: между ними пользовательский поиск успевает взять модель.
    """
    missing = [word for word in dict.fromkeys(words) if word not in _term_cache]
    for start in range(0, len(missing), WARM_TERMS_CHUNK):
        chunk = [word for word in missing[start : start + WARM_TERMS_CHUNK] if word not in _term_cache]
        if not chunk:
            continue
        for word, vector in zip(chunk, encode([settings.query_prefix + w for w in chunk]), strict=True):
            _term_cache[word] = vector


def term_vocabulary(index: "SearchIndex") -> list[str]:
    """Слова, которые вероятнее всего станут терминами запроса: леммы анкет и слова словаря синонимов."""
    from .text import lemmas, synonym_groups

    words = {word for text in index.texts for word in lemmas(text)}
    words |= {word for group in synonym_groups() for phrase in group for word in phrase}
    return sorted(words)


def warm_terms_in_background(index: "SearchIndex") -> threading.Thread:
    """Запускает warm_terms по словарю каталога, не задерживая старт сервера и загрузку CSV."""
    thread = threading.Thread(
        target=lambda: warm_terms(term_vocabulary(index)), daemon=True, name="warm-terms"
    )
    thread.start()
    return thread


def encode_terms(terms: list[str]) -> np.ndarray:
    """Векторы отдельных терминов запроса; повторные термины берутся из кэша."""
    missing = [term for term in dict.fromkeys(terms) if term not in _term_cache]
    if missing:
        for term, vector in zip(missing, encode([settings.query_prefix + t for t in missing]), strict=True):
            _term_cache[term] = vector
    return np.stack([_term_cache[term] for term in terms]) if terms else np.zeros((0, 1))


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
    # должность каждого эксперта и все смысловые «мишени» (компетенции и должность) для покрытия терминов
    position_vecs: np.ndarray | None = None
    target_matrix: np.ndarray | None = None
    target_offsets: np.ndarray | None = None

    @cached_property
    def unique_competencies(self) -> tuple[list[tuple[str, ...]], np.ndarray]:
        """Уникальные компетенции каталога (в леммах) и их векторы: распознавание компетенции по смыслу."""
        phrases: list[tuple[str, ...]] = []
        vectors = []
        seen: set[tuple[str, ...]] = set()
        for expert, block in zip(self.experts, self.competency_vecs, strict=False):
            for competency, vector in zip(expert.competencies, block, strict=False):
                phrase = tuple(lemmas(competency))
                if phrase and phrase not in seen:
                    seen.add(phrase)
                    phrases.append(phrase)
                    vectors.append(vector)
        return phrases, np.stack(vectors) if vectors else np.zeros((0, 1))

    @cached_property
    def competency_phrases(self) -> list[frozenset[tuple[str, ...]]]:
        """Компетенции каждого эксперта в леммах: для совпадения целой фразы, а не отдельных слов."""
        return [
            frozenset(phrase for phrase in (tuple(lemmas(c)) for c in expert.competencies) if phrase)
            for expert in self.experts
        ]

    @cached_property
    def competency_industries(self) -> dict[tuple[str, ...], Counter]:
        """В каких отраслях встречается каждая компетенция каталога (по леммам): отрасль запроса по данным."""
        result: dict[tuple[str, ...], Counter] = {}
        for expert in self.experts:
            for competency in expert.competencies:
                phrase = tuple(lemmas(competency))
                if phrase:
                    result.setdefault(phrase, Counter())[expert.industry] += 1
        return result

    @property
    def industry_names(self) -> tuple[str, ...]:
        """Отрасли загруженного каталога: по ним разбирается запрос и строится фильтр."""
        return tuple(sorted({expert.industry for expert in self.experts}))

    @property
    def city_names(self) -> tuple[str, ...]:
        """Города загруженного каталога: узнаём их в запросе, даже если их нет в словаре городов."""
        return tuple(sorted({expert.city for expert in self.experts}))

    def term_scores(self, term_vecs: np.ndarray) -> np.ndarray:
        """Лучший косинус термина с компетенциями и должностью эксперта: матрица (эксперты, термины)."""
        if self.target_matrix is None or self.target_offsets is None or term_vecs.shape[0] == 0:
            return np.zeros((len(self.experts), term_vecs.shape[0]))
        return np.maximum.reduceat(self.target_matrix @ term_vecs.T, self.target_offsets, axis=0)


def build(experts: list[Expert], raw_csv: bytes | None = None) -> SearchIndex:
    """Строит индекс с кэшем по CSV, имени модели, префиксу и текстам."""
    if not experts:
        raise ValueError("Каталог экспертов пуст")
    texts = [expert_text(expert) for expert in experts]
    competencies = list(dict.fromkeys(skill for expert in experts for skill in expert.competencies))
    positions = list(dict.fromkeys(expert.position for expert in experts))
    payload = json.dumps(
        [settings.model_path, settings.passage_prefix, texts, competencies, positions], ensure_ascii=False
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
                or vectors.shape[0] != len(texts) + len(competencies) + len(positions)
                or not np.isfinite(vectors).all()
            ):
                vectors = None
        except (ValueError, OSError):
            vectors = None
    if vectors is None:
        vectors = encode([settings.passage_prefix + text for text in texts + competencies + positions])
        temporary = path.with_suffix(f".{threading.get_ident()}.tmp")
        with temporary.open("wb") as stream:
            np.save(stream, vectors, allow_pickle=False)
        temporary.replace(path)
    by_competency = {skill: vectors[len(texts) + i] for i, skill in enumerate(competencies)}
    by_position = {name: vectors[len(texts) + len(competencies) + i] for i, name in enumerate(positions)}
    competency_vecs = [
        np.stack([by_competency[skill] for skill in expert.competencies]) for expert in experts
    ]
    position_vecs = np.stack([by_position[expert.position] for expert in experts])
    blocks = [np.vstack([competency_vecs[i], position_vecs[i]]) for i in range(len(experts))]
    offsets = np.cumsum([0] + [len(block) for block in blocks[:-1]])
    return SearchIndex(
        experts,
        BM25Okapi([lemmas(text) or [""] for text in texts]),
        vectors[: len(texts)],
        competency_vecs,
        texts,
        position_vecs=position_vecs,
        target_matrix=np.vstack(blocks),
        target_offsets=offsets,
    )
