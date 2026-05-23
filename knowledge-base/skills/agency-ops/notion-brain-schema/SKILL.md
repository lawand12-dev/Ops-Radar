---
name: notion-brain-schema
description: The 20-database Notion Brain schema OpsRadar provisions for every customer — what each database is for, the write contract from each cron agent, the strategic pages owned by the customer, and the export/migration story. Use when the user asks "what's in my brain", "how does my brain work", "what should I put in Notion", "how do agents update my brain", or when you need to write a structured record (risk, action log entry, pattern card, KPI snapshot) into the brain.
---

# Notion Brain Schema — The OpsRadar Operating System for Agencies

The brain is the customer's permanent operating record. They own it forever. Agents write to it; the customer reads, edits, and exports freely. Even if OpsRadar disappears, the brain remains in the customer's Notion workspace with full history.

## The 20 databases

| # | Database | Owner | What lives here | Written by |
|---|---|---|---|---|
| 1 | Clients | Hybrid | Every active + past client, retainer terms, NPS, owner | revenue, profitability, renewal |
| 2 | KPIs (Weekly Snapshots) | Agents | Weekly row per KPI per agency | revenue (Mon 7am) |
| 3 | Projects | Hybrid | Active + closed projects, budget, status | delivery, scope |
| 4 | Team Members | Customer | Roster, role, capacity | (read-only for agents) |
| 5 | Hires & Departures | Customer | Hire/fire log | (read-only) |
| 6 | Pipeline (Deals) | Hybrid | Open + closed deals from CRM | growth |
| 7 | Invoices | Hybrid | All invoices, paid/overdue status | revenue, collections |
| 8 | Patterns (Cards) | Agents | Cross-client patterns the brain detects | all agents |
| 9 | Risks (Register) | Agents | Active risks per client + global | revenue, scope, delivery, profitability, renewal |
| 10 | Agent Action Log | Agents | Every action queued + approved/rejected/executed | all agents |
| 11 | P&L Monthly | Agents | Net margin per month from accounting | profitability (1st of month) |
| 12 | Marketing Funnel | Agents | Top-funnel metrics | growth |
| 13 | Communications | Agents | Important threads + sentiment scoring | (future) |
| 14 | Support Tickets | Hybrid | Active customer issues | (future) |
| 15 | Recruiting Pipeline | Customer | Candidates + stages | (read-only) |
| 16 | Tool Stack & Costs | Agents | Software stack + monthly spend + utilization | stack (1st of month) |
| 17 | Growth Experiments | Customer | A/B tests, channel tests | (read-only) |
| 18 | Decisions Log | Customer | Strategic decisions the customer has made | (read-only) |
| 19 | OKRs (Quarterly) | Customer | Quarterly goals | (read-only) |
| 20 | How We Work | Customer | Customer-authored rules ("never give discount > 15%") | (read-only) |

## The 7 strategic pages (customer-owned, customer-edited)

These are pages, not databases. They define the customer's identity and rules. Agents READ but never write.

- `__brain_home` — landing page; agents update widgets weekly
- `__company_overview` — who they are, what they sell, ICP
- `__okrs` — current-quarter OKRs
- `__playbooks` — sales / delivery / hiring / firing-a-client playbooks (5 sub-pages)
- `__decision_log` — strategic decisions, immutable
- `__how_we_work` — rules the agents defer to (the personalization moat)
- `__meeting_notes` — 3 templates: weekly leadership, client check-in, retro

Page slugs use `__` prefix to namespace them inside the shared `notion_workspaces.databases` jsonb column (the same column stores DB ids).

## Write contract — what each agent owes the brain

When an agent runs successfully, it MUST:

1. **Append a row to "Agent Action Log"** with: agent name, timestamp, summary, status (proposed / executed / skipped), entity_id, value_recovered (if applicable).
2. **Update domain-specific tables** per its responsibility:
   - revenue → KPIs (weekly snapshot row Mon), Clients (LTV updates), Risks (churn risk)
   - collections → Invoices (status), Risks (cash flow), Agent Action Log
   - profitability → Clients (margin %), P&L Monthly, Risks (negative margin)
   - scope/delivery → Projects, Risks (scope creep)
   - team → Team Members (utilization), Hires & Departures (recommendations)
   - growth → Pipeline, Marketing Funnel, Patterns
   - renewal → Clients (renewal risk), Risks
   - stack → Tool Stack & Costs, Risks (cost waste)
   - briefing → Brain Home (weekly summary widget)
3. **Never modify customer-owned pages or rows.** When the agent has a recommendation that touches a customer-owned page (e.g. updating OKRs), it queues an action for approval — it does not write directly.

## The moat: why this matters

- **Portable.** Customer can export the whole workspace from Notion's UI. They keep it on churn.
- **Editable.** Every row is markdown-editable. The customer can correct the agent's mistakes in their own UI.
- **Composable with Notion AI, MCP clients, Claude apps.** The brain is queryable by any tool the customer adds tomorrow — not just OpsRadar.
- **Operates without OpsRadar.** Even if the agents stop running, the brain is a real operating document the customer can read in their next leadership meeting.

## When you (the agent) should call this skill

- User asks "what's in my brain?" or "show me the structure"
- User asks "how do I edit X?" — answer maps to which database/page
- You need to write a structured record and need to know the right database
- User asks about the moat / data ownership / export
- User considers churning — remind them they keep the brain

## Reference

- Database IDs are stored in `notion_workspaces.databases` (Supabase) per user
- Page IDs use `__`-prefixed keys in the same jsonb column
- Provisioning lives in `src/lib/notion/create-brain.ts`
- Brain Home renderer is `src/lib/notion/brain-home.ts`
- Page templates are in `src/lib/notion/page-templates.ts`
