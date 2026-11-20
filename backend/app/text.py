"""Нормализация, морфология и фразовые синонимы для поиска."""

import json
import os
import re
from collections.abc import Iterable
from difflib import get_close_matches
from functools import lru_cache

import pymorphy3

from . import config
from .config import settings


def normalize(text: str) -> str:
    """Приводит текст к нижнему регистру и удаляет пунктуацию кроме дефиса."""
    return " ".join(re.sub(r"[^\w\s-]", " ", text.lower().replace("ё", "е"), flags=re.UNICODE).split())


@lru_cache(maxsize=1)
def morphology() -> pymorphy3.MorphAnalyzer:
    return pymorphy3.MorphAnalyzer()


@lru_cache(maxsize=50000)
def lemma(word: str) -> str:
    """Лемма слова; латиницу и короткие аббревиатуры (ИИ, ML) не трогаем."""
    if word.isascii() or len(word) <= 2 or not morphology().word_is_known(word):
        return word  # слова вне словаря («деплой») pymorphy портит, оставляем как есть
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


def same_stem(word: str, base: str) -> bool:
    """Слово вне словаря pymorphy совпадает с формой из словаря по основе.

    Казахские окончания («зерттеулер» → «зерттеу», «қауіпсіздігі» → «қауіпсіздік») и русские
    формы, которых не знает pymorphy («нейросетях» → «нейросеть»). Латиница только точно.
    """
    if word == base:
        return True
    if word.isascii() or base.isascii() or len(base) < config.MIN_STEM_LENGTH:
        return False
    common = len(os.path.commonprefix([word, base]))
    return common >= max(config.MIN_STEM_LENGTH, len(base) - config.STEM_TAIL_TOLERANCE)


def contains_stem(words: list[str], phrase: list[str] | tuple[str, ...]) -> bool:
    """Как contains, но слово запроса может отличаться от фразы окончанием."""
    n = len(phrase)
    return bool(phrase) and any(
        all(same_stem(w, p) for w, p in zip(words[i : i + n], phrase, strict=True))
        for i in range(len(words) - n + 1)
    )


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
        if any(contains_stem(terms, phrase) for phrase in group):
            expanded.extend(word for phrase in group for word in phrase)
    return list(dict.fromkeys(expanded))


def is_prefix_of_any(term: str, words: Iterable[str]) -> bool:
    """Термин-приставка («кибер») подтверждается словом «кибербезопасность»."""
    return len(term) >= config.MIN_TERM_LENGTH and any(word.startswith(term) for word in words)


def expand_vocabulary(terms: list[str], vocabulary: Iterable[str]) -> list[str]:
    """Добавляет слова базы, на которые похож неизвестный термин: по приставке или с опечаткой."""
    known = set(vocabulary)
    expanded = list(terms)
    for term in terms:
        if term in known or len(term) < config.MIN_TERM_LENGTH:
            continue
        by_prefix = sorted(word for word in known if word.startswith(term))
        expanded.extend(
            by_prefix or get_close_matches(term, sorted(known), n=2, cutoff=config.TERM_TYPO_CUTOFF)
        )
    return list(dict.fromkeys(expanded))


def correct_terms(terms: list[str], vocabulary: Iterable[str]) -> list[str]:
    """Заменяет термин с опечаткой словом базы («кибербезопастность» → «кибербезопасность»).

    Не трогает слова базы, приставки слов базы и термины из словаря синонимов (в том числе
    казахские формы), чтобы не превращать правильный запрос в другой.
    """
    known = set(vocabulary)
    synonym_words = {word for group in synonym_groups() for phrase in group for word in phrase}
    fixed = []
    for term in terms:
        if (
            term in known
            or term in synonym_words
            or len(term) < config.MIN_TERM_LENGTH
            or any(word.startswith(term) for word in known)
        ):
            fixed.append(term)
            continue
        close = get_close_matches(term, sorted(known), n=1, cutoff=config.TERM_FIX_CUTOFF)
        fixed.append(close[0] if close else term)
    return list(dict.fromkeys(fixed))


def covered_terms(terms: list[str], text: str) -> set[str]:
    """Возвращает исходные термины, подтверждённые текстом или фразовым синонимом."""
    words = lemmas(text)
    covered = set(terms) & set(words)
    covered |= {term for term in terms if is_prefix_of_any(term, words)}
    for group in synonym_groups():
        source = [phrase for phrase in group if contains_stem(terms, phrase)]
        if source and any(contains(words, phrase) for phrase in group):
            covered.update(term for term in terms if any(same_stem(term, p) for ph in source for p in ph))
    return covered
