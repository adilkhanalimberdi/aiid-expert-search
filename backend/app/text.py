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

# Казахские буквы сводятся к русским: многие пишут без казахской раскладки («кауипсиздик», «ондирис»).
# Свёртка одинакова для запроса, словарей и профилей, поэтому «қауіпсіздік» и «кауипсиздик» совпадают.
# Модель (эмбеддинги) видит исходный текст: свёртка только для слов, BM25 и словарей.
KAZAKH_FOLD = str.maketrans("әғқңөұүһі", "агкноуухи")


def normalize(text: str) -> str:
    """Нижний регистр, ё → е, казахские буквы → русские, без пунктуации кроме дефиса."""
    folded = text.lower().replace("ё", "е").translate(KAZAKH_FOLD)
    return " ".join(re.sub(r"[^\w\s-]", " ", folded, flags=re.UNICODE).split())


LAYOUT_TO_RU = str.maketrans(
    "qwertyuiop[]asdfghjkl;'zxcvbnm,.`QWERTYUIOP{}ASDFGHJKL:\"ZXCVBNM<>~",
    "йцукенгшщзхъфывапролджэячсмитьбюёЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮЁ",
)
LAYOUT_TOKEN = re.compile(r"[A-Za-z\[\];',.`{}:\"<>~]{3,}")


def fix_keyboard_layout(query: str, vocabulary: Iterable[str] = ()) -> str:
    """Русские слова, набранные в английской раскладке («rb,th,tpjgfcyjcnm»), переводятся в кириллицу.

    Слово заменяется, только если после перевода получается русское слово из словаря pymorphy или слово
    каталога: настоящие английские слова и аббревиатуры («GMP», «data», «lean») так не превращаются.
    """
    known = set(vocabulary)

    def convert(match: re.Match) -> str:
        token = match.group(0)
        letters = token.strip(",.;:")
        # аббревиатуры (BIM, GMP) пишут заглавными, а текст в чужой раскладке обычно строчный;
        # короткое слово без раскладочных знаков слишком легко случайно совпадает с русским («ишь»)
        if letters.isupper() or letters.lower() in known:
            return token
        if len(letters) < 4 and not re.search(r"[\[\];',.`]", letters):
            return token
        converted = token.translate(LAYOUT_TO_RU)
        word = normalize(converted)
        if word and " " not in word and (lemma(word) in known or morphology().word_is_known(word)):
            return converted
        return token

    return LAYOUT_TOKEN.sub(convert, query)


TRANSLIT_TO_RU = [  # длинные сочетания раньше коротких: «shch» до «sh», «kh» до «h»
    ("shch", "щ"), ("sch", "щ"), ("zh", "ж"), ("kh", "х"), ("ts", "ц"), ("ch", "ч"), ("sh", "ш"),
    ("yu", "ю"), ("ya", "я"), ("yo", "е"), ("ye", "е"),
    ("a", "а"), ("b", "б"), ("v", "в"), ("g", "г"), ("d", "д"), ("e", "е"), ("z", "з"), ("i", "и"),
    ("j", "й"), ("k", "к"), ("l", "л"), ("m", "м"), ("n", "н"), ("o", "о"), ("p", "п"), ("r", "р"),
    ("s", "с"), ("t", "т"), ("u", "у"), ("f", "ф"), ("h", "х"), ("c", "ц"), ("y", "ы"), ("w", "в"),
    ("x", "кс"), ("q", "к"),
]  # fmt: skip
LATIN_WORD = re.compile(r"\b[A-Za-z]{2,}\b")
TRANSLIT_SERVICE_WORDS = {"без", "кроме", "не"}  # отрицание транслитом тоже должно работать: «bez GMP»


def from_translit(word: str) -> str:
    """Русское слово, написанное латиницей: «issledovaniya» → «исследования»."""
    text, out = word.lower(), []
    while text:
        if text in ("iy", "yy"):  # окончание «-ий», «-ый»; внутри слова «iya» это «ия»
            out.append("ий" if text == "iy" else "ый")
            break
        for latin, cyrillic in TRANSLIT_TO_RU:
            if text.startswith(latin):
                # «e» в начале слова чаще «э»: ekspert, effektivnost
                out.append("э" if latin == "e" and not out else cyrillic)
                text = text[len(latin) :]
                break
        else:
            out.append(text[0])
            text = text[1:]
    return "".join(out)


@lru_cache(maxsize=1)
def english_words() -> frozenset[str]:
    """Латинские слова словаря синонимов: их не переводим из транслита."""
    return frozenset(
        word for group in synonym_groups() for phrase in group for word in phrase if word.isascii()
    )


def fix_translit(query: str, vocabulary: Iterable[str] = ()) -> str:
    """Транслит («klinicheskie issledovaniya») переводится в кириллицу, если получается русское слово.

    Английские слова из словаря синонимов и слова каталога не трогаются («data» не станет «дата»),
    аббревиатуры (GMP, BIM) тоже: их пишут заглавными. Предлоги («po», «iz», «bez») переводятся,
    только если в запросе есть и содержательное слово транслитом.
    """
    known = set(vocabulary)
    english = english_words()

    def translit_word(token: str, service: bool) -> str:
        lower = token.lower()
        if token.isupper() or lower in known or lower in english:
            return token
        converted = from_translit(lower)
        # мягкий знак латиницей обычно не пишут: kiberbezopasnost → кибербезопасность
        for candidate in (
            converted,
            converted + "ь",
            converted.replace("э", "е", 1),
            re.sub(r"ц(я|ь)$", r"тс\1", converted),  # razbiraetsya → разбирается
        ):
            word = normalize(candidate)
            if service and (word in stopwords() or word in TRANSLIT_SERVICE_WORDS):
                return candidate
            if len(word) >= 4 and (lemma(word) in known or morphology().word_is_known(word)):
                return candidate
        return token

    content = LATIN_WORD.sub(lambda match: translit_word(match.group(0), service=False), query)
    latin_left = [word for word in LATIN_WORD.findall(content) if not word.isupper()]
    converted = len([word for word in LATIN_WORD.findall(query) if not word.isupper()]) - len(latin_left)
    if converted == 0 or converted < len(latin_left):
        return content  # запрос в основном английский: «to», «do», «in» не трогаем
    return LATIN_WORD.sub(lambda match: translit_word(match.group(0), service=True), content)


def fix_typing(query: str, vocabulary: Iterable[str] = ()) -> str:
    """Чужая раскладка, затем транслит: всё, что человек набрал не той системой письма."""
    known = list(vocabulary)
    return fix_translit(fix_keyboard_layout(query, known), known)


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
    return frozenset(
        lemma(word)
        for line in lines
        if line.strip() and not line.startswith("#")
        for word in normalize(line).split()
    )


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


_correction_pool: dict[int, tuple[frozenset[str], list[str]]] = {}


def correction_pool(vocabulary: Iterable[str]) -> tuple[frozenset[str], list[str]]:
    """Слова, к которым исправляем опечатки: слова каталога, словаря синонимов (английские, казахские)
    и стоп-слова (опечатка в «маманы» должна стать стоп-словом, а не термином). Кэш по словарю индекса."""
    key = id(vocabulary)
    if key not in _correction_pool:
        known = frozenset(vocabulary)
        synonym_words = {word for group in synonym_groups() for phrase in group for word in phrase}
        _correction_pool.clear()
        _correction_pool[key] = (known, sorted(known | synonym_words | stopwords()))
    return _correction_pool[key]


def correct_terms(terms: list[str], vocabulary: Iterable[str]) -> list[str]:
    """Заменяет термин с опечаткой ближайшим известным словом («кибербезопастность» → «кибербезопасность»,
    «logidtics» → «logistics»); опечатка в стоп-слове убирает термин.

    Не трогает слова базы, приставки слов базы и термины из словаря синонимов (в том числе
    казахские формы), чтобы не превращать правильный запрос в другой.
    """
    known, pool = correction_pool(vocabulary)
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
        close = get_close_matches(term, pool, n=1, cutoff=config.TERM_FIX_CUTOFF)
        if close and close[0] in stopwords():
            continue
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
