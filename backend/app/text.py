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


def model_text(text: str) -> str:
    """Запрос для эмбеддинга: регистр и пробелы не должны менять результат («Мұғалім» = «мұғалім»)."""
    return " ".join(text.lower().replace("ё", "е").split())


@lru_cache(maxsize=1)
def morphology() -> pymorphy3.MorphAnalyzer:
    return pymorphy3.MorphAnalyzer()


@lru_cache(maxsize=50000)
def is_dictionary_word(word: str) -> bool:
    """Обычное русское слово из словаря pymorphy («сетей», «семейный»), а не опечатка и не казахская форма."""
    return not word.isascii() and morphology().word_is_known(word)


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


def merge_overlapping(groups: list[tuple[tuple[str, ...], ...]]) -> tuple[tuple[tuple[str, ...], ...], ...]:
    """Склеивает группы, у которых общие две фразы и больше: «ИИ» и «ML» не должны зависеть от порядка записи.

    Одна общая фраза не склеивает: слово-омоним («аудит», «качество») не должно соединять разные темы.
    """
    parent = list(range(len(groups)))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    shared: dict[tuple[int, int], int] = {}
    owners: dict[tuple[str, ...], list[int]] = {}
    for i, group in enumerate(groups):
        for phrase in group:
            owners.setdefault(phrase, []).append(i)
    for ids in owners.values():
        for a in ids:
            for b in ids:
                if a < b:
                    shared[(a, b)] = shared.get((a, b), 0) + 1
    for (a, b), count in shared.items():
        if count >= config.SYNONYM_MERGE_MIN_SHARED:
            parent[find(a)] = find(b)
    clusters: dict[int, list[tuple[str, ...]]] = {}
    for i, group in enumerate(groups):
        phrases = clusters.setdefault(find(i), [])
        phrases.extend(phrase for phrase in group if phrase not in phrases)
    return tuple(tuple(phrases) for phrases in clusters.values())


@lru_cache(maxsize=1)
def synonym_groups() -> tuple:
    data = json.loads(
        (settings.path(settings.dictionaries_dir) / "synonyms.json").read_text(encoding="utf-8")
    )
    groups = [tuple(tuple(lemmas(phrase)) for phrase in group) for group in data["groups"]]
    return merge_overlapping(groups)


def expand_synonyms(terms: list[str]) -> list[str]:
    """Расширяет только целиком найденные фразы, без рекурсивного разрастания."""
    expanded = list(terms)
    for _, group in active_groups(tuple(terms)):
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


@lru_cache(maxsize=512)
def active_groups(terms: tuple[str, ...]) -> tuple[tuple[tuple[str, ...], tuple[tuple[str, ...], ...]], ...]:
    """Группы синонимов, затронутые запросом: (фразы запроса из группы, все фразы группы).

    Считается один раз на запрос, а не на каждого эксперта: со словарём в сотни групп это главная экономия.
    """
    active = []
    for group in synonym_groups():
        source = tuple(phrase for phrase in group if contains_stem(list(terms), phrase))
        if source:
            active.append((source, group))
    return tuple(active)


@lru_cache(maxsize=2048)
def related_phrases(phrase: tuple[str, ...]) -> tuple[tuple[str, ...], ...]:
    """Фразы из групп синонимов, где есть эта фраза, и она сама: «teacher» → «преподаватель», «мұғалім»."""
    found = [phrase]
    for group in synonym_groups():
        if phrase in group:
            found.extend(p for p in group if p not in found)
    return tuple(found)


def synonym_hints(terms: list[str], limit: int) -> list[str]:
    """Синонимы терминов запроса для эмбеддинга: казахский запрос получает русские и английские формы."""
    known = set(terms)
    hints: list[str] = []
    for _, group in active_groups(tuple(terms)):
        for phrase in group:
            text = " ".join(phrase)
            if text and text not in known and text not in hints:
                hints.append(text)
    return hints[:limit]


@lru_cache(maxsize=65536)
def text_lemmas(text: str) -> tuple[list[str], frozenset[str]]:
    """Леммы текста и их множество, с кэшем: подбор команды проверяет всех экспертов на каждый запрос."""
    words = lemmas(text)
    return words, frozenset(words)


def has_phrase(words: list[str], word_set: frozenset[str], phrase: tuple[str, ...]) -> bool:
    """Фраза есть в тексте: однословная проверяется по множеству за O(1), многословная подряд по списку."""
    if len(phrase) == 1:
        return phrase[0] in word_set
    return phrase[0] in word_set and contains(words, phrase)


def covered_terms(terms: list[str], text: str) -> set[str]:
    """Возвращает исходные термины, подтверждённые текстом или фразовым синонимом."""
    words, word_set = text_lemmas(text)
    covered = set(terms) & word_set
    covered |= {term for term in terms if is_prefix_of_any(term, words)}
    for source, group in active_groups(tuple(terms)):
        if any(has_phrase(words, word_set, phrase) for phrase in group):
            covered.update(term for term in terms if any(same_stem(term, p) for ph in source for p in ph))
    return covered
