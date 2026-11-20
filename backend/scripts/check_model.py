"""Проверяет семантику локальной модели и измеряет задержку CPU без сети."""

import json
import os
import time
from pathlib import Path

os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"


def main() -> None:
    """Сохраняет измерения загрузки, семантики и одного запроса."""
    import torch
    from sentence_transformers import SentenceTransformer

    torch.set_num_threads(4)
    root = Path(__file__).resolve().parents[1]
    started = time.perf_counter()
    model = SentenceTransformer(str(root / "models/bge-m3"), device="cpu", local_files_only=True)
    load_seconds = time.perf_counter() - started
    phrases = [
        "клинические исследования лекарств",
        "испытания медицинских препаратов",
        "проектирование мостов",
        "уроки музыки в школе",
    ]
    vectors = model.encode(phrases, normalize_embeddings=True)
    near = float(vectors[0] @ vectors[1])
    far = [float(vectors[0] @ vectors[i]) for i in (2, 3)]
    assert near > max(far), (near, far)
    timings = []
    for _ in range(5):
        started = time.perf_counter()
        model.encode(phrases[0], normalize_embeddings=True)
        timings.append((time.perf_counter() - started) * 1000)
    result = {
        "load_seconds": load_seconds,
        "near_cosine": near,
        "far_cosines": far,
        "query_ms": timings,
        "threads": 4,
        "device": "cpu",
        "offline": True,
    }
    (root / "data/model_check.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
