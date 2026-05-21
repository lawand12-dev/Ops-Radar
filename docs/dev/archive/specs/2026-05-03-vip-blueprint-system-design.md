---
name: VIP Blueprint System
description: Three additive routes that wrap the existing deep-audit pipeline with a client pre-call form, session manager, and PDF blueprint generator.
type: project
date: 2026-05-03
status: approved
---

# VIP Blueprint System — Design Spec

## Context

OpsRadar already has `/admin/deep-audit` — a 7-section (A–G) consultant discovery form backed by the `deep_audit_briefs` table. This spec adds three purely additive layers on top of it. No existing files are modified.

---

## Guiding Constraint

**Zero existing files modified. No new tables. No migration files.**  
All changes are net-new routes, API handlers, and library files.  
One `ALTER TABLE` is run via Supabase MCP to add `pdf_url text` to `deep_audit_briefs`.

---

## Architecture

### New Routes

| Route | Auth | Purpose |
|-------|------|---------|
| `/vip/[token]` | Public | Client pre-call form (Sections A + B only) |
| `/vip/[token]/confirmation` | Public | Thank-you page after client submits |
| `/admin/vip-sessions` | Admin cookie | Session index: list + create sessions |
| `/admin/vip-sessions/[id]` | Admin cookie | Session hub: client answers + nav buttons |
| `/admin/vip-sessions/[id]/generate` | Admin cookie | Generate + download PDF blueprint |

### New API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/vip/[token]` | `POST` | Save client A+B prefill (partial JSONB merge) |
| `/api/vip-sessions` | `POST` | Create new session (inserts `deep_audit_briefs` row) |
| `/api/vip-sessions/[id]/generate` | `POST` | Run full PDF pipeline |

### New Library Files

| File | Purpose |
|------|---------|
| `src/lib/vip-blueprint-prompt.ts` | Claude structured-output prompt + response types |
| `src/lib/vip-html-renderer.ts` | Converts Claude JSON → styled HTML string for PDFShift |
| `src/lib/pdfshift.ts` | PDFShift API client (POST HTML → PDF binary) |

---

## Data Model

### Table: `deep_audit_briefs` (existing, one column added)

Existing columns used:
- `id uuid` — serves as the client-facing token (`/vip/<id>`)
- `agency_name text`
- `status text` — extended to support `client_prefill` and `blueprint_ready`
- `layer1_answers jsonb` — client fills A+B fields here; consultant fills rest in deep-audit
- `layer1_consultant_fields jsonb` — consultant-only notes

New column (added via Supabase MCP):
- `pdf_url text` — Supabase Storage public URL, set after PDF generation

### Status lifecycle

```
draft_layer1     → created by admin, client link not yet sent or client hasn't submitted
client_prefill   → client submitted A+B answers
blueprint_ready  → PDF generated and stored
```

### Supabase Storage

- Bucket: `vip-blueprints` (to be created)
- Path: `{session_id}/blueprint.pdf`
- Access: public read (URL returned as download link)

---

## Component 1: `/vip/[token]` — Client Pre-Call Form

### Behaviour
- Loads `deep_audit_briefs` row by `id = token`
- Returns 404 if not found
- Shows only **Section A** (Business Snapshot) and **Section B** (Team & Capacity) fields, exactly matching the field names already in `layer1_answers`
- Auto-saves on debounced 800ms input via `POST /api/vip/[token]`
- Final submit sets `status = 'client_prefill'` and redirects to `/vip/[token]/confirmation`

### Section A fields shown to client
`a1_agency_vertical`, `a1_what_company_does`, `a2_pricing_model`, `a2_main_result_promised`, `a3_first_result_days`, `a3_intro_to_first_result`, `a4_one_thing_to_protect`

### Section B fields shown to client
`b1_team_size`, `b1_contractor_mix`, `b1_key_people`, `b2_heaviest_load_role`, `b2_typical_day`, `b3_stuck_locations`, `b3_handoff_breaks`, `b4_spof_severity`, `b4_single_person_knowledge`

### Design
- Dark background `#0A0A0A`, white text, blue `#3B82F6` accents
- OpsRadar logo at top
- Same RadioCardGroup / ChipGroup / LongText visual language as `/admin/deep-audit`
- "Saving…" / "Saved" toast indicator
- Submit button: "Submit My Answers"

---

## Component 2: `/admin/vip-sessions` — Session Index

### Behaviour
- Protected: redirects to `/admin/login` if no valid admin session cookie
- **Create session:** "New Session" button → modal prompts for agency name → `POST /api/vip-sessions` → shows copy-link dialog with `/vip/<id>` URL
- **Session table** columns: Agency Name | Status badge | Created date | Client Submitted | PDF Ready | Actions ("View")
- Status badges: `draft` (grey) / `client_prefill` (blue) / `blueprint_ready` (green)
- "View" links to `/admin/vip-sessions/[id]`

---

## Component 3: `/admin/vip-sessions/[id]` — Session Hub

Three things only:

1. **Client's A+B answers** — read-only card blocks. If `status = 'draft_layer1'`, shows "Client hasn't submitted yet" placeholder. Uses same field label text as the form.
2. **"Open in Deep-Audit"** button → `/admin/deep-audit?id=[id]` (existing form, unmodified)
3. **"Generate Blueprint PDF"** button → `/admin/vip-sessions/[id]/generate`

---

## Component 4: `/admin/vip-sessions/[id]/generate` — PDF Pipeline

### Generate Page UI
- Shows agency name + session status summary
- "Generate Blueprint" button
- Progress states: idle → `Generating analysis...` → `Rendering PDF...` → `Uploading...` → done
- On completion: download button + copy URL button

### Generate API Route Pipeline (`POST /api/vip-sessions/[id]/generate`)

```
1. Fetch deep_audit_briefs row (layer1_answers + layer1_consultant_fields)
2. Fetch top 40 knowledge_base rows (SELECT content FROM knowledge_base LIMIT 40)
3. Call claude-opus-4-6 with structured-output prompt → typed BlueprintJSON
4. Convert BlueprintJSON → styled HTML string (vip-html-renderer.ts)
5. POST HTML to PDFShift API → PDF binary buffer
6. Upload buffer to Supabase Storage: vip-blueprints/{id}/blueprint.pdf
7. UPDATE deep_audit_briefs SET pdf_url = <url>, status = 'blueprint_ready'
8. Return { pdf_url }
```

API timeout: `export const maxDuration = 60` (Vercel Pro) or `300` (fluid compute).

### PDFShift API
- `POST https://api.pdfshift.io/v3/convert/pdf`
- Auth: `Basic base64(api:PDFSHIFT_API_KEY)`
- Body: `{ source: htmlString, landscape: false, format: "A4" }`
- Response: PDF binary (`application/pdf`)

### Environment variable
- `PDFSHIFT_API_KEY` — set in `.env.local` and Vercel environment variables

---

## PDF Structure (12 Sections)

All pages: `#0A0A0A` background, white body text, `#3B82F6` electric blue accents, OpsRadar logo in header, agency name + page number in footer.

| # | Section | Key content |
|---|---------|-------------|
| 1 | Cover | Logo, agency name, date, "VIP Automation Blueprint", "Confidential" |
| 2 | Executive Summary | 3–4 sentences, annual waste number large + prominent, top 3 opportunities |
| 3 | Agency Profile + Team Map | Company details, every team member, role, daily work |
| 4 | Tool Stack Map | Every tool, data it holds, connections, manual bridges |
| 5 | Manual Work Analysis | Top 5 tasks, hrs/week, annual cost, total annual waste |
| 6 | Workflow Map 1 | Step-by-step, tool at each step, owner, where it breaks |
| 7 | Workflow Map 2 | Same structure |
| 8 | Workflow Map 3 | Same structure |
| 9 | Failure Mode Analysis | What breaks, frequency, business impact, prevention |
| 10 | Approval Rules | Needs human review, who approves, never-automate list |
| 11 | Priority Build Roadmap | Ranked list, rationale, build time, ROI per workflow |
| 12 | Next Steps | Investment, what's built first, timeline, how to proceed |

### Claude Prompt Contract

Input: all `layer1_answers` fields + `layer1_consultant_fields` + top 40 knowledge_base rows  
Output: structured JSON object typed as `BlueprintData` with one key per PDF section  
Model: `claude-opus-4-6`  
System prompt: "You are an expert agency automation consultant producing a premium VIP Automation Blueprint..."  
Max tokens: 8000

---

## Admin Auth Pattern

All `/admin/vip-sessions*` routes use the existing cookie pattern:
- Client-side: check `/api/admin-auth` on mount, redirect to `/admin/login` if not authenticated
- Matches pattern used by existing `/admin/page.tsx`

---

## File List (all new)

```
src/app/vip/[token]/page.tsx
src/app/vip/[token]/confirmation/page.tsx
src/app/admin/vip-sessions/page.tsx
src/app/admin/vip-sessions/[id]/page.tsx
src/app/admin/vip-sessions/[id]/generate/page.tsx
src/app/api/vip/[token]/route.ts
src/app/api/vip-sessions/route.ts
src/app/api/vip-sessions/[id]/generate/route.ts
src/lib/vip-blueprint-prompt.ts
src/lib/vip-html-renderer.ts
src/lib/pdfshift.ts
```

Plus:
- `npm install` — no new packages needed (PDFShift is HTTP, Anthropic SDK already installed)
- Supabase MCP: `ALTER TABLE deep_audit_briefs ADD COLUMN IF NOT EXISTS pdf_url text;`
- Supabase MCP: create storage bucket `vip-blueprints` (public read)
- `.env.local`: add `PDFSHIFT_API_KEY=` placeholder
