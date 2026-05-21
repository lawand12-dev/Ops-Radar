# /for/[vertical] — Template + Non-Paid-Media/SEO Vertical Pages

*Author: Claude (Opus 4.7) · Date: 2026-05-18*
*Inputs: `path-a-strategy-2026.md` §11.1 (Decision 0 + Decision 1), `icp-customer-research.md` (Tier-1 ICP, disqualifier list), `design-audit-live-site.md` (live /for/paid-media + /for/seo audit), `.agents/product-marketing.md` (voice rules, anti-persona).*

---

## Strategic Decision: What to do with the 4 non-ICP vertical pages

**Decision: A hybrid — KEEP `/for/full-service` and `/for/ecommerce` as full ICP pages. DISQUALIFIER-rewrite `/for/recruiting` and `/for/design`. DEPRECATE `/for/development` (301 → /).**

### The reasoning in one page

The strategy doc (§11.1, Decision 1) narrowed the Tier-1 beachhead ICP to **"$1M–$3M ARR, 10–25 employees, retainer-heavy digital agencies (paid media, SEO, social, or full-service)."** `icp-customer-research.md` §4 codifies the disqualifier: **"Production-only studios (video, design, dev shops, app studios, animation houses)"** is on the hard-NO list because "Project-based billing, milestone delivery, no retainer cadence. Our benchmarks and alerts don't fit." That is the doc-anchored answer for `/for/design` and `/for/development`.

The disqualifier doc also explicitly excludes **promotional products / merch / print** but is silent on **recruiting/staffing agencies**. Recruiting agencies *do* run a retainer-adjacent shape (retained search) plus a contingent shape (placement fees). The ops vocabulary is different (placements, time-to-fill, fee splits, candidate-pipeline coverage). They are *adjacent* to ICP — same JTBD shape (utilization, margin, scope creep on a different axis) but different KPIs and a different stack (Bullhorn, Crelate, JobAdder — none of which we integrate). Per the doc: *"Same JTBD shape but different vocabulary and different stack. Build a wedge later; do not split focus now."*

So the four pages split into three buckets:

| Page | ICP status | Decision | Why |
|------|------------|----------|-----|
| `/for/full-service` | **In ICP** (explicitly named in §11.1 ICP definition) | **KEEP and rewrite as flagship vertical page** | "Full-service digital" is the largest single Tier-1 segment after paid media + SEO combined. Highest-volume vertical we should be winning. |
| `/for/ecommerce` | **In ICP when reframed** | **KEEP and reframe to "marketing agencies that serve e-commerce clients"** | DTC/e-com is the dominant client portfolio for most paid-media agencies in our ICP. Don't pitch in-house e-com ops (out of ICP); pitch agencies running e-com clients (in ICP). |
| `/for/recruiting` | **Adjacent (not Tier-1)** | **DISQUALIFIER above the fold + polite redirect** | Recruiting has retainer + placement-fee mix. Stack overlap is <30% (no Bullhorn integration). Page absorbs SEO traffic but qualifies prospects out cleanly. Founder sign-off required before treating recruiting as a serious vertical wedge. |
| `/for/design` | **Out of ICP** (explicit disqualifier — "design shops" = project-based studio) | **DISQUALIFIER above the fold + redirect to /pricing or /for/full-service** | Doc-anchored disqualifier. We keep the page only to capture organic search traffic ("design agency operations") and route the rare retainer-heavy design-AGENCY visitor — but the page tells in-house teams + studios "this isn't for you." |
| `/for/development` | **Out of ICP** (explicit disqualifier — "dev shops") | **DEPRECATE — 301 → / (homepage)** | Dev shops run project + milestone billing. Zero stack overlap. There is no rewrite that doesn't dilute the brand. Kill the page. |

**Why disqualifier > full deprecation for recruiting + design:** the SEO audit shows the site is starving for organic traffic. Two pages with clean disqualifier copy are a *better* lead-qualifier than a 404 — they convert curious in-ICP visitors who land on the wrong page (a marketing-agency owner whose Google search included "design" because they also do creative for clients) and politely turn away genuine out-of-ICP visitors. The disqualifier *is* a sales tool.

**Why dev gets deprecated and design doesn't:** design has a non-zero "creative-led marketing agency" overlap. Dev does not — agencies that build software are a fundamentally different ops shape (sprints, story points, code review cycles) and there is no plausible rewrite that lands an in-ICP buyer.

---

## The Vertical Page Template

A reusable structure all `/for/[vertical]` pages share. Variables wrapped in `{{ }}`. Voice rules: dollar amounts > adjectives, real numbers > vibes, customer-language > category-creation. Banned-word density: zero "platform" / "dashboard" (commodity) / "workflow" (overloaded) / "AIOS" (replaced by AI COO per Decision 0).

### Template

```
URL: /for/{{vertical-slug}}
Title: {{Vertical name}} agencies | AI COO — OpsRadar
Meta description: The AI COO built for {{vertical-name}} agencies. Catches {{vertical-specific pain}} before it costs you. $500–$3K/month — what a fractional COO charges for a quarterly PDF.

────────────────────────────────────────────
HERO (above the fold)
────────────────────────────────────────────
Eyebrow:        AI COO · for {{vertical-name}} agencies
H1:             {{vertical-emotional-truth}}  (one specific, vivid line — the founder's drive-home thought)
Subhead:        {{One named 2026 stat with source in parentheses — e.g. "Ahrefs Dec 2025: AIO cuts top-page CTR 58%"}}. {{Two more vertical pains, comma-separated}}. Your AI COO for {{vertical-name}} agencies catches them in real time — and surfaces the ${{X}}/quarter you're missing.
Primary CTA:    Book a 20-min demo with the founder
Secondary CTA:  Or run the 3-minute audit
Trust row:      20 minutes · founder takes the call · we tell you if it's not a fit
Hero visual:    {{vertical-specific live-data mockup}} — NOT a generic dashboard collage. Show the one chart that matters most for this vertical with a real benchmark + a real dollar delta.

────────────────────────────────────────────
THE 3 PAINS, 3 FIXES (vertical-specific)
────────────────────────────────────────────
Section header: "What's costing you money this quarter."
Three two-column cards:
  Pain {{1}}:  {{specific 2026 vertical pain, named}} — costing you {{$X}}/quarter
  Fix {{1}}:  {{The OpsRadar action that fixes it}} — usually live in week {{N}}

────────────────────────────────────────────
SAVED-HOURS / RECOVERED-DOLLARS STAMPS (vertical-specific)
────────────────────────────────────────────
Three concrete numbers, each with a dollar conversion at $100/hr senior rate:
  • ~{{X}} h / mo saved on {{vertical-task}} = ${{Y}}/yr
  • ~{{X}} h / new {{vertical-client}} saved on {{vertical-onboarding-task}} = ${{Y}}
  • {{$X}}/quarter recovered from {{vertical-leak-source}}

────────────────────────────────────────────
REAL CUSTOMER QUOTE (or omit entirely)
────────────────────────────────────────────
RULE: Never use "[Operator quote — to be replaced with real customer]" — that placeholder is in production today on /for/paid-media and /for/seo and must be removed across all vertical pages immediately.
If no real quote exists yet → DELETE the quote block entirely. Empty is better than fake.

────────────────────────────────────────────
BEFORE vs AFTER (vertical-specific 6-row table)
────────────────────────────────────────────
| Today (without an AI COO) | With OpsRadar |
| {{vertical-specific task that wastes time}} | {{specific OpsRadar action that runs it live}} |
…6 rows, each with a dollar anchor in the "Today" column

────────────────────────────────────────────
INTEGRATION SPOTLIGHT
────────────────────────────────────────────
"OpsRadar plugs into the {{vertical-name}} stack you already pay for."
Logo row of the {{4–5}} integrations most-used by this vertical (subset of our 10).
Each with a one-line "what we read from it" tooltip.

────────────────────────────────────────────
PRICING TEASER
────────────────────────────────────────────
Three card row pointing to /pricing:
  Starter $500/mo · Growth $1,500/mo · Pro $3,000/mo
Subline: "A fractional COO is $10K/month for a quarterly PDF. OpsRadar is your COO 24/7."
Macro anchor (italic, small): "Agentic AI returns 171% on average — vs. 57% for traditional automation (Onereach.ai 2026). Your AI COO is the highest-ROI line item you're not running."
CTA: "See full pricing →"

────────────────────────────────────────────
VERTICAL-SPECIFIC FAQ (3–5 questions)
────────────────────────────────────────────
Each Q tied to a vertical-specific objection or 2026 anxiety.
Open the first question by default (audit fix #3 on /faq).

────────────────────────────────────────────
BOTTOM CTA
────────────────────────────────────────────
Repeats hero CTAs. Adds: "If you're not a {{vertical-name}} agency between 10–25 people, we'll tell you on the call."
```

### Template-level rules (apply to ALL 6 vertical pages — paid-media, seo, full-service, ecommerce, recruiting, design)

1. **No "AIOS" anywhere.** Replace with "AI COO" globally per §11.1 Decision 0. Pillars (OPERATE/OBSERVE/BRAIN/GUARD) stay as descriptors of *what the AI COO does*, not as the category.
2. **No placeholder testimonials.** If no real quote, no quote block.
3. **Every hours-saved stamp gets a dollar conversion.** "$100/hr senior rate" is the default multiplier.
4. **The H1 is the founder's drive-home thought**, not the feature. Paid-media's "Sunday nights are for your family" is the bar. The homepage should aspire to this; vertical pages must hit it.
5. **Every page resolves call length to 20 minutes** (per strategy + customer-research doc). Replace any "30-minute" copy globally.
6. **Vertical hero visual ≠ generic dashboard.** Show the one chart that *only matters in this vertical*.
7. **Bottom CTA ends with a self-disqualifier.** Founder-led sale costs less when the wrong-fit visitors qualify themselves out.
8. **Subhead must carry one fresh 2026 vertical stat with source name in parentheses.** What worked in paid-media (Meta CPM $11.20 — Improvado 2026) and SEO (Ahrefs Dec 2025: 58% CTR loss when AIO appears) is that the stat is the credibility — not the adjective. Generic "AI is changing things" subheads fail; named numbers with named sources convert.
9. **The "3 pains, 3 fixes" middle column needs a proof hook column** — what worked on `/for/seo` is the third column ("the agencies catching this in week 2 are quoting $3K–$8K/mo of paid recovery..."). Every fix must end with a peer-validation hook, not a feature claim.
10. **Macro anchor stat in the pricing teaser.** Add the universal anchor: "agentic AI returns 171% on average (Onereach.ai 2026); your AI COO is the highest-ROI line item you're not running." Adapt the dollar comp to the vertical (e.g., for /for/seo: "less than one client's monthly retainer").
11. **FAQ row 1 must address the vertical-specific "is this hype" question with measured data.** What worked on `/for/seo` Q5 was citing Ahrefs + ALM Corp + zero-click percentages — three sources stacked. Each vertical page should have one FAQ that does the same with that vertical's leading 2026 stats.

---

## /for/full-service — FULL COPY (in ICP — flagship vertical page)

This is the largest single Tier-1 segment after paid-media + SEO combined. Persona is mostly Marcus (Persona A in `icp-customer-research.md`): $1.8M–$3M, 14–25 people, runs paid + SEO + content + social under one roof, has 22–31 retainer clients averaging $6.5K–$8.5K/mo.

### Hero

- **URL:** `/for/full-service`
- **Title:** Full-service digital agencies | AI COO — OpsRadar
- **Meta:** The AI COO built for full-service digital agencies. Catches scope creep across paid + SEO + creative + dev before quarter-end. $500–$3K/month — what a fractional COO charges for one PDF.
- **Eyebrow:** AI COO · for full-service digital agencies
- **H1 (primary):** **You're profitable on paper. You're bleeding in the spreadsheet.**
- **Alternate H1s:**
  - "Twelve clients, six service lines, one bank balance going the wrong way."
  - "Every service line says they're under-resourced. Every utilization report says you're at 64%. One of them is lying."
  - "You bought four tools to run a full-service agency. They all show you a different number."
- **Subhead:** Cross-discipline scope creep, capacity guesswork between paid + SEO + creative, and a P&L that only ties at quarter-end. Your AI COO for full-service agencies catches all three in real time — and surfaces the **$48K/quarter** the average $2M shop is losing to overserviced clients.
- **Primary CTA:** Book a 20-min demo with the founder
- **Secondary CTA:** Or run the 3-minute audit
- **Trust row:** 20 minutes · founder takes the call · we tell you if it's not a fit
- **Hero visual:** A live per-client P&L row strip — 6 clients, each with **Service line breakdown** (Paid · SEO · Creative · Dev hours) and **This-month margin** with a red flag on the one that's gone negative. Underneath: a one-line live recommendation ("Acme is -18% this month — 14 unbilled creative hours. Send invoice →"). This is the chart only a full-service agency cares about and the homepage doesn't show.

### The 3 pains, 3 fixes

**Pain 1 — Cross-discipline scope creep eats your margin.** The paid team adds a landing page "to help conversions" — your creative team built it, your dev team deployed it, nobody invoiced. Costing you ~$3,200 per silent crossover. The average full-service shop has 4–7 of these per quarter.
**Fix 1 — Cross-team scope alerts.** OpsRadar reads time logs across Harvest/Toggl plus ClickUp/Asana tickets and flags when one service line is consuming hours billed to another. You see it in week 2 of the month, not at quarter-end. Live in week 1.

**Pain 2 — Utilization tells you one story, your delivery leads tell you another.** Paid lead says "we're maxed." SEO lead says "we're maxed." Creative lead says "we're maxed." Your utilization report says 64%. You can't tell whether to hire, reallocate, or call BS.
**Fix 2 — Live utilization by service line + by person.** OpsRadar surfaces the discipline-level breakdown weekly, flags the 2 people doing 80% of the billable work, and shows you who has 8 hours of capacity this Thursday. Replaces "gut + delivery lead opinion" with a number. Live in week 1.

**Pain 3 — Six tools, six different numbers, no source of truth.** HubSpot says you have $620K in pipeline. ClickUp says you have 47 active deliverables. Harvest says you have 1,920 billable hours. Stripe says you have $42K in receivables. Nothing reconciles. Your Thursday board update takes 6 hours and you still cite the wrong number.
**Fix 3 — One live agency health score.** OpsRadar reads from all 6+ tools, reconciles weekly, and gives you a 0–100 score per client + per team + per agency. The Thursday board update prep drops from 6 hours to 6 minutes. Live in week 2.

### Saved-hours stamps

- **~18 h / month saved** on the per-client P&L reconciliation = **$21,600/year** at $100/hr (Persona A's actual time today: 4 hours every Friday)
- **~14 h / new full-service client onboarded** saved on the cross-team kickoff doc = **$1,400 per new client**
- **$48K / quarter recovered** in unbilled cross-discipline scope creep (the largest single leak for full-service shops per the JTBD map, Job #1)

### Real customer quote

*(Omit until a real quote exists. Strategy doc names Sean / SwishAd as hottest lead — slot in once signed. Until then, the block is deleted.)*

### Before vs After table

| Today (without an AI COO) — costing you $X | With OpsRadar |
|---|---|
| Friday night per-client P&L in a Google Sheet — costs you 4 hrs/week = **$20K/yr** in your own time | One live per-client P&L row, reconciled weekly. Surfaces overserved clients in week 2. |
| "Are we on plan?" → 4 hours of pulling reports before you can answer — costs you **$400/answer** | Founder asks the AI COO in Slack. Gets the answer in 12 seconds with the live numbers cited. |
| Cross-team scope crossovers caught at quarter-end — costs you **$12K–$15K per silent crossover** | Cross-team scope alert in week 2 of the month with the unbilled hours and a draft invoice. |
| Utilization debate between 3 service-line leads — costs you **bad hiring decisions = $80K+/yr** | Live utilization by discipline + by person, with capacity gaps highlighted. |
| Thursday board prep — 6 hours of slide-building = **$600/week, $30K/yr** | Auto-generated health summary, one click, ready to paste. |
| Quarterly fractional-COO PDF — costs you **$9K/month for 8 hours of attention** | OpsRadar at $1,500/month, 24/7, with live data your fractional never had. |

### Integration spotlight

"OpsRadar plugs into the full-service stack you already pay for." Logo row:

- **HubSpot or Pipedrive** — pipeline + client status
- **ClickUp / Asana / Monday** — delivery tickets across disciplines
- **Harvest or Toggl** — time logs by service line
- **Stripe** — invoices + AR aging
- **Slack** — alerts go where you already are

### Pricing teaser

Three cards pointing to /pricing:
- **Starter — $500/month** — one service line, up to 10 clients
- **Growth — $1,500/month** *(most full-service agencies start here)* — all service lines, up to 30 clients
- **Pro — $3,000/month** — multi-entity, agentic actions on

Subline: "A fractional COO is $10K/month for a quarterly PDF. OpsRadar is your COO 24/7."

### Vertical-specific FAQ

**Q: We already use Productive / Scoro for the agency P&L. Why OpsRadar?**
A: Productive *records* what happened. OpsRadar tells you what to do. Productive will show you Acme is -18% this month. OpsRadar tells you "Acme is -18% — here are the 14 unbilled creative hours from sprint 4. Send the invoice." We plug in alongside Productive; you don't replace it.

**Q: We've got too many service lines for a generic ops tool.**
A: That's exactly the problem we're built for. Full-service is where horizontal AI fails — ChatGPT doesn't know your creative team logs to Toggl and your paid team logs to Harvest. Every benchmark, alert, and recommendation in OpsRadar is built on cross-discipline agency data.

**Q: How long until it's live across all our service lines?**
A: Week 1: paid + SEO + creative time tracking connected, first per-client P&L live. Week 2: full agency health score. Week 4: alerts tuned to your thresholds.

**Q: We tried a fractional COO. Got a binder of recommendations, zero implementation.**
A: Same — that's literally why this exists. The fractional gives you a PDF. OpsRadar gives you a Slack message at 9:14am saying "Acme is overserved this month — here's the unbilled hours, here's the draft invoice, click to send." It's the implementation layer the fractional couldn't deliver.

**Q: We're 18 people across 6 service lines. Is that the right size?**
A: Right in the middle of our beachhead. 10–25 people, retainer-heavy, founder still doing weekly reviews. If you're under 8 people, we'll tell you to come back when you've crossed your next hire.

### Bottom CTA

Headline: **You can't fix what you can't see across six service lines.**
Sub: Book a 20-min demo with the founder. We show you Acme — live — on your data. If your agency isn't between 10–25 people running retainer-heavy full-service, we'll tell you on the call.
Primary CTA: Book a 20-min demo
Secondary: Run the 3-minute audit first

---

## /for/ecommerce — FULL COPY (in ICP when reframed)

**Reframe locked at top of page:** This page targets **paid-media and full-service agencies that serve e-commerce clients** — not in-house e-com ops teams. Per §4 of `icp-customer-research.md`, "production-only studios" are disqualified, but agencies whose *client portfolios* are e-commerce-heavy are squarely in the ICP. The page makes that distinction in the first paragraph.

### Hero

- **URL:** `/for/ecommerce`
- **Title:** Agencies running e-commerce clients | AI COO — OpsRadar
- **Meta:** The AI COO for marketing agencies running DTC and e-commerce clients. Catches MER drift, creative-fatigue ad spend leaks, and Q4 capacity disasters before they cost you the renewal.
- **Eyebrow:** AI COO · for agencies running e-commerce clients
- **H1 (primary):** **Your client's BFCM is your bottleneck. Your AI COO sees it in October.**
- **Alternate H1s:**
  - "MER drifted in week 2. Your client noticed in week 6. You renewed for less."
  - "Creative fatigue is a silent killer. So is the agency hour count it costs you."
  - "Every Q4 you over-deliver. Every Q1 you wonder why the margin disappeared."
- **Subhead:** MER drift on your DTC clients, creative-fatigue spend leaks the team doesn't catch, and an over-extended Q4 your finance team won't fully invoice. Your AI COO for e-commerce-heavy agencies catches all three — and surfaces the **$32K/quarter** the average paid-media-DTC agency is losing per overserved e-com client.
- **Primary CTA:** Book a 20-min demo with the founder
- **Secondary CTA:** Or run the 3-minute audit
- **Trust row:** 20 minutes · founder takes the call · we tell you if it's not a fit
- **Hero visual:** A DTC client P&L row: **Ad spend $84K · Agency hours billed 142 · Agency hours actual 191 · MER 4.2 → 3.6 (week-on-week)** with a red flag and a live recommendation ("Creative fatigue on Acme — 14 ad sets >$50 CPA. Refresh queue ready. Approve →"). The chart shows the *intersection* of agency margin and client performance — the unique problem an e-com-serving agency has.

### Disqualifier framing (paragraph 1 below the hero)

> "This page is for marketing agencies that *run* e-commerce clients — paid-media shops, full-service agencies with DTC books, performance creative studios. If you're an in-house e-commerce ops team trying to run your own operations, OpsRadar isn't built for you yet. The benchmarks here are tuned for agencies billing 5–30 DTC clients on retainer."

### The 3 pains, 3 fixes

**Pain 1 — MER drifts in week 2; your client notices in week 6.** You over-pace one platform by 12% on Tuesday, the team catches it Friday, the client doesn't see the dip until the next monthly report. By then the margin call is already happening — and your renewal conversation just got 30% harder.
**Fix 1 — Live MER + pacing alerts per DTC client.** OpsRadar reads from Meta + Google + your agency's reporting stack and pings you the moment MER drops below the client's threshold. The Tuesday alert, not the Friday post-mortem. Live in week 1.

**Pain 2 — Creative fatigue is a silent agency-hours leak.** Your team keeps tweaking copy on 9 fatigued ad sets across 4 clients. That's ~18 hours/month of unbilled "we'll get to it" work — $1,800 of your margin, gone. Multiply by 5 DTC clients and you're losing $9K/month you never invoiced.
**Fix 2 — Creative fatigue surfacing + hour accounting.** OpsRadar flags fatigued creative *and* tracks the agency hours your team spends on each refresh. You see which clients are bleeding unbilled creative hours and can either bill them or stop spending them.

**Pain 3 — Q4 over-delivery you'll never recover.** BFCM week, every DTC client wants a new landing page, two extra emails, and a creative refresh. Your team says yes. Your January P&L tells the story. The over-served clients didn't even renew at higher MRR.
**Fix 3 — Q4 capacity guardrails.** OpsRadar projects each DTC client's October–November–December hours against contracted scope, alerts when a client is on pace to exceed 130% of allocated hours, and gives you the dollar amount + draft scope-expansion email to send *before* the work happens.

### Saved-hours / recovered-dollars stamps

- **~14 h / month saved** on weekly DTC pacing pulls = **$16,800/year** at $100/hr senior rate
- **~22 h / new DTC client** saved on the kickoff + creative QA setup = **$2,200 per onboarding**
- **$32K / quarter recovered** in unbilled creative + landing page work the team did during BFCM crunch

### Real customer quote

*(Omit. Reactivate Sean / SwishAd lead — DTC paid-media agency — and place quote here once signed. Per §11.3 of strategy doc.)*

### Before vs After table

| Today (without an AI COO) — costing you $X | With OpsRadar |
|---|---|
| MER pacing pulled Monday morning across 6 DTC clients — **3 hrs/week × $100 = $15K/yr** | Live MER alert in Slack the hour it drifts beyond client threshold. |
| Creative fatigue caught at month-end QBR — costs you **$3K/month per fatigued client** | Fatigue flag the day creative hits cost-per-result spike. |
| BFCM over-delivery → unbilled scope — **$32K/quarter across 5 DTC clients** | October projection + scope-expansion email draft sent before the work starts. |
| "Did Meta beat Google this week?" → 90 minutes of digging | One-line answer in chat, with the numbers cited. |
| Monthly DTC client report → 5 hours of slide-building per client = **$2K/client/month** | Health summary auto-generated, branded, ready to send. |
| Quarterly fractional COO PDF — **$9K/month for vague advice** | OpsRadar at $1,500/month, live MER + creative + margin data your fractional never had. |

### Integration spotlight

"OpsRadar plugs into the DTC stack your agency already runs."
- **Meta Ads + Google Ads** (via your reporting stack) — MER, ROAS, CPA
- **HubSpot or Pipedrive** — client status + renewal dates
- **ClickUp or Asana** — creative + LP delivery tickets
- **Harvest or Toggl** — agency-side hours per DTC client
- **Stripe** — agency invoicing + late-payment alerts

### Pricing teaser

- **Starter — $500/month** — up to 5 DTC clients
- **Growth — $1,500/month** *(most DTC-heavy agencies start here)* — up to 15 DTC clients with creative-fatigue + MER monitoring
- **Pro — $3,000/month** — agentic actions on (auto-draft scope-expansion emails, agency-side invoice runs)

### Vertical-specific FAQ

**Q: We already get pacing reports from our ad platform stack.**
A: Those tell you what happened. OpsRadar tells you what to do. Triple Whale shows you MER dropped 14%. OpsRadar tells you "MER dropped 14% on Acme. The agency team has spent 18 unbilled hours refreshing creative this month. Send the scope-expansion email — draft ready."

**Q: We serve mostly DTC clients but also a few B2B.**
A: Perfect — OpsRadar handles a mixed portfolio. The benchmarks shift by client type, so a B2B SaaS client gets a different scope-creep threshold than your DTC clients.

**Q: Does this work for performance creative studios (not full-service)?**
A: Yes — if you're billing retainer or hybrid retainer/performance. If you're 100% performance-fee with no retainer floor, your problem is closer to lead-gen than ops; we're probably not the right fit. We'll tell you on the call.

**Q: We white-label some clients through another agency. Multi-entity?**
A: That's a Pro-tier feature. Multi-entity views let you keep your white-label margin private while still running OpsRadar across all clients.

### Bottom CTA

Headline: **Your DTC clients don't see the leak. Your AI COO does.**
Sub: Book a 20-min demo. We'll show you what creative fatigue + unbilled hours costs a typical $2M DTC agency in Q4. If your portfolio isn't ≥40% e-commerce, we'll tell you on the call.

---

## /for/recruiting — DISQUALIFIER PAGE (adjacent, not Tier-1 ICP)

**Strategic frame:** Per `icp-customer-research.md` §4 the disqualifier list excludes **production-only studios and "pure performance / commission-only billing"** but is silent on recruiting/staffing. Recruiting agencies have *retainer + placement-fee* mix, similar utilization shape, but **none of our 10 integrations covers Bullhorn / Crelate / JobAdder**. Per strategy doc §11.1 (ICP narrowing): **marketing agencies are the wedge.** Recruiting may be a 2027 vertical wedge, but is not a Tier-1 fit today. The page exists to capture SEO traffic on "recruiting agency operations" / "recruiting ops" searches and politely qualify visitors out — or route the rare hybrid (a marketing agency with an embedded talent practice) to the right page.

### Hero (with disqualifier above the fold)

- **URL:** `/for/recruiting`
- **Title:** Recruiting agencies | OpsRadar
- **Meta:** OpsRadar is the AI COO for marketing agencies. We don't yet serve recruiting agencies as a primary vertical — here's why, and what we recommend instead.
- **Eyebrow:** Heads up — OpsRadar is built for marketing agencies
- **H1:** **Recruiting agencies have a margin problem. We're just not the team to fix it — yet.**
- **Subhead (the disqualifier, explicit):** OpsRadar is the AI COO for marketing agencies — paid media, SEO, full-service, social, content. Recruiting and staffing agencies share a lot of the same operational pain (utilization, fee splits, placement velocity, retainer vs contingent margin) but run on a different stack: Bullhorn, Crelate, JobAdder, Loxo — none of which we integrate with today. If you're a recruiting agency, we'd rather tell you that here than waste your 20-min call.
- **Primary CTA:** *(softened)* — **Tell us anyway →** (anchored to a 3-question form: "If you're 70% marketing / 30% talent, or running an in-house RecOps team for an agency holding co, we want to know.")
- **Secondary CTA:** Or see what we *do* build at /for/full-service →

### Below-the-fold: the polite full explanation

**Why we're saying no:**

1. **Stack mismatch.** Your daily-driver tools (Bullhorn, JobAdder, Loxo, Crelate) aren't in our 10 integrations. The time-to-value for you would be 6+ months of integration work — too long for either of us.
2. **KPI mismatch.** Our benchmarks are tuned for retainer marketing agencies: utilization at 75%, scope creep on monthly retainers, MER on ad clients. Your benchmarks (time-to-fill, placement velocity, fee split per recruiter, contingent vs retained mix) need their own data layer — which we'd have to build from scratch.
3. **The wedge is marketing.** Per our 2026 strategy, the first 50 customers are marketing agencies. We're not splitting focus until we're at 100+.

**What we recommend instead:**
- **Bullhorn Analytics** (if you're on Bullhorn) — built for your KPI shape
- **Recruiterflow** — newer, better UX
- **Crelate Recruit** — for the contingent-heavy shops
- **A fractional COO from Fractionals United** — many specialize in recruiting agency ops

**When we'd be ready for you:** 2027, maybe sooner if we see 30+ recruiting agencies fill out the form below. Until then, we'd rather not waste your time.

### Hybrid case (the polite exception)

> "If you're a marketing agency with an embedded talent practice (e.g., you do creative recruiting for clients alongside your paid-media work), or if you're a recruiting agency holding company with an internal marketing-ops team — both of those *are* in our ICP. Tell us in the form and we'll route the call appropriately."

### Form (3 questions)

1. What % of your revenue is marketing services vs talent placement?
2. What's your stack (free text)?
3. Email + name for the call.

### No pricing teaser, no FAQ, no quote block.

Per the disqualifier rationale — if recruiting isn't in ICP we don't show pricing (it routes the wrong visitor).

### Bottom CTA

Headline: **We'd rather lose your time than waste it.**
Sub: If you fit the hybrid case (marketing + talent), tell us. Otherwise, bookmark us for 2027.

---

## /for/design — DISQUALIFIER PAGE (out of ICP per `icp-customer-research.md` §4)

**Strategic frame:** The doc explicitly disqualifies **"Production-only studios (video, design, dev shops, app studios, animation houses)"**. The page exists to (a) capture organic search traffic from "design agency operations" / "design studio ops" queries, (b) qualify in the rare retainer-heavy design-AGENCY visitor (think branding studios with $15K/mo design retainers), and (c) politely turn away in-house design teams + project-based studios.

### Hero (with disqualifier above the fold)

- **URL:** `/for/design`
- **Title:** Design agencies & studios | OpsRadar
- **Meta:** OpsRadar is the AI COO for marketing agencies — not design studios. If you run a retainer-heavy design AGENCY, here's where we might still fit. If you run a project-based studio, here's what we recommend instead.
- **Eyebrow:** Heads up — OpsRadar is built for marketing agencies
- **H1:** **Project-based design studios don't have the problem we solve.**
- **Subhead:** OpsRadar is the AI COO for retainer-heavy marketing agencies — we catch margin leaks on monthly retainers, scope creep on long-running relationships, and utilization drift across delivery teams. If you're a design studio billing by project / milestone / fixed-fee, your problem is closer to "did this project deliver on time and budget" — and the right tool for that is Productive or Float, not us. If you're a *design AGENCY* with retainer clients (brand systems, ongoing design ops, design subscription model) — keep reading, we might fit.

### Below-the-fold: the two-path branch

#### Path A — "We're a project-based design studio" (the polite no)

We don't yet serve project-based design work because:
1. **Billing shape doesn't match our benchmarks.** Project / milestone billing means "scope creep" looks like change orders, not silent overservicing — different mechanic.
2. **Stack mismatch.** Most design studios run on Figma + Notion + Toggl + Bonsai/Invoice Ninja. We don't integrate with Bonsai. Half-coverage is worse than no coverage.
3. **JTBD mismatch.** Your problem is "deliver this project on time + scope." Our problem is "stop the margin from leaking on a 6-month retainer relationship."

**What we recommend instead:**
- **Productive.io** — solid milestone + project P&L
- **Float** — best-in-class for capacity-planning on project shops
- **Hectic** (now Hello Bonsai) — for solo + small studios

#### Path B — "We're a retainer-heavy design agency" (the soft yes, qualified)

If you run a brand-design subscription model, an embedded design ops practice for marketing agencies, or a design retainer book (≥60% retainer revenue, 10+ team members, monthly billing), OpsRadar might still fit — but it's an edge case for us.

**Conditions for the soft yes:**
- ≥60% of revenue is on monthly retainer
- 10+ team members
- You use at least 4 of: HubSpot, Pipedrive, ClickUp, Asana, Monday, Harvest, Toggl, Stripe
- You don't bill by milestone — you bill by month

**If all four → book a 20-min call.** Founder takes it. We'll tell you in the call whether we're the right fit.

**If not all four → we're not the right fit. Bookmark us for 2027.**

### No pricing teaser. No FAQ. No quote block.

(Same rationale as recruiting — disqualifier pages don't show pricing.)

### Bottom CTA

Path A: "We'd rather you find the right tool — try Productive."
Path B: "Book a 20-min call. We'll tell you if it's a fit in the first 5 minutes."

---

## /for/development — DEPRECATE (301 redirect to /)

**Decision:** 301 redirect `/for/development` → `/`.

**Rationale (one paragraph):**

Dev shops are explicitly disqualified in `icp-customer-research.md` §4 (production-only studios). Unlike design, there is no plausible "retainer-heavy dev agency" rewrite that lands an in-ICP buyer — agencies that build software operate on sprints, story points, code review, deployment frequency, and milestone billing. Zero stack overlap with our 10 integrations (no GitHub, no Linear, no Jira). The page is doing nothing right now except diluting the "AI COO for marketing agencies" brand for any visitor who lands on it from a misdirected Google query. A 301 to the homepage absorbs the SEO juice into a higher-value destination and removes a confused entry-point. **No copy to write. Implementation:** add to `next.config.ts` redirects array; `/for/development` → `/` with HTTP 301.

---

## Site-wide considerations this template enforces

1. **AIOS → AI COO across all 6 vertical pages.** Per §11.1 Decision 0. Pillars stay as descriptors (OPERATE/OBSERVE/BRAIN/GUARD describe *what the AI COO does*) but are no longer the category. Estimated find-and-replace: ~30 instances across `/for/paid-media`, `/for/seo`, `/for/full-service`, `/for/ecommerce`.

2. **Placeholder testimonials removed everywhere.** Live-site audit confirms `"[Operator quote — to be replaced with real customer]"` is in production on `/for/paid-media` and `/for/seo`. This template makes the rule explicit: no real quote → no quote block. Empty is better than fake.

3. **ICP discipline encoded in the page set.** 4 in-ICP vertical pages (paid-media, seo, full-service, ecommerce) sell. 2 disqualifier pages (recruiting, design) qualify out wrong-fit visitors politely. 1 deprecated page (development) is 301'd. The page mix *is* the ICP discipline.

4. **Call length resolved to 20 minutes** on every vertical page (per §11.1 + customer-research doc). Replace all "30-minute" instances site-wide; sync Calendly.

5. **Every vertical page has a dollar number in the H1 or subhead.** Audit verdict: "Zero dollars, zero hours, zero real-customer language on any page that matters." This template puts a dollar in the subhead of every kept vertical page.

6. **Every "Today" column in every Before/After table has a dollar anchor.** Voice rule: "Dollar amounts over adjectives."

7. **Template means future verticals can be added in <2 hours.** The cost of adding `/for/social` or `/for/pr-comms` later is now (a) write the 3 pains, (b) write the H1, (c) pick the integration subset, (d) drop into template. Done.

---

## Risk flags

1. **Strategic decision on Recruiting affects existing organic traffic.** If `/for/recruiting` currently captures real search volume on "recruiting agency operations," converting it to a disqualifier page may drop sign-ups in the short term. **Recommendation:** check Google Search Console for organic traffic + conversion rate on the page before deploying. If it's converting Tier-3-fit visitors at a non-trivial rate, consider the "soft yes for hybrid case" path instead of full disqualifier. **Founder sign-off required.**

2. **Design DECIDE: disqualifier vs deprecate.** This doc commits to disqualifier (Path A + Path B branch). The alternative — full deprecation like dev — is also defensible. **Founder sign-off:** does the branding-studio-on-retainer edge case justify keeping the page? If "no, kill all production-studio pages," then `/for/design` joins `/for/development` in the 301 list. The current call is "keep, with disqualifier."

3. **`/for/full-service` may cannibalize the homepage.** Both pages now claim to be the flagship "AI COO for [marketing/full-service] agencies" entry point. **Mitigation:** the homepage stays category-creation framed ("AI COO for marketing agencies"), the full-service page is the vertical-specific landing for paid-search traffic on "full-service agency operations" / "full-service digital agency margin." Different audiences, same product. But the H1 risk is real — flag for QA when both ship.

4. **`/for/ecommerce` reframing requires editorial discipline.** The page is *only* in ICP under the "marketing agencies that serve e-com clients" framing. If a copy editor later softens the disqualifier paragraph ("OpsRadar helps any e-commerce business"), the page silently becomes a magnet for in-house e-com ops teams — who churn in 60 days. **Editorial rule:** the disqualifier paragraph below the hero is locked. Don't soften it.

5. **The Sunday-nights bar is high.** `/for/paid-media`'s "Sunday nights are for your family" is the best headline on the site. The H1s in this doc (`/for/full-service`: "You're profitable on paper. You're bleeding in the spreadsheet"; `/for/ecommerce`: "Your client's BFCM is your bottleneck. Your AI COO sees it in October.") need user-testing on the next 20 prospect calls — if they don't repeat the headline back to us unprompted, they're not landing yet.

6. **Pricing teaser implies `/pricing` works.** Live-site audit confirms `/pricing` is a hard 404. Every vertical page links to `/pricing` in the teaser block. **Sequencing:** ship `/pricing` v0.1 *before* deploying any of these rewrites, or remove the pricing teaser block temporarily.

7. **Recruiting agency ICP fit needs founder sign-off.** The decision here is "disqualifier today, possibly a 2027 wedge vertical." If the founder believes recruiting is a near-term wedge worth splitting focus on, the disqualifier page becomes the wrong call. Default position per `icp-customer-research.md` §1 Tier-3 and §4: **do not split focus.** Confirm.

---

*End of document. Next action: get founder sign-off on the recruiting + design disqualifier calls, then sequence behind the `/pricing` ship + the AIOS→COO global find-and-replace.*
