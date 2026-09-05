# Product Marketing Context

*Last updated: 2026-08-23*
*Status: open-source transition. The repository remains private until the release gate in `docs/OPEN_SOURCE.md` is complete.*

## Product Overview

**One-liner:** OpsRadar is an open-source operations intelligence tool that helps client-service businesses find cash, capacity, and margin risk before month-end.

**What it does:** OpsRadar evaluates project, time, and invoice data with transparent, evidence-backed rules. It identifies overdue receivables, unbilled work, budget burn, and low estimated delivery margin. AI is optional: it can explain evidence or draft a next step, but it must never be the only basis for a risk.

**Product category:** Self-hostable operations intelligence / professional-services health monitor.

**Product type:** Apache-2.0 open-source application and reusable TypeScript rule core.

**Business model:** No hosted pricing claim. Future hosted support or managed deployment must be designed separately from the open core.

## Target Audience

**Target companies:** Client-service businesses with projects, billable time, and invoices: agencies, consultancies, development studios, recruiting firms, accounting practices, and fractional operators.

**Decision-makers:** Owners, operations leaders, finance leads, delivery leads, and fractional COOs.

**Primary use case:** Find operational leakage early enough to act: overdue cash, unbilled effort, exhausted delivery budgets, and threatened delivery margin.

**Jobs to be done:**

- See which client engagements need attention without manually reconciling several exports.
- Verify every operational warning from its input evidence and rule threshold.
- Run useful operations analysis without surrendering business data to an opaque AI product.

**Use cases:**

- Weekly client and project health checks.
- Pre-invoice review for unbilled work.
- Delivery-budget and margin-review meetings.
- Fractional-operator diagnostics across client workspaces.

## Personas

| Persona | Cares about | Challenge | Value we promise |
|---|---|---|---|
| Owner / managing partner | Cash, margin, fewer surprises | Sees risks after the work is already done | A short, explainable risk list grounded in their data |
| Operations / delivery lead | Budget burn, scope, team capacity | Reconciles project and time data manually | Clear evidence for where delivery needs intervention |
| Finance lead | Collection timing and billable effort | Invoice context is disconnected from delivery data | Read-only receivables and unbilled-work signals |
| Fractional operator | Repeatable leverage and trustworthy recommendations | Builds a bespoke spreadsheet for every client | A portable rule engine they can inspect and adapt |

## Problems & Pain Points

**Core problem:** Client-service businesses keep time, project, and invoice truth in separate tools. Problems surface late because somebody must manually connect the data first.

**Why alternatives fall short:** Generic dashboards show numbers without an opinion; AI chat tools can create plausible text without proving a conclusion; opaque automation makes operators reluctant to trust a recommendation.

**What it costs them:** Write-offs, delayed collection, delivery overruns, preventable margin erosion, and expensive manual reporting.

**Emotional tension:** The operator knows something is slipping but cannot defend a conclusion quickly enough to act.

## Competitive Landscape

**Direct:** Spreadsheets, PSA reporting, and business-intelligence dashboards — useful records, but usually not transparent operational decision rules.

**Secondary:** Fractional COOs and consultants — valuable judgment but difficult to repeat consistently across many accounts.

**Indirect:** General-purpose AI assistants — helpful for explanation, but not a substitute for correct data relationships and explicit policies.

## Differentiation

**Key differentiators:**

- A dependency-free, portable rule core.
- Evidence and thresholds shown for every risk.
- Read-only by default; no autonomous financial or customer-facing actions.
- Optional AI explanation rather than AI-only decision making.
- Rule packs can adapt to agency, consulting, recruiting, and accounting workflows without weakening the shared core.

**How we do it differently:** Define a small canonical model — clients, projects, time entries, and invoices — then evaluate explicit rules against it.

**Why that is better:** Users can audit the conclusion, change a policy intentionally, and retain control of their data and process.

**Why users choose us:** They want a practical self-hosted starting point, not another opaque agent platform.

## Objections

| Objection | Response |
|---|---|
| "Our data is messy." | The core reports skipped records instead of pretending malformed or unmatched data is trustworthy. |
| "Our margin target is different." | Policies are explicit and configurable; 35% is only a documented default. |
| "Can it send follow-ups automatically?" | Not in the open core. It identifies risk first; write actions need separate, approval-gated design. |
| "We are not an agency." | If your business delivers client work through projects, time, and invoices, the model likely fits. Otherwise it should use a separate extension. |

**Anti-persona:** Inventory-led, ecommerce, restaurant, product-led SaaS, and other businesses whose operational truth is not primarily clients, projects, time, and invoices.

## Switching Dynamics

**Push:** Late surprises, spreadsheet consolidation, uncollectible invoices, and work discovered after it can no longer be billed.

**Pull:** A self-hosted, inspectable risk monitor that produces useful results before a complex integration rollout.

**Habit:** Manual weekly reporting and intuition-based delivery management.

**Anxiety:** Data privacy, incorrect AI claims, opaque calculations, and another tool that needs continual maintenance.

## Customer Language

**How they describe the problem:**

- "We are busy, but I cannot tell whether the work is profitable."
- "The work is in one tool and the money is in another."
- "I find the problem when I am already writing off the hours."
- "Show me how you reached that conclusion."

**How they should describe OpsRadar:**

- "An operations health monitor for our client work."
- "It shows the evidence behind the warning."
- "It catches the leak before month-end."

**Words to use:** operations intelligence, client-service business, evidence-backed, transparent rules, self-hosted, read-only, margin, budget burn, receivables, unbilled work.

**Words to avoid:** AI COO, AI workforce, autonomous employee, magic, all businesses, replaces your team, guaranteed savings.

## Brand Voice

**Tone:** Direct, skeptical, practical, high-trust.

**Style:** Explain the data and the threshold. Avoid abstract AI claims and unsupported benchmarks.

**Personality:** Operator-grade, inspectable, disciplined, helpful.

## Proof Points

**Metrics:** Do not publish made-up savings, benchmarks, customer logos, or adoption numbers.

**Customers:** None claimed publicly until users explicitly consent.

**Value themes:**

| Theme | Proof |
|---|---|
| Transparent decisions | Every risk carries evidence and a named rule |
| Data control | Open core has no runtime network access |
| Safe scope | Read-only default; automation is deferred |
| Reuse | Shared core plus vertical rule packs |

## Goals

**Business goal:** Become a genuinely useful open-source project and a credible portfolio artifact, not an abandoned SaaS code dump.

**Conversion action:** Clone it, run a sample report, improve a rule or importer, or self-host it with the team’s own data.

**Current metrics:** Track setup success, completed sample reports, external contributors, merged rule/importer contributions, and documented user feedback before making broader impact claims.
