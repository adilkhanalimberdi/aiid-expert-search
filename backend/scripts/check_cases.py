"""Прогон API-кейсов из docs/test-cases.md на запущенном сервере. Каталог и отзывы не меняет.

Запуск (сервер уже поднят на :8000):
    .venv/bin/python backend/scripts/check_cases.py            # macOS / Linux
    .venv\\Scripts\\python.exe backend\\scripts\\check_cases.py   # Windows
    ... --url http://localhost:8080                            # через nginx в Docker

Кейсы с пометкой KNOWN описывают известные недоработки: их провал ожидаем и не ломает код возврата,
а их неожиданное прохождение печатается как «исправлено». Код возврата 1, если упал обычный кейс.
"""

import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Callable

URL = "http://127.0.0.1:8000"
CASES: list[tuple[str, str, bool, Callable[[], tuple[bool, str]]]] = []
WEIGHT = {"available": 1.0, "partial": 0.85, "busy": 0.7}


def case(cid: str, title: str, known: bool = False) -> Callable:
    def register(fn: Callable[[], tuple[bool, str]]) -> Callable[[], tuple[bool, str]]:
        CASES.append((cid, title, known, fn))
        return fn

    return register


def call(method: str, path: str, body: dict | None = None) -> tuple[int, dict | list | None]:
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(
        URL + path, data=data, method=method, headers={"content-type": "application/json"}
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            raw = response.read()
            return response.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        return error.code, json.loads(error.read() or b"{}")


def search(query: str, **params: object) -> dict:
    status, body = call("POST", "/api/search", {"query": query, "top_k": 3, **params})
    assert status == 200, f"HTTP {status}: {body}"
    return body


def top_ids(query: str, k: int = 3) -> list[str]:
    return [item["id"] for item in search(query, top_k=max(k, 3))["results"][:k]]


@case("S01", "GMP и клинические исследования, Алматы")
def s01() -> tuple[bool, str]:
    data = search("нужен специалист по GMP и клиническим исследованиям из Алматы")
    best = data["results"][0]
    ok = best["city"] == "Алматы" and "GMP" in best["matched"] and not data["weak_match"]
    return ok, f"top1 {best['id']} {best['match_percent']}% matched={best['matched']}"


@case("S02", "тот же запрос по-английски даёт ту же тройку")
def s02() -> tuple[bool, str]:
    ru = set(top_ids("нужен специалист по GMP и клиническим исследованиям из Алматы"))
    en = set(top_ids("GMP and clinical trials specialist in Almaty"))
    return len(ru & en) >= 2, f"пересечение {len(ru & en)} из 3"


@case("S03", "казахский запрос: город и GMP")
def s03() -> tuple[bool, str]:
    data = search("Алматыда GMP бойынша маман керек")
    return data["parsed"]["city"] == "Алматы" and "GMP" in data["results"][0]["matched"], str(data["parsed"])


@case("S04", "регистр не влияет: мұғалім / Мұғалім / МҰҒАЛІМ")
def s04() -> tuple[bool, str]:
    tops = [top_ids(query) for query in ("мұғалім", "Мұғалім", "МҰҒАЛІМ")]
    return tops[0] == tops[1] == tops[2], str(tops)


@case("S05", "язык не влияет на процент: мұғалім / учитель / teacher / преподаватель")
def s05() -> tuple[bool, str]:
    best = [search(query)["results"][0] for query in ("мұғалім", "учитель", "teacher", "преподаватель")]
    percents = [item["match_percent"] for item in best]
    return max(percents) - min(percents) <= 15, f"проценты {percents}"


@case("S06", "опечатка в термине исправляется")
def s06() -> tuple[bool, str]:
    data = search("кибербезопастность алмата")
    ok = (
        "кибербезопасность" in data["parsed"]["terms"]
        and "кибербезопасность" in data["results"][0]["matched"]
    )
    return ok, f"terms={data['parsed']['terms']}"


@case("S07", "опечатка в городе исправляется")
def s07() -> tuple[bool, str]:
    city = search("эколог алмты")["parsed"]["city"]
    return city == "Алматы", f"city={city}"


@case("S08", "опыт из текста на трёх языках")
def s08() -> tuple[bool, str]:
    expected = {
        "ML-инженер от 10 лет": 10,
        "металлург 20+ лет": 20,
        "10 жылдан астам тәжірибе DevOps": 10,
        "DevOps 5+ years": 5,
        "опыт 7 лет GMP": 7,
    }
    got = {query: search(query)["parsed"]["min_experience"] for query in expected}
    return got == expected, str(got)


@case("S09", "«свободный сейчас» скрывает занятых и не становится термином")
def s09() -> tuple[bool, str]:
    data = search("специалист по GMP, свободный сейчас", top_k=8)
    busy = [item["id"] for item in data["results"] if item["availability"] == "busy"]
    ok = data["parsed"]["available_only"] and not busy and data["parsed"]["terms"] == ["gmp"]
    return ok, f"terms={data['parsed']['terms']} busy={busy}"


@case("S10", "фильтр «Скрыть занятых»")
def s10() -> tuple[bool, str]:
    statuses = [item["availability"] for item in search("BIM Астана", hide_busy=True, top_k=10)["results"]]
    return "busy" not in statuses, str(statuses)


@case("S11", "фильтр отрасли жёсткий")
def s11() -> tuple[bool, str]:
    results = search("STEM", industry="Образование", top_k=10)["results"]
    return bool(results) and all(
        item["industry"] == "Образование" for item in results
    ), f"{len(results)} рез."


@case("S12", "запросы вне базы помечаются слабыми")
def s12() -> tuple[bool, str]:
    weak = {q: search(q)["weak_match"] for q in ("юрист по налогам", "tax lawyer", "повар", "заңгер")}
    return all(weak.values()), str(weak)


@case("S13", "пустой, пробельный и слишком длинный запрос: 422")
def s13() -> tuple[bool, str]:
    codes = [call("POST", "/api/search", {"query": query})[0] for query in ("", "   ", "x" * 501)]
    return codes == [422, 422, 422], str(codes)


@case("S14", "аббревиатуры ИИ и ML не портятся")
def s14() -> tuple[bool, str]:
    first, second = search("специалист по ИИ")["parsed"]["terms"], search("ML инженер")["parsed"]["terms"]
    return "ии" in first and "ml" in second, f"{first} {second}"


@case("S15", "синоним: «испытания» находят «исследования»")
def s15() -> tuple[bool, str]:
    matched = search("эксперт по клиническим испытаниям препаратов")["results"][0]["matched"]
    return any("клинич" in item for item in matched), str(matched)


@case("S16", "инструмент находит дисциплину: docker → DevOps")
def s16() -> tuple[bool, str]:
    data = search("docker", top_k=5)
    return not data["weak_match"], f"weak={data['weak_match']} top1={data['results'][0]['position']}"


@case("S17", "порядок топ-3 совпадает с процентом × доступность")
def s17() -> tuple[bool, str]:
    broken = []
    for query in ("аудитор ISO 9001", "охрана труда Караганда", "GMP Алматы", "BIM Астана", "cybersecurity"):
        results = search(query, top_k=8)["results"]
        keys = [item["match_percent"] * WEIGHT[item["availability"]] for item in results[:3]]
        if keys != sorted(keys, reverse=True):
            broken.append(query)
    return not broken, f"нарушения: {broken}"


@case("S18", "обоснования на языке из lang (ru, en, kk)")
def s18() -> tuple[bool, str]:
    reasons = {lang: search("GMP Алматы", lang=lang)["results"][0]["reasons"] for lang in ("ru", "en", "kk")}
    ok = (
        any(r.startswith("Отрасль") for r in reasons["ru"])
        and any(r.startswith("Industry") for r in reasons["en"])
        and any(r.startswith("Сала") for r in reasons["kk"])
    )
    return ok, str({lang: items[1:2] for lang, items in reasons.items()})


@case("S19", "занятый эксперт остаётся в выдаче, но ниже")
def s19() -> tuple[bool, str]:
    statuses = [
        item["availability"] for item in search("проектирование электрических сетей", top_k=8)["results"]
    ]
    return "busy" in statuses, str(statuses)


@case("S20", "скорость: каждый запрос меньше 1 с, p95 меньше 300 мс")
def s20() -> tuple[bool, str]:
    queries = ["GMP", "BIM Астана", "мұғалім", "ML engineer 5+ years", "кибербезопасность банков"] * 4
    times = sorted(search(query)["took_ms"] for query in queries)
    p95 = times[int(len(times) * 0.95) - 1]
    return times[-1] < 1000 and p95 < 300, f"max={times[-1]} мс, p95={p95} мс"


@case("S21", "город вне демо-каталога узнаётся: Москва")
def s21() -> tuple[bool, str]:
    city = search("юрист из Москвы")["parsed"]["city"]
    return city == "Москва", f"city={city}"


@case("S22", "обычные слова не становятся городом: «сетей», «семейный»")
def s22() -> tuple[bool, str]:
    cities = {
        q: search(q)["parsed"]["city"] for q in ("проектирование электрических сетей", "семейный бизнес")
    }
    return not any(cities.values()), str(cities)


@case("S23", "казахский падеж города: Астанадағы")
def s23() -> tuple[bool, str]:
    city = search("Астанадағы BIM жобалаушы")["parsed"]["city"]
    return city == "Астана", f"city={city}"


@case("E01", "«Почему не он?»: ограничения на казахском")
def e01() -> tuple[bool, str]:
    query = urllib.parse.quote("GMP Астана")
    status, body = call("GET", f"/api/experts/E001/explain?query={query}&lang=kk")
    ok = status == 200 and "missing_terms" in body and any("қала" in c.lower() for c in body["constraints"])
    return ok, str(body.get("constraints"))


@case("E02", "explain неизвестного эксперта: 404")
def e02() -> tuple[bool, str]:
    status, _ = call("GET", "/api/experts/NOPE/explain?query=GMP")
    return status == 404, str(status)


@case("T01", "команда покрывает GMP, BIM и кибербезопасность")
def t01() -> tuple[bool, str]:
    status, body = call("POST", "/api/team", {"query": "GMP, BIM и кибербезопасность"})
    ok = status == 200 and 2 <= len(body["members"]) <= 3 and body["complete"]
    return ok, f"members={len(body['members'])} uncovered={body['uncovered_terms']}"


@case("M01", "похожие эксперты без самого эксперта")
def m01() -> tuple[bool, str]:
    status, body = call("GET", "/api/experts/E001/similar?limit=4")
    ids = [item["expert"]["id"] for item in body]
    return status == 200 and len(ids) == 4 and "E001" not in ids, str(ids)


@case("F01", "валидация отзыва: неверный вердикт 422, неизвестный эксперт 404")
def f01() -> tuple[bool, str]:
    wrong = call("POST", "/api/feedback", {"query": "q", "expert_id": "E001", "verdict": "maybe"})[0]
    missing = call("POST", "/api/feedback", {"query": "q", "expert_id": "NOPE", "verdict": "fit"})[0]
    return (wrong, missing) == (422, 404), f"{wrong}, {missing}"


@case("A01", "статистика отдаёт все поля")
def a01() -> tuple[bool, str]:
    status, body = call("GET", "/api/stats")
    keys = {"total_queries", "avg_took_ms", "fit_rate", "top_competencies", "unmet_demand", "evaluations"}
    return status == 200 and keys <= set(body), f"нет полей: {keys - set(body or {})}"


@case("A02", "каталог постранично, limit выше 100: 422")
def a02() -> tuple[bool, str]:
    status, body = call("GET", "/api/experts?offset=0&limit=5")
    too_big, _ = call("GET", "/api/experts?offset=0&limit=500")
    return status == 200 and len(
        body["items"]
    ) == 5 and too_big == 422, f"total={body['total']}, 500 → {too_big}"


@case("K01", "запрос только с городом показывает экспертов этого города")
def k01() -> tuple[bool, str]:
    data = search("специалист из Шымкента", top_k=5)
    cities = [item["city"] for item in data["results"]]
    return not data["weak_match"] and all(
        city == "Шымкент" for city in cities
    ), f"weak={data['weak_match']} {cities}"


@case("K02", "отрицание: «не нужен GMP, нужен BIM» не ищет GMP", known=True)
def k02() -> tuple[bool, str]:
    data = search("не нужен GMP, нужен BIM")
    return "gmp" not in data["parsed"]["terms"], f"terms={data['parsed']['terms']}"


@case("K03", "английские слова доступности не становятся терминами: busy, available")
def k03() -> tuple[bool, str]:
    terms = search("busy expert in clinical trials")["parsed"]["terms"]
    return "busy" not in terms, f"terms={terms}"


def main() -> int:
    global URL
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default=URL)
    URL = parser.parse_args().url.rstrip("/")
    failed, known_fixed = [], []
    for cid, title, known, fn in CASES:
        try:
            ok, note = fn()
        except Exception as error:  # кейс не должен ронять весь прогон
            ok, note = False, f"исключение: {error!r}"[:200]
        mark = "PASS" if ok else ("KNOWN" if known else "FAIL")
        print(f"{mark:5} {cid:4} {title} :: {note}")
        if not ok and not known:
            failed.append(cid)
        if ok and known:
            known_fixed.append(cid)
    regular = sum(1 for _, _, known, _ in CASES if not known)
    print(f"\nОбычные кейсы: {regular - len(failed)}/{regular} прошли; упали: {failed or 'нет'}")
    if known_fixed:
        print(f"Известные недоработки, которые теперь проходят (обновите docs/test-cases.md): {known_fixed}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
