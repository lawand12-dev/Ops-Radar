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


def title_from_markdown(content, fallback):
    match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
    return match.group(1).strip() if match else fallback.replace(".md", "")


def markdown_sections(content):
    lines = content.replace("\r\n", "\n").split("\n")
    sections = []
    heading_stack = []
    current_lines = []
    current_path = []

    def flush():
        body = "\n".join(current_lines).strip()
        if body:
            sections.append({
                "heading_path": list(current_path),
                "content": body,
            })

    for line in lines:
        heading = re.match(r"^(#{1,4})\s+(.+?)\s*$", line)
        if heading:
            flush()
            level = len(heading.group(1))
            text = heading.group(2).strip()
            while heading_stack and heading_stack[-1]["level"] >= level:
                heading_stack.pop()
            heading_stack.append({"level": level, "text": text})
            current_path = [item["text"] for item in heading_stack]
            current_lines = [line]
            continue

        current_lines.append(line)

    flush()
    return sections or [{"heading_path": [], "content": content}]


def chunk_markdown(content, category, filename, max_chars, overlap):
    title = title_from_markdown(content, filename)
    chunks = []

    for section in markdown_sections(content):
        heading_path = section["heading_path"] or [title]
        prefix = "\n".join([
            f"Title: {title}",
            f"Category: {category}",
            f"Source file: {filename}",
            f"Heading path: {' > '.join(heading_path)}",
        ])
        body_limit = max(1000, max_chars - len(prefix) - 2)

        for part in chunk_text(section["content"], body_limit, overlap):
            chunks.append({
                "content": f"{prefix}\n\n{part}",
                "heading_path": heading_path,
            })

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
            title = title_from_markdown(content, filename)

            source_file = filename  # the .md file itself

            chunks = chunk_markdown(content, category, filename, MAX_CHUNK_CHARS, CHUNK_OVERLAP_CHARS)

            for chunk_idx, chunk in enumerate(chunks):
                chunk_slug = slug_base if len(chunks) == 1 else f"{slug_base}--chunk-{chunk_idx + 1}"
                sys.stdout.write(f"  Embedding {chunk_slug}...")
                sys.stdout.flush()

                try:
                    embedding = get_embedding(chunk["content"], openai_key)
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
                    "content": chunk["content"],
                    "links": links,
                    "embedding": embedding,
                    "metadata": {
                        "file": filename,
                        "title": title,
                        "category": category,
                        "heading_path": chunk["heading_path"],
                        "chunk_index": chunk_idx,
                        "total_chunks": len(chunks),
                        "chunk_strategy": "markdown-heading-v2",
                        "embedding_model": EMBEDDING_MODEL,
                    },
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
