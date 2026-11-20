"""hit@3 по эталонным запросам.

Запуск из корня репозитория:
    .venv\\Scripts\\python.exe backend\\scripts\\eval.py [--mode hybrid|bm25|vector] [--k 3]

Печатает по каждому запросу: топ-3, попал или нет, время, debug-ранги. В конце: X из N и среднее время.
"""

import argparse


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", default="hybrid", choices=["hybrid", "bm25", "vector"])
    parser.add_argument("--k", type=int, default=3)
    args = parser.parse_args()
    raise NotImplementedError(f"eval ещё не реализован (mode={args.mode}, k={args.k})")


if __name__ == "__main__":
    main()
