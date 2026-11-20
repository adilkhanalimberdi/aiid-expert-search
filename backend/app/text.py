"""Нормализация, морфология и фразовые синонимы для поиска."""

import json
import re
from functools import lru_cache

import pymorphy3

from .config import settings


def normalize(text: str) -> str:
    """Приводит текст к нижнему регистру и удаляет пунктуацию кроме дефиса."""
    return " ".join(re.sub(r"[^\w\s-]", " ", text.lower().replace("ё", "е"), flags=re.UNICODE).split())


@lru_cache(maxsize=1)
def morphology() -> pymorphy3.MorphAnalyzer:
    return pymorphy3.MorphAnalyzer()


@lru_cache(maxsize=50000)
def lemma(word: str) -> str:
    return morphology().parse(word)[0].normal_form


@lru_cache(maxsize=1)
def stopwords() -> frozenset[str]:
    lines = (
        (settings.path(settings.dictionaries_dir) / "stopwords.txt").read_text(encoding="utf-8").splitlines()
    )
    return frozenset(lemma(line.strip()) for line in lines if line.strip() and not line.startswith("#"))


def lemmas(text: str, drop_stopwords: bool = True) -> list[str]:
    """Возвращает леммы, разделяя дефисные сочетания на слова."""
    words = [lemma(word) for word in normalize(text).replace("-", " ").split()]
    return [word for word in words if not drop_stopwords or word not in stopwords()]


def contains(words: list[str], phrase: list[str] | tuple[str, ...]) -> bool:
    """Проверяет непрерывную последовательность лемм."""
    return bool(phrase) and any(words[i : i + len(phrase)] == list(phrase) for i in range(len(words)))


@lru_cache(maxsize=1)
def synonym_groups() -> tuple:
    data = json.loads(
        (settings.path(settings.dictionaries_dir) / "synonyms.json").read_text(encoding="utf-8")
    )
    return tuple(tuple(tuple(lemmas(phrase)) for phrase in group) for group in data["groups"])


def expand_synonyms(terms: list[str]) -> list[str]:
    """Расширяет только целиком найденные фразы, без рекурсивного разрастания."""
    expanded = list(terms)
    for group in synonym_groups():
        if any(contains(terms, phrase) for phrase in group):
            expanded.extend(word for phrase in group for word in phrase)
    return list(dict.fromkeys(expanded))


def covered_terms(terms: list[str], text: str) -> set[str]:
    """Возвращает исходные термины, подтверждённые текстом или фразовым синонимом."""
    words = lemmas(text)
    covered = set(terms) & set(words)
    for group in synonym_groups():
        source = [phrase for phrase in group if contains(terms, phrase)]
        if source and any(contains(words, phrase) for phrase in group):
            covered.update(word for phrase in source for word in phrase)
    return covered
