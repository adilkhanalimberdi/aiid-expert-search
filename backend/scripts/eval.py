"""Оценка hit@k с именами, позициями и задержкой; без влияния отзывов."""

import argparse
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import settings
from app.data_loader import load_csv
from app.index import SearchIndex, build, encode_query
from app.ranker import search
from app.schemas import SearchRequest


def evaluate(index: SearchIndex, path: Path, mode: str, k: int) -> dict:
    """Измеряет запросы после отдельного прогрева модели."""
    queries = json.loads(path.read_text(encoding="utf-8"))
    details = []
    for item in queries:
        response = search(index, SearchRequest(query=item["query"], top_k=max(3, k)), mode)
        top = response.results[:k]
        position = next((i for i, result in enumerate(top, 1) if result.id in item["relevant"]), None)
        details.append(
            {
                "query": item["query"],
                "top": [r.id for r in top],
                "names": [r.full_name for r in top],
                "hit": position is not None,
                "position": position,
                "took_ms": response.took_ms,
            }
        )
        print(
            f"{item['query']} | "
            + ", ".join(f"{r.id} {r.full_name}" for r in top)
            + f" | hit={position is not None} position={position} | {response.took_ms} ms"
        )
    times = [item["took_ms"] for item in details]
    result = {
        "dataset": path.name,
        "mode": mode,
        "k": k,
        "hits": sum(item["hit"] for item in details),
        "total": len(details),
        "avg_ms": round(float(np.mean(times)), 1),
        "p95_ms": round(float(np.percentile(times, 95)), 1),
        "queries": details,
    }
    print(
        f"{path.name} {mode}: hit@{k} {result['hits']}/{result['total']}; "
        f"avg={result['avg_ms']} ms; p95={result['p95_ms']} ms"
    )
    return result


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", default="hybrid", choices=["hybrid", "bm25", "vector"])
    parser.add_argument("--file", type=Path, default=settings.path(settings.eval_queries))
    parser.add_argument("--k", type=int, choices=range(1, 21), default=3)
    parser.add_argument(
        "--all", action="store_true", help="Все режимы на эталоне, holdout и jury (после настройки)"
    )
    args = parser.parse_args()
    raw = settings.path(settings.experts_csv).read_bytes()
    experts, _ = load_csv(raw)
    index = build(experts, raw)
    encode_query("проверка загрузки модели")
    output = settings.path("data/eval_results.json")
    saved = json.loads(output.read_text(encoding="utf-8")) if output.exists() else {}
    runs = [(args.file, args.mode)]
    if args.all:
        runs = [
            (path, mode)
            for path in [
                args.file,
                *(
                    args.file.with_name(n)
                    for n in ("eval_holdout.json", "eval_jury.json", "eval_english.json")
                ),
            ]
            for mode in ["hybrid", "bm25", "vector"]
        ]
    for path, mode in runs:
        saved[f"{path.stem}:{mode}:k{args.k}"] = evaluate(index, path, mode, args.k)
        output.write_text(json.dumps(saved, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
