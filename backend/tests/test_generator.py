"""Проверки воспроизводимости и состава синтетического каталога."""

import csv
import importlib.util
from collections import Counter
from pathlib import Path


def test_generator() -> None:
    root = Path(__file__).resolve().parents[1]
    spec = importlib.util.spec_from_file_location("generator", root / "scripts/generate_data.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    rows = module.generate()
    assert rows == module.generate()
    assert len(rows) == len({row["id"] for row in rows}) == 150
    assert set(Counter(row["industry"] for row in rows).values()) == {30}
    assert len({row["city"] for row in rows}) >= 6
    assert all(2 <= row["experience_years"] <= 30 for row in rows)
    assert all(3 <= len(row["competencies"].split(";")) <= 6 for row in rows)
    path = root / "data/experts.csv"
    assert path.read_bytes().startswith(b"\xef\xbb\xbf")
    with path.open(encoding="utf-8-sig", newline="") as stream:
        saved = list(csv.DictReader(stream))
    assert [row["id"] for row in saved] == [row["id"] for row in rows]
