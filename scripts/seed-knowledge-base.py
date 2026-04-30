#!/usr/bin/env python3
"""
Seed the Supabase knowledge_base table from markdown files.
Uses only Python built-ins — no pip packages required.

Usage:
  OPENAI_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python3 scripts/seed-knowledge-base.py
"""

import json
import os
import re
import sys
import glob
import urllib.request
import urllib.error
import time

KB_DIR = os.path.join(os.getcwd(), "knowledge-base")
CATEGORIES = ["benchmarks", "tools", "patterns", "failures", "agency-profiles"]
EMBEDDING_MODEL = "text-embedding-3-small"
MAX_CHUNK_CHARS = 4000
CHUNK_OVERLAP_CHARS = 200


def chunk_text(text, max_chars, overlap):
    if len(text) <= max_chars:
        return [text]
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + max_chars, len(text))
        chunks.append(text[start:end])
        start = end - overlap
        if start >= len(text):
            break
    return chunks


def slug_from_filename(filename):
    return filename.replace(".md", "").lower()


def extract_links(content):
    matches = re.findall(r"\[\[([^\]]+)\]\]", content)
    return list(set(matches))


def get_embedding(text, api_key):
    payload = json.dumps({
        "model": EMBEDDING_MODEL,
        "input": text[:8000],
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.openai.com/v1/embeddings",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read())
    return data["data"][0]["embedding"]


def upsert_row(supabase_url, service_key, row):
    table_url = f"{supabase_url}/rest/v1/knowledge_base"
    payload = json.dumps(row).encode("utf-8")
    req = urllib.request.Request(
        table_url,
        data=payload,
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
        method="POST",
    )
    # Add on-conflict param
    req.full_url = table_url + "?on_conflict=slug"
    with urllib.request.urlopen(req, timeout=30) as resp:
        resp.read()  # consume


def main():
    openai_key = os.environ.get("OPENAI_API_KEY", "")
    supabase_url = os.environ.get("SUPABASE_URL", "")
    service_key = os.environ.get("SUPABASE_SERVICE_KEY", "")

    if not openai_key:
        print("Error: OPENAI_API_KEY env var required", file=sys.stderr)
        sys.exit(1)
    if not supabase_url or not service_key:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY env vars required", file=sys.stderr)
        sys.exit(1)

    total_upserted = 0

    for category in CATEGORIES:
        cat_dir = os.path.join(KB_DIR, category)
        if not os.path.isdir(cat_dir):
            print(f"Warning: category dir not found: {cat_dir}")
            continue

        md_files = sorted(f for f in os.listdir(cat_dir) if f.endswith(".md"))
        print(f"\n[{category}] {len(md_files)} files")

        for filename in md_files:
            file_path = os.path.join(cat_dir, filename)
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            slug_base = slug_from_filename(filename)
            links = extract_links(content)

            research_id_match = re.match(r"^(research-\d+)", slug_base)
            source_file = filename  # the .md file itself

            chunks = chunk_text(content, MAX_CHUNK_CHARS, CHUNK_OVERLAP_CHARS)

            for chunk_idx, chunk in enumerate(chunks):
                chunk_slug = slug_base if len(chunks) == 1 else f"{slug_base}--chunk-{chunk_idx + 1}"
                sys.stdout.write(f"  Embedding {chunk_slug}...")
                sys.stdout.flush()

                try:
                    embedding = get_embedding(chunk, openai_key)
                except urllib.error.URLError as e:
                    print(f"\n  ✗ Embedding failed: {e}")
                    continue

                if len(embedding) != 1536:
                    print(f"\n  ✗ Bad embedding dimension: {len(embedding)}")
                    continue

                row = {
                    "slug": chunk_slug,
                    "source_file": source_file,
                    "category": category,
                    "content": chunk,
                    "links": links,
                    "embedding": embedding,
                    "metadata": json.dumps({
                        "file": filename,
                        "chunk_index": chunk_idx,
                        "total_chunks": len(chunks),
                    }),
                    "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                }

                try:
                    upsert_row(supabase_url, service_key, row)
                except urllib.error.URLError as e:
                    print(f"\n  ✗ Supabase upsert failed: {e}")
                    continue

                print(" ✓")
                total_upserted += 1

    print(f"\nSeeded {total_upserted} chunks into knowledge_base.")


if __name__ == "__main__":
    main()
