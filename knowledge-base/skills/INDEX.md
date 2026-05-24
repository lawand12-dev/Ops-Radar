# OpsRadar Skills — Anthropic Agent Skills Catalog

> **Status:** v1 — 9 seed skills written by hand to validate the loader + tool wiring + progressive disclosure pattern. The remaining ~35 skills come from CP-17b (LLM-batch reconvert of the 169 remaining KB files).

This folder follows the [Anthropic Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) canonical pattern:

- One folder per skill: `<domain>/<skill-name>/SKILL.md`
- Frontmatter: `name` (required, kebab-case) + `description` (required, ≤1024 chars, includes trigger terms)
- Body ≤ 500 lines (hard guideline from Anthropic)
- Optional `reference/*.md` siblings — agent reads them only when SKILL.md tells it to

## How the agents use these

1. **Boot (Tier 1)** — at every agent run start, the loader (`src/lib/skills.ts`) walks this folder and reads only the frontmatter. The catalog (`name + description` per skill) gets injected into the system prompt.
2. **Trigger (Tier 2)** — when the agent decides a skill applies, it calls the `load_skill` tool with the name. The full SKILL.md body returns to the agent's context.
3. **On-demand (Tier 3)** — the agent can use the standard `Read` tool to fetch `reference/*.md` siblings if SKILL.md instructs it.

## Seed skills (v1)

| Domain | Skill | Purpose |
|---|---|---|
| `agency-ops` | `notion-brain-schema` | The 20-database brain spec — the moat |
| `integrations` | `using-notion` | Which of the 48 Notion tools to call, in what order, for Brain reads/writes |
| `revenue` | `projecting-cash-runway` | The #1 founder anxiety |
| `revenue` | `chasing-overdue-invoices` | 4-touch collections cadence |
| `profitability` | `calculating-effective-hourly-rate` | The single most-actionable profit number |
| `profitability` | `flagging-margin-erosion` | Margin trigger + driver-naming |
| `delivery` | `detecting-scope-creep` | 1st-ask / 2nd-ask / 3rd-invoice rule |
| `client-comms` | `raising-retainer-prices` | The price-raise script + 60-day lead time |
| `client-comms` | `firing-a-client` | The 4-criteria fire decision + script |
| `coo-briefings` | `calculating-hiring-triggers` | Revenue-per-headcount thresholds |
| `coo-briefings` | `composing-weekly-briefing` | The Monday briefing template |

## Authoring guidelines

Every SKILL.md should:

1. **Decide, don't describe.** Wikis describe. Skills decide. Encode the judgment a senior fractional COO would charge $400/hr for — not "what is HubSpot."
2. **Open with the customer-anxious question** the skill answers (e.g. "will I make payroll?", "is this client worth keeping?").
3. **Always name specific numbers / thresholds.** Vague advice is worthless. Cite the source.
4. **Include the conversation script** when the skill ends in a client-facing or team-facing action.
5. **Include the agent's tracking responsibility** — what to log to Notion, what to update.
6. **End with `What NOT to do`** — the second-most-valuable section after the script.
7. **Cross-reference siblings.** Skills compose — link to related skills with `\`skill-name\``.

## What's archived (in `../` `_archive/`)

- `_archive/n8n-build-time/n8n-reference/` — 99 files of n8n node API references
- `_archive/n8n-build-time/n8n-playbooks/` — 50 n8n workflow build/fix playbooks
- These are preserved in git but bundle-excluded — see `next.config.ts` `outputFileTracingIncludes`

## What's still in legacy folders (pending CP-17b reframe)

- `../tools/` — 50 files of API docs (some duplicate, need reframe)
- `../patterns/` — 50 files of operational patterns (high-value, needs consolidation)
- `../integrations/` — 10 files of agency-specific tool deep dives
- `../playbooks/` — 7 files of scripts and frameworks
- `../benchmarks/` — 11 files of agency benchmarks
- `../failures/` — 18 files of failure modes
- `../agency-profiles/` — 20 files of agency-type playbooks

The loader (`src/lib/skills.ts`) ONLY reads `knowledge-base/skills/`. The legacy folders are dormant until they're converted.
