"""Генератор синтетических экспертов → backend/data/experts.csv.

Требования (AGENTS.md, «Порядок работы», п. 2): 150 экспертов, 5+ отраслей, 6+ городов из cities.json,
~20% busy и ~15% partial, вымышленные ФИО и компании, ловушки под eval_queries.json.
Детерминированно: фиксированный seed, повторный запуск даёт тот же файл.
"""

SEED = 42


def main() -> None:
    raise NotImplementedError


if __name__ == "__main__":
    main()
