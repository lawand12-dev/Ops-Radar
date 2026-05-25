# Engineering research — Brain / memory layer (markdown-in-Postgres, embeddings, Mem0/Letta/Zep, Notion mirror)

> **Research run date**: 2026-05-26
> **Question**: Is OpsRadar's brain layer still aligned with 2026 consensus? 10 questions.
> **Status**: raw research output — informs the engineering verdict at `docs/adr/0009-engineering-stack-2026.md`.
> **Subagent run id**: `a0fa0899d86d6b66b` (preserved for audit).

---

I have enough material. Let me compile the response.

---

# OpsRadar Brain Layer vs 2026 Consensus

**1. Markdown-in-git/Postgres vs vector-first vs graph-first.** Consensus: markdown-as-substrate is the 2026 default for customer-owned brains — Karpathy's LLM Wiki (Apr 2026), YC Spring 2026 RFS #4 (Blomfield), Ramp Glass, and Anthropic Skills all converge on "plain text in git/folders, not a SaaS DB" ([Lockey synthesis](https://www.alexlockey.com/writing/the-company-brain-four-builders-one-architecture/), [Karpathy gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)). Glean's KG wins for 10k+ employee enterprises with ACLs ([Glean KG](https://www.glean.com/blog/knowledge-graph-vs-vector-database)) — irrelevant at OpsRadar's SMB tier. **Verdict: HOLDS.** Postgres-as-substrate is a defensible deviation since you get RLS + ACID for free; the markdown is preserved.

**2. "Embed only curated paths" trigger.** Karpathy's wiki runs ~100 docs / 400k words with zero embeddings ([Gamgee](https://gamgee.ai/blogs/karpathy-llm-wiki-memory-pattern/), [Hjarni](https://hjarni.com/blog/karpathys-llm-wiki-is-right)). Critics flag breakage "at a few hundred pages" without indexes ([innobu](https://www.innobu.com/en/articles/karpathy-llm-wiki-second-brain-enterprise-reality.html)). **Verdict: HOLDS to ~300 docs/customer.** Above that, expand embedding coverage to `briefings/` and `agents/<slug>/findings/` — the two highest-cardinality buckets — before reconsidering full-corpus embedding.

**3. Mem0/Letta/Zep/LangMem maturity.** Zep leads LongMemEval at 63.8% via temporal KG, Mem0 49.0%, Letta strongest at long-running sessions ([AgentMarketCap](https://agentmarketcap.ai/blog/2026/04/10/agent-memory-vendor-landscape-2026-letta-zep-mem0-langmem), [Atlan](https://atlan.com/know/mem0-alternatives/)). All three are session/conversation memory layers — orthogonal to a customer-owned knowledge brain. Swapping in any of them would surrender ownership + Notion mirror + export. **Verdict: HOLDS.** Don't swap. Consider Zep as a *complement* for COO conversation memory only if multi-month chat continuity becomes a feature.

**4. pgvector vs Pinecone vs Qdrant vs Turso.** At ~100–1000 docs/customer, pgvector wins on cost, simplicity, and JOIN-with-RLS ([daily.dev 2026](https://app.daily.dev/posts/pgvector-vs-pinecone-vs-turbopuffer-vs-qdrant-2026--m1dot7ras), [Firecrawl](https://www.firecrawl.dev/blog/best-vector-databases)). Pinecone only wins above ~10M vectors or for managed-only teams. **Verdict: HOLDS, clearly.**

**5. HNSW vs IVFFlat on partial index.** HNSW is the 2026 default under 1M rows; IVFFlat's k-means clustering breaks on partial/empty tables and "never belongs in migrations" ([Medium / McClarence](https://medium.com/@philmcc/pgvector-index-selection-ivfflat-vs-hnsw-for-postgresql-vector-search-6eff26aaa90c), [dbi-services Mar 2026](https://www.dbi-services.com/blog/pgvector-a-guide-for-dba-part-2-indexes-update-march-2026/)). Partial index on curated paths is fine — HNSW builds incrementally. **Verdict: HOLDS.**

**6. Embedding model.** Voyage-3-large and Cohere embed-v4 lead MTEB retrieval (65.2 vs OpenAI 3-large 64.6); `text-embedding-3-small` lags by a few points but is 6× cheaper and the "safe default" ([Awesome Agents Mar 2026](https://awesomeagents.ai/leaderboards/embedding-model-leaderboard-mteb-march-2026/), [PE Collective](https://pecollective.com/tools/text-embedding-models-compared/)). Re-embedding is sticky. **Verdict: HOLDS for now.** If retrieval quality becomes a customer complaint, migrate to `voyage-3-large` (200M free tokens/account makes the cutover cheap).

**7. Git-style versioning on agent KBs.** Real and emerging — `Lore` (arXiv 2603.15566) repurposes git commits as structured AI decision records; `Memoir` adds git-like branching for semantic memory; GitAgent makes the repo itself the source of truth ([Freestyle](https://www.freestyle.sh/blog/engineering/version-control-for-ai-agents), [Lyzr](https://www.lyzr.ai/blog/gitagent/)). OpsRadar's commit-graph + `author_type` + `agent_run_id` matches the published spec. **Verdict: HOLDS — real moat, not ceremony.**

**8. Notion mirror pattern.** 2026 split: GitHub+Obsidian for technical teams ([Bill Mongan May 2026](https://www.billmongan.com/posts/2026/05/obsidian-ai-vault/)), Notion for non-technical collaboration ([Lovable](https://lovable.dev/guides/obsidian-vs-notion-app-builders)). Agencies = non-technical → Notion is correct. **Verdict: HOLDS.** Add an optional GitHub-mirror toggle for technical FO customers later.

**9. Brain compaction at 500+ docs.** 2026 consensus is hierarchical summary DAG + anchored iterative summarization (Factory: 36k-message eval, higher accuracy than full reconstruction; ACON: 26–54% memory reduction at 95%+ accuracy) plus Anthropic's `compact-2026-01-12` API ([Medium / Myung](https://medium.com/@revoir07/long-context-compaction-for-ai-agents-part-1-design-principles-2bf4a5748154), [Zylos](https://zylos.ai/research/2026-02-28-ai-agent-context-compression-strategies)). OpsRadar relies on Skills progressive disclosure for routing but has no compaction layer yet. **Verdict: DRIFTS at scale.** Add a `brain-index.md` hierarchical summary regenerated nightly by a `brain-compactor` agent.

**10. Citation/provenance.** PROV-AGENT (IEEE e-Science 2025, arXiv 2508.02866) extends W3C PROV via MCP to model `AIAgent` as a PROV Agent subclass with tools/prompts/responses tracked ([arxiv](https://arxiv.org/html/2508.02866v2)). OpsRadar's `author_type + agent_run_id` is the lightweight equivalent and sufficient for SMB; W3C PROV is overkill outside regulated/scientific workflows. **Verdict: HOLDS.** Optionally export PROV-N from `brain_commits` if a compliance-heavy customer asks.

---

**OpsRadar's brain layer is ~90% aligned with 2026 consensus.**

**Top 3 changes ranked by impact:**
1. **Build a brain-compactor agent** that maintains a hierarchical `brain-index.md` (Anthropic compact-API style). Without it, the architecture silently degrades past ~300–500 docs/customer — the single biggest scaling risk identified.
2. **Expand embedding coverage to `briefings/` and `agents/<slug>/findings/`** the moment median customer crosses 200 docs. Cheap, reversible, addresses the highest-cardinality blind spots before they hurt retrieval.
3. **Plan a Voyage-3-large embedding migration path** (dual-write column, background backfill). Don't switch yet — switch the day a customer cites a missed retrieval, and have the migration pre-staged.

Everything else (3-table schema, HNSW partial index, `text-embedding-3-small`, Notion mirror, commit graph, lightweight provenance, no third-party memory infra) matches 2026 consensus and should not be touched.

Sources:
- [Karpathy LLM Wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
- [Lockey — Company Brain synthesis](https://www.alexlockey.com/writing/the-company-brain-four-builders-one-architecture/)
- [Gamgee — Beyond RAG](https://gamgee.ai/blogs/karpathy-llm-wiki-memory-pattern/)
- [innobu — Enterprise reality check](https://www.innobu.com/en/articles/karpathy-llm-wiki-second-brain-enterprise-reality.html)
- [AgentMarketCap — Letta/Zep/Mem0/LangMem 2026](https://agentmarketcap.ai/blog/2026/04/10/agent-memory-vendor-landscape-2026-letta-zep-mem0-langmem)
- [Atlan — Mem0 alternatives 2026](https://atlan.com/know/mem0-alternatives/)
- [pgvector index selection 2026 (McClarence)](https://medium.com/@philmcc/pgvector-index-selection-ivfflat-vs-hnsw-for-postgresql-vector-search-6eff26aaa90c)
- [dbi-services pgvector guide Mar 2026](https://www.dbi-services.com/blog/pgvector-a-guide-for-dba-part-2-indexes-update-march-2026/)
- [Awesome Agents — MTEB Mar 2026 leaderboard](https://awesomeagents.ai/leaderboards/embedding-model-leaderboard-mteb-march-2026/)
- [PE Collective — text embeddings compared 2026](https://pecollective.com/tools/text-embedding-models-compared/)
- [daily.dev — pgvector vs Pinecone vs Qdrant 2026](https://app.daily.dev/posts/pgvector-vs-pinecone-vs-turbopuffer-vs-qdrant-2026--m1dot7ras)
- [Firecrawl — Best Vector DBs 2026](https://www.firecrawl.dev/blog/best-vector-databases)
- [Freestyle — Version Control for AI Agents](https://www.freestyle.sh/blog/engineering/version-control-for-ai-agents)
- [Lyzr GitAgent — OpenGap](https://www.lyzr.ai/blog/gitagent/)
- [Bill Mongan — Obsidian + GitHub AI vault May 2026](https://www.billmongan.com/posts/2026/05/obsidian-ai-vault/)
- [Lovable — Obsidian vs Notion for app builders](https://lovable.dev/guides/obsidian-vs-notion-app-builders)
- [Long Context Compaction (Myung)](https://medium.com/@revoir07/long-context-compaction-for-ai-agents-part-1-design-principles-2bf4a5748154)
- [Zylos — Context Compression 2026](https://zylos.ai/research/2026-02-28-ai-agent-context-compression-strategies)
- [PROV-AGENT (arXiv 2508.02866v2)](https://arxiv.org/html/2508.02866v2)
- [Anthropic — Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [Glean — KG vs Vector DB](https://www.glean.com/blog/knowledge-graph-vs-vector-database)
