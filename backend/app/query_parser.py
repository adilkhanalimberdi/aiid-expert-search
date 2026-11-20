"""Разбор города, отрасли, минимального опыта и ключевых терминов."""

import json
import re
from collections.abc import Iterable
from difflib import get_close_matches
from functools import lru_cache

from . import config
from .config import settings
from .schemas import ParsedQuery
from .text import contains_stem, correct_terms, is_dictionary_word, lemmas, normalize, related_phrases

MIN_FUZZY_LENGTH = 5
# «от 10 лет», «20+ лет», «более 5 лет», «опыт 7 лет», «10 жыл», «5+ years», «at least 10 years».
# Плюс уже убран нормализацией, поэтому «20+ лет» приходит как «20 лет».
EXPERIENCE_PATTERN = (
    r"\b(?:(?:от|не менее|минимум|более|больше|свыше|опыт\w*|стаж\w*)\s*)?(\d{1,2})\s*(?:лет|год\w*)"
    r"|\b(?:(?:at least|minimum|over|more than)\s*)?(\d{1,2})\s*(?:years?|yrs?)"
    r"|\b(\d{1,2})\s*жыл\w*(?:\s*астам)?"
)
# Просьба о доступности («свободный сейчас», «available now», «қазір бос»): занятых не показываем.
AVAILABILITY_WORDS = frozenset(
    {"свободный", "свободен", "свободна", "доступный", "доступен", "available", "free", "бос", "қолжетімді"}
)
# Слова о занятости: это не тема поиска и не просьба скрыть кого-то, поэтому просто отбрасываются.
BUSY_WORDS = frozenset({"busy", "occupied", "занят", "занятый", "занята"})
# Отрицание: «не нужен GMP, нужен BIM», «без GMP», «кроме GMP», «not GMP», «except GMP». Исключённая часть
# доходит до запятой, точки или слова, которым начинается нужное («нужен», «а», «but», «need»).
NEGATION_PATTERN = re.compile(
    r"(?:\bне\s+(?:нужен|нужна|нужны|нужно|надо|ищу|хочу)\b|\bне\b(?!\s+(?:менее|более|ниже|выше|старше|моложе|меньше|больше))"
    r"|\bбез\b|\bкроме\b|\bnot\b|\bexcept\b|\bexcluding\b|\bwithout\b)\s*"
    r"(?:(?:нужен|нужна|нужны|нужно|надо|needed|need)\s+)?"
    r"(?P<excluded>[^,;.!?]+?)(?=\s*(?:[,;.!?]|$)|\s+(?:а|но|нужен|нужна|нужны|нужно|need|want|but|looking)\b)"
)


def split_negation(query: str) -> tuple[str, str]:
    """Делит запрос на нужное и исключённое: «не нужен GMP, нужен BIM» → («, нужен BIM», «GMP»)."""
    text = query.lower().replace("ё", "е")
    excluded = [match.group("excluded") for match in NEGATION_PATTERN.finditer(text)]
    return NEGATION_PATTERN.sub(" ", text), " ".join(excluded)


@lru_cache(maxsize=4)
def dictionary(name: str) -> dict:
    """Словарь из data/dictionaries. Города: cities.json (города демо-каталога, по ним генерируются данные)
    плюс cities_extra.json (остальные города и написания только для разбора запросов)."""
    folder = settings.path(settings.dictionaries_dir)
    data = json.loads((folder / f"{name}.json").read_text(encoding="utf-8"))
    extra = folder / f"{name}_extra.json"
    if extra.exists():
        data = {**data, **json.loads(extra.read_text(encoding="utf-8"))}
    return data


@lru_cache(maxsize=4096)
def canonical_city(name: str) -> str:
    """Каноническое имя города: «Almaty» и «Алматы» это один город; незнакомое остаётся как есть."""
    key = tuple(lemmas(name, False))
    for canonical, aliases in dictionary("cities").items():
        if key in {tuple(lemmas(spelling, False)) for spelling in [canonical, *aliases]}:
            return canonical
    return name


def city_aliases(cities: tuple[str, ...] | None) -> dict[str, list[str]]:
    """Словарь городов плюс города загруженного каталога, которых в словаре нет («Москва», «Brest»)."""
    result = dict(dictionary("cities"))
    for name in cities or ():
        canonical = canonical_city(name)
        if canonical not in result:
            result[canonical] = [canonical]
    return result


def fuzzy_city(words: list[str], cities: dict[str, list[str]] | None = None) -> tuple[str, str] | None:
    """Город с опечаткой («алмты»): ближайшее написание из словаря; короткие слова не трогаем."""
    spellings = {
        normalize(spelling): canonical
        for canonical, aliases in (cities or dictionary("cities")).items()
        for spelling in [canonical, *aliases]
        if len(spelling) >= MIN_FUZZY_LENGTH
    }
    for word in words:
        # настоящее русское слово («сетей») не опечатка в названии города («Семей»)
        if len(word) < MIN_FUZZY_LENGTH or is_dictionary_word(word):
            continue
        close = get_close_matches(word, list(spellings), n=1, cutoff=config.CITY_TYPO_CUTOFF)
        if close:
            return spellings[close[0]], word
    return None


def industry_aliases(industries: tuple[str, ...] | None) -> dict[str, tuple[tuple[str, ...], ...]]:
    """Слова, по которым узнаём отрасль: словарь, само название и синонимы из общего словаря.

    Отрасли берутся из загруженных данных: для чужого CSV («Банкинг», «Agriculture») работает название
    отрасли и её синонимы, словарь industries.json добавляет слова для демо-каталога.
    """
    static = dictionary("industries")
    names = industries if industries is not None else tuple(static)
    result = {}
    for name in names:
        words = [*static.get(name, []), name]
        phrases = {tuple(lemmas(word)) for word in words if lemmas(word)}
        expanded = {related for phrase in phrases for related in related_phrases(phrase)}
        result[name] = tuple(sorted(expanded))
    return result


def parse(
    query: str,
    vocabulary: Iterable[str] | None = None,
    industries: tuple[str, ...] | None = None,
    cities: tuple[str, ...] | None = None,
) -> ParsedQuery:
    """Извлекает ограничения, сохраняя предметные компетенции в терминах.

    С `vocabulary` (леммы базы) термины с опечатками заменяются словами базы; с `industries` (отрасли
    загруженного каталога) отрасль ищется только среди них; с `cities` города каталога узнаются в запросе.
    """
    query, excluded_text = split_negation(query)
    normalized = normalize(query)
    words = normalized.split()
    available_only = any(word in AVAILABILITY_WORDS for word in words)
    words = [word for word in words if word not in AVAILABILITY_WORDS and word not in BUSY_WORDS]
    city = None
    city_dictionary = city_aliases(cities)
    for canonical, aliases in city_dictionary.items():
        alias_lemmas = [lemmas(alias, False) for alias in aliases]
        matched = [
            word
            for word in words
            if any(lemmas(word, False) == alias for alias in alias_lemmas)
            # префикс для казахских падежей («Алматыдан»); русское слово «семейный» городом не считается
            or (word.startswith(normalize(canonical)) and not is_dictionary_word(word))
        ]
        if matched:
            city = canonical
            words = [word for word in words if word not in matched]
            break
    if city is None and (typo := fuzzy_city(words, city_dictionary)):
        city, matched_word = typo
        words = [word for word in words if word != matched_word]
    remaining = " ".join(words)
    experience = re.search(EXPERIENCE_PATTERN, remaining)
    min_experience = int(next(g for g in experience.groups() if g)) if experience else None
    if experience:
        remaining = remaining[: experience.start()] + remaining[experience.end() :]
    terms = lemmas(remaining)
    if vocabulary is not None:
        terms = correct_terms(terms, vocabulary)
    scores = {
        name: sum(contains_stem(terms, phrase) for phrase in phrases)
        for name, phrases in industry_aliases(industries).items()
    }
    industry = max(scores, key=scores.get) if any(scores.values()) else None
    excluded_terms = lemmas(normalize(excluded_text)) if excluded_text else []
    if vocabulary is not None:
        excluded_terms = correct_terms(excluded_terms, vocabulary)
    return ParsedQuery(
        city=city,
        industry=industry,
        min_experience=min_experience,
        terms=terms,
        available_only=available_only,
        excluded_terms=excluded_terms,
    )
