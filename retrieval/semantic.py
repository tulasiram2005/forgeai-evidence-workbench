"""Offline dense retrieval over a bounded ForgeAI definition; JSON on stdin/stdout."""
import json
import os
import sys

os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

MODEL = "sentence-transformers/all-MiniLM-L6-v2"
REVISION = "c9745ed1d9f207416be6d2e6f8de32d1f16199bf"


def main():
    import torch
    from sentence_transformers import SentenceTransformer
    payload = json.load(sys.stdin)
    passages, queries = payload["passages"], payload["queries"]
    if not 0 < len(passages) <= 1500 or not 0 < len(queries) <= 256:
        raise ValueError("Expected 1–1500 passages and 1–256 queries.")
    torch.set_num_threads(min(4, os.cpu_count() or 1))
    encoder = SentenceTransformer(MODEL, revision=REVISION, local_files_only=True, device="cpu")
    vectors = encoder.encode(passages + queries, normalize_embeddings=True, show_progress_bar=False)
    scores = vectors[len(passages):] @ vectors[:len(passages)].T
    print(json.dumps({"model": MODEL, "revision": REVISION, "dimensions": vectors.shape[1],
                      "scores": scores.round(6).tolist()}))


if __name__ == "__main__":
    main()
