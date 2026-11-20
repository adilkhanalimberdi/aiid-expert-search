"""HTTP-проверка поиска и CSV с восстановлением демонстрационного каталога."""

import argparse
import csv
import io
import json
from pathlib import Path
from time import perf_counter

import httpx


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://localhost:8080")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    raw = (Path(__file__).resolve().parents[1] / "data/experts.csv").read_bytes()
    report = {"url": args.url}
    with httpx.Client(base_url=args.url, timeout=180) as client:
        started = perf_counter()
        response = client.post("/api/search", json={"query": "нужен специалист по GMP из Алматы", "top_k": 3})
        response.raise_for_status()
        result = response.json()
        assert result["results"] and result["results"][0]["reasons"]
        report["search_http"] = response.status_code
        report["search_ms"] = round((perf_counter() - started) * 1000, 1)
        report["top_id"] = result["results"][0]["id"]
        row = next(csv.DictReader(io.StringIO(raw.decode("utf-8-sig"))))
        row["id"] = "SMOKE_TEST"
        stream = io.StringIO()
        writer = csv.DictWriter(stream, fieldnames=list(row))
        writer.writeheader()
        writer.writerow(row)
        try:
            response = client.post(
                "/api/upload", files={"file": ("smoke.csv", stream.getvalue().encode(), "text/csv")}
            )
            response.raise_for_status()
            assert response.json()["loaded"] == 1
            report["upload"] = response.json()
            result = client.post("/api/search", json={"query": "GMP"}).json()
            assert [item["id"] for item in result["results"]] == ["SMOKE_TEST"]
            invalid = client.post(
                "/api/upload", files={"file": ("invalid.csv", b"id,name\n1,test", "text/csv")}
            )
            assert invalid.status_code == 400
            report["invalid_csv_http"] = invalid.status_code
            result = client.post("/api/search", json={"query": "GMP"}).json()
            assert result["results"][0]["id"] == "SMOKE_TEST"
        finally:
            restored = client.post("/api/upload", files={"file": ("experts.csv", raw, "text/csv")})
            restored.raise_for_status()
            assert restored.json()["loaded"] == 150
            report["restored"] = restored.json()["loaded"]
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if args.output:
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
