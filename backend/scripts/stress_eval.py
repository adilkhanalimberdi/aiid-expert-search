"""Слепой стресс-набор: запросы из каталога, ошибки по классам, релевантность по правилу.

Не подбираем запросы руками, поэтому набор меряет обобщение, а не подгонку под эталон. Работает и на чужом
CSV (`--csv`): тогда английские и казахские варианты есть только для компетенций из таблицы TRANSLATIONS.

    .venv/bin/python backend/scripts/stress_eval.py                  # демо-каталог, сводка по классам
    .venv/bin/python backend/scripts/stress_eval.py --show-failures 40
    .venv/bin/python backend/scripts/stress_eval.py --csv path/to/jury.csv

Релевантен эксперт, у которого есть эта компетенция; если в запросе город, то ещё и из этого города.
Запрос засчитан, если хотя бы один релевантный в топ-3 (как в eval.py).
"""

import argparse
import random
import sys
from collections import defaultdict
from collections.abc import Callable
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import settings
from app.data_loader import load_csv
from app.index import build, encode_query
from app.ranker import search
from app.schemas import SearchRequest

# Переводы компетенций демо-каталога: независимая от synonyms.json таблица, как написал бы человек
TRANSLATIONS: dict[str, tuple[str, str]] = {
    "BIM": ("BIM", "BIM"),
    "CAD": ("CAD", "CAD"),
    "DevOps": ("DevOps", "DevOps"),
    "GCP": ("good clinical practice", "тиісті клиникалық практика"),
    "GDP": ("good distribution practice", "тиісті дистрибьюторлық практика"),
    "GMP": ("GMP", "GMP"),
    "HSE": ("health and safety", "еңбекті қорғау және қауіпсіздік"),
    "ISO 9001": ("ISO 9001", "ISO 9001"),
    "MLOps": ("MLOps", "MLOps"),
    "Python": ("Python", "Python"),
    "SQL": ("SQL", "SQL"),
    "STEM": ("STEM", "STEM"),
    "автоматизация": ("automation", "автоматтандыру"),
    "анализ данных": ("data analysis", "деректерді талдау"),
    "аудит качества": ("quality audit", "сапа аудиті"),
    "бережливое производство": ("lean manufacturing", "үнемді өндіріс"),
    "биостатистика": ("biostatistics", "биостатистика"),
    "биоэквивалентность": ("bioequivalence", "биоэквиваленттілік"),
    "валидация процессов": ("process validation", "процестерді валидациялау"),
    "вентиляция": ("ventilation", "желдету"),
    "водоснабжение": ("water supply", "сумен жабдықтау"),
    "геотехника": ("geotechnical engineering", "геотехника"),
    "дистанционное обучение": ("distance learning", "қашықтықтан оқыту"),
    "инженерия данных": ("data engineering", "деректер инженериясы"),
    "инклюзивное образование": ("inclusive education", "инклюзивті білім беру"),
    "кибербезопасность": ("cybersecurity", "киберқауіпсіздік"),
    "клинические испытания": ("clinical trials", "клиникалық сынақтар"),
    "клинические исследования": ("clinical research", "клиникалық зерттеулер"),
    "компьютерное зрение": ("computer vision", "компьютерлік көру"),
    "контроль дефектов на производстве": ("manufacturing defect inspection", "өндірістегі ақауларды бақылау"),
    "контроль качества": ("quality control", "сапаны бақылау"),
    "лабораторная диагностика": ("laboratory diagnostics", "зертханалық диагностика"),
    "логистика": ("logistics", "логистика"),
    "машинное обучение": ("machine learning", "машиналық оқыту"),
    "металлургия": ("metallurgy", "металлургия"),
    "методика преподавания": ("teaching methodology", "оқыту әдістемесі"),
    "механика": ("mechanical engineering", "механика"),
    "наставничество": ("mentoring", "тәлімгерлік"),
    "неразрушающий контроль": ("non-destructive testing", "бұзбайтын бақылау"),
    "нефтегаз": ("oil and gas", "мұнай-газ"),
    "облачная инфраструктура": ("cloud infrastructure", "бұлттық инфрақұрылым"),
    "обработка естественного языка": ("natural language processing", "табиғи тілді өңдеу"),
    "образовательная аналитика": ("learning analytics", "білім беру аналитикасы"),
    "обучение взрослых": ("adult education", "ересектерді оқыту"),
    "охрана труда": ("occupational safety", "еңбекті қорғау"),
    "оценка знаний": ("knowledge assessment", "білімді бағалау"),
    "подготовка преподавателей": ("teacher training", "мұғалімдерді даярлау"),
    "проектирование промышленных объектов": ("industrial facility design", "өнеркәсіптік нысандарды жобалау"),
    "проектное обучение": ("project-based learning", "жобалық оқыту"),
    "промышленная безопасность": ("industrial safety", "өнеркәсіптік қауіпсіздік"),
    "профориентация": ("career guidance", "кәсіптік бағдар беру"),
    "разработка API": ("API development", "API әзірлеу"),
    "разработка курсов": ("course development", "курстарды әзірлеу"),
    "разработка лекарств": ("drug development", "дәрі-дәрмек әзірлеу"),
    "расчёт конструкций": ("structural analysis", "конструкцияларды есептеу"),
    "регистрация препаратов": ("drug registration", "препараттарды тіркеу"),
    "рекомендательные системы": ("recommender systems", "ұсыныс жүйелері"),
    "ремонт оборудования": ("equipment maintenance", "жабдықты жөндеу"),
    "робототехника": ("robotics", "робототехника"),
    "робототехника для школ": ("school robotics", "мектептерге арналған робототехника"),
    "сейсмостойкость": ("seismic resistance", "сейсмикалық төзімділік"),
    "стерильное производство": ("sterile manufacturing", "стерильді өндіріс"),
    "тестирование ПО": ("software testing", "бағдарламалық жасақтаманы тестілеу"),
    "технический надзор": ("technical supervision", "техникалық қадағалау"),
    "управление продуктом": ("product management", "өнімді басқару"),
    "управление производством": ("production management", "өндірісті басқару"),
    "управление рисками": ("risk management", "тәуекелдерді басқару"),
    "учебные программы": ("curriculum design", "оқу бағдарламалары"),
    "фармаконадзор": ("pharmacovigilance", "фармакологиялық қадағалау"),
    "фармацевтическая логистика": ("pharmaceutical logistics", "фармацевтикалық логистика"),
    "цифровая педагогика": ("digital pedagogy", "цифрлық педагогика"),
    "цифровые двойники": ("digital twins", "цифрлық егіздер"),
    "экологический мониторинг": ("environmental monitoring", "экологиялық мониторинг"),
    "электроснабжение": ("power supply", "электрмен жабдықтау"),
    "энергетика": ("energy sector", "энергетика"),
    "энергоэффективность": ("energy efficiency", "энергия тиімділігі"),
}
CITY_NAMES = {  # как город напишут по-английски и по-казахски
    "Алматы": ("Almaty", "Алматы"),
    "Астана": ("Astana", "Астана"),
    "Шымкент": ("Shymkent", "Шымкент"),
    "Караганда": ("Karaganda", "Қарағанды"),
    "Актобе": ("Aktobe", "Ақтөбе"),
    "Атырау": ("Atyrau", "Атырау"),
    "Павлодар": ("Pavlodar", "Павлодар"),
    "Усть-Каменогорск": ("Oskemen", "Өскемен"),
    "Костанай": ("Kostanay", "Қостанай"),
    "Тараз": ("Taraz", "Тараз"),
    "Туркестан": ("Turkistan", "Түркістан"),
}
TEMPLATES = {
    "ru": ["нужен специалист по {x}", "ищу эксперта: {x}", "кто разбирается в {x}?", "{x}", "эксперт по {x}"],
    "en": ["need an expert in {x}", "{x} specialist", "looking for {x} consultant", "{x}"],
    "kk": ["{x} бойынша маман керек", "{x} сарапшысы", "{x} маманы керек", "{x}"],
}
CITY_TEMPLATES = {"ru": "{x} из города {c}", "en": "{x} expert in {c}", "kk": "{c}: {x} маманы"}

KK_TO_RU = str.maketrans("әғқңөұүһіӘҒҚҢӨҰҮҺІ", "агкноуухиАГКНОУУХИ")
RU_TO_LAYOUT = str.maketrans("йцукенгшщзхъфывапролджэячсмитьбюё", "qwertyuiop[]asdfghjkl;'zxcvbnm,.`")
TRANSLIT = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e", "ж": "zh", "з": "z", "и": "i",
    "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t",
    "у": "u", "ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch", "ъ": "", "ы": "y", "ь": "",
    "э": "e", "ю": "yu", "я": "ya",
}  # fmt: skip
KEYBOARD_ROWS = ["йцукенгшщзхъ", "фывапролджэ", "ячсмитьбю", "qwertyuiop", "asdfghjkl", "zxcvbnm"]
# соседняя клавиша в том же ряду (справа, у последней слева): самые частые опечатки
NEIGHBOURS = {
    row[i]: row[i + 1] if i + 1 < len(row) else row[i - 1] for row in KEYBOARD_ROWS for i in range(len(row))
}


def typo(text: str, rng: random.Random) -> str:
    """Одна опечатка в самом длинном слове: пропуск, перестановка, удвоение или соседняя клавиша."""
    words = text.split()
    candidates = [i for i, word in enumerate(words) if len(word) >= 5 and word.isalpha()]
    if not candidates:
        return text
    i = max(candidates, key=lambda index: (len(words[index]), rng.random()))
    word = words[i]
    pos = rng.randrange(1, len(word) - 1)
    kind = rng.choice(["drop", "swap", "double", "neighbour"])
    if kind == "drop":
        word = word[:pos] + word[pos + 1 :]
    elif kind == "swap":
        word = word[:pos] + word[pos + 1] + word[pos] + word[pos + 2 :]
    elif kind == "double":
        word = word[:pos] + word[pos] + word[pos:]
    else:
        char = word[pos].lower()
        word = word[:pos] + NEIGHBOURS.get(char, char) + word[pos + 1 :]
    words[i] = word
    return " ".join(words)


def second_typo(text: str, rng: random.Random) -> str:
    """Две опечатки: во втором по длине слове, если оно есть, иначе снова в том же."""
    first = typo(text, rng)
    words = first.split()
    longest = sorted(range(len(words)), key=lambda i: -len(words[i]))
    if len(longest) > 1 and len(words[longest[1]]) >= 5:
        words[longest[1]] = typo(words[longest[1]], rng)
        return " ".join(words)
    return typo(first, rng)


VARIANTS: dict[str, Callable[[str, random.Random], str]] = {
    "чисто": lambda text, rng: text,
    "опечатка": typo,
    "две опечатки": second_typo,
    "КАПСЛОК": lambda text, rng: text.upper(),
    "пунктуация": lambda text, rng: f"  {text.replace(' ', '  ')} !!! ",
}
RU_ONLY = {
    "раскладка": lambda text, rng: text.lower().translate(RU_TO_LAYOUT),
    "транслит": lambda text, rng: "".join(TRANSLIT.get(ch, ch) for ch in text.lower()),
}
KK_ONLY = {"без казахских букв": lambda text, rng: text.translate(KK_TO_RU)}


def build_cases(experts: list, rng: random.Random) -> list[dict]:
    by_competency: dict[str, list] = defaultdict(list)
    for expert in experts:
        for competency in expert.competencies:
            by_competency[competency].append(expert)
    cases = []
    for competency, owners in sorted(by_competency.items()):
        relevant = [expert.id for expert in owners]
        forms = {"ru": competency}
        if competency in TRANSLATIONS:
            forms["en"], forms["kk"] = TRANSLATIONS[competency]
        for lang, form in forms.items():
            base = rng.choice(TEMPLATES[lang]).format(x=form)
            variants = {**VARIANTS, **(RU_ONLY if lang == "ru" else {}), **(KK_ONLY if lang == "kk" else {})}
            for name, transform in variants.items():
                cases.append(
                    {"query": transform(base, rng), "relevant": relevant, "lang": lang, "variant": name,
                     "competency": competency, "owners": len(owners)}
                )  # fmt: skip
            city = rng.choice(sorted({expert.city for expert in owners}))
            if city in CITY_NAMES or lang == "ru":
                city_form = {"ru": city, "en": CITY_NAMES.get(city, (city, city))[0]}.get(
                    lang, CITY_NAMES.get(city, (city, city))[1]
                )
                in_city = [expert.id for expert in owners if expert.city == city]
                query = CITY_TEMPLATES[lang].format(x=form, c=city_form)
                cases.append(
                    {"query": query, "relevant": in_city, "lang": lang, "variant": "с городом",
                     "competency": competency, "owners": len(in_city)}
                )  # fmt: skip
    return cases


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", type=Path, default=settings.path(settings.experts_csv))
    parser.add_argument("--show-failures", type=int, default=0)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--sample", type=int, default=0, help="взять столько случайных компетенций (0 = все)")
    args = parser.parse_args()
    raw = args.csv.read_bytes()
    experts, _ = load_csv(raw)
    index = build(experts, raw)
    encode_query("прогрев")
    cases = build_cases(experts, random.Random(args.seed))
    if args.sample:
        chosen = set(random.Random(args.seed).sample(sorted({c["competency"] for c in cases}), args.sample))
        cases = [case for case in cases if case["competency"] in chosen]
    stats: dict[tuple[str, str], list[int]] = defaultdict(lambda: [0, 0])
    rarity: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    failures = []
    for case in cases:
        response = search(index, SearchRequest(query=case["query"], top_k=3))
        hit = any(result.id in case["relevant"] for result in response.results[:3])
        for key in [(case["lang"], case["variant"]), ("все", "все")]:
            stats[key][0] += hit
            stats[key][1] += 1
        bucket = "редкая (1–2 эксперта)" if case["owners"] <= 2 else "частая (3+)"
        rarity[bucket][0] += hit
        rarity[bucket][1] += 1
        if not hit:
            failures.append((case, [(r.id, r.match_percent) for r in response.results[:3]], response))
    print(f"{'язык':5} {'вариант':20} hit@3")
    for (lang, variant), (hits, total) in sorted(stats.items()):
        print(f"{lang:5} {variant:20} {hits:4}/{total:<4} {100 * hits / total:5.1f}%")
    for bucket, (hits, total) in rarity.items():
        print(f"{bucket:26} {hits:4}/{total:<4} {100 * hits / total:5.1f}%")
    for case, top, response in failures[: args.show_failures]:
        print(
            f"\nFAIL [{case['lang']}/{case['variant']}] «{case['query']}» → {case['competency']} "
            f"(релевантных {case['owners']})\n     terms={response.parsed.terms} city={response.parsed.city} "
            f"weak={response.weak_match} top={top}"
        )


if __name__ == "__main__":
    main()
