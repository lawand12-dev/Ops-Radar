# /audit Funnel Copy v2 — AI COO Commit

*Owner: Lawand · Date: 2026-05-18 · Replaces: live `www.opsradar.co/audit` (13-step flow, mixed-vertical options, "Free · Results sent to your inbox")*
*2026-06-01 audience note: this is a dated agency-beachhead funnel draft, not the current company-wide positioning. Current canonical language is **AI operating system for service businesses and agencies that bill for client time**. Keep this funnel agency-specific only if `/audit` is intentionally the agency acquisition path.*
*Voice anchor: peer-to-peer like "Sunday nights are for your family." Specific, dollar-anchored, founder-to-founder.*

---

## Meta

- **Title (58 chars):** `Free 3-min agency leak audit — OpsRadar`
  *(Replaces the double-brand bug `Audit — OpsRadar — OpsRadar`. Names the deliverable, not the activity.)*
- **Description (152 chars):** `Find the $30K–$80K you're leaking this year to scope creep, unprofitable clients, and untracked hours. Built for agencies $1M–$3M.`
- **OG title:** `Find the $30K–$80K you're leaking this year — in 3 minutes.`
- **OG description:** `Conservative, agency-specific leak math. Your custom report lands in your inbox in 5 minutes, with a 20-min call to walk through it.`
- **OG image direction:** Dark bg. Large white serif: "Find the $30K–$80K you're leaking this year." Below it, smaller mono: "3 minutes · For agencies $1M–$3M · Dollar estimate in your inbox." Bottom-right: a single mock alert in amber — "Scope creep · Acme · +14h unbilled this month · ~$2.1K leak". No UI chrome.

---

## Pre-step landing screen (new — currently doesn't exist)

> **Why this exists:** Today the live audit drops you straight into "What kind of business are you running?" with no promise framing. The audit deliverable is buried below a question. Strategy says the dollar promise has to come *before* step 1.

**Eyebrow (small caps, green dot):**
`AI COO · FREE 3-MINUTE LEAK AUDIT`

**H1 (primary):**
`Find the $30K–$80K you're leaking this year — in 3 minutes.`

**Subhead (32 words, single sentence + anchor stat):**
`Answer 7 questions about your stack, your retainers, and where time goes. I'll come back with a conservative dollar estimate of what's leaking — and the 3 places to plug it first. (Productive.io 2026: 50% of agencies leave 20%+ of profit untapped. The average 7-figure shop runs 18–22% margins; the leak is usually bigger than the margin.)`

**Trust microcopy (· separated, single line):**
`Free · Results in your inbox in 5 minutes · Built for agencies $1M–$5M`
*(Replaces the live "Free · Results sent to your inbox" — adds the timing promise and the audience filter. ICP qualifier is right in the trust line, not hidden in a footer.)*

**Primary CTA:** `Start the audit`
**Primary CTA hover state:** `→ 7 questions · 3 minutes · No spam`

**Secondary CTA:** `Or book a 20-min call instead`
**Secondary CTA hover:** `→ Skip the form — talk to the founder`
*(Gives high-intent buyers a path out of the funnel. The audit is the *low-intent* path; the call is the high-intent path. Live page has no escape hatch.)*

---

## Voice decision — locked

**FIRST-PERSON "I" (the AI COO is the speaker).**

Rationale:
1. **Category coherence.** The product is the *AI COO for agencies*. The audit is the AI COO doing what an AI COO does — diagnosing your agency. Switching to "we" mid-funnel breaks the metaphor.
2. **The live audit already runs first-person** ("I tailor benchmarks…") on Step 0 — it just doesn't commit. Auditor flagged the inconsistency with the rest-of-site "we." Fix is: keep "I" inside the audit experience, keep "we" on marketing pages, label the seam.
3. **Distinctiveness.** No competitor's audit funnel speaks in first person as a named role. Productive, Scoro, Kantata, ZenPilot — all "we." The "I" voice is on-strategy and unowned.
4. **It de-corporates the moment.** Persona A (Marcus, $1.8M paid-media founder) says he wants "someone to tell me what's wrong" — not a committee. First-person "I" delivers that tone; "we" doesn't.

**The seam rule:**
- Marketing pages (`/`, `/pricing`, `/about`, `/for/*`): **"we"** — the OpsRadar team.
- The audit funnel (`/audit`) + the audit *email* + the audit *report* on `/results`: **"I"** — the AI COO speaking.
- The 20-min call CTA on the final step switches back to "we" — because the call is with a human (the founder).

**Founder sign-off needed:** Confirm the seam rule. Risk flag below.

---

## Step Count Reduction (13 → 7)

### Current 13 steps (live)
1. Agency profile (business type)
2. Team size
3. Revenue
4. Client load (active clients)
5. Tech stack
6. Operations state (4 buckets)
7. Lead capture (name, email, agency name)
8. Time lost (hours/week)
9. Failure modes (what happens when things break)
10. Top pain process (textarea)
11. Frequency (how often it happens)
12. Cost of inaction (6-month cost textarea)
13. Desired outcome (textarea + optional website URL)

### The 7 surviving steps

| # | Step | Why it survives |
|---|---|---|
| 1 | Agency type + ICP filter | The disqualifier — non-negotiable. Determines whether we even run the audit. |
| 2 | Revenue + team size (combined) | Tier-1 ICP firmographic ($1M–$3M, 10–25 ppl) confirmed in one screen, not two. |
| 3 | Retainer share + active clients (combined) | Retainer share is the buying-shape qualifier from `icp-customer-research.md` Q4. Client count anchors the leak math. |
| 4 | Tech stack | Confirms ≥4-integration overlap (Tier-1 hard criterion). Drives the recommendations. |
| 5 | The acute trigger (one screen) | Picks the buying trigger: 5-figure overserve / layoff / fractional COO / margin shrink. This is the *real* qualifier. |
| 6 | The top operational drag (free-text) | The one thing they tell us in their own words. Anchors the audit's specificity. |
| 7 | Email capture + 20-min call CTA | Combines lead capture with the call handoff. Single screen. |

### Cuts and why

| Cut | What it was | Why it goes |
|---|---|---|
| Operations state (4 buckets: chaos / patchwork / functional / systematized) | A self-rating of how broken ops are | **Bloat.** Self-ratings on a 4-point scale don't change the audit output. Founders all pick "patchwork" or "functional but inefficient" (the safe middle). Adds a click; gives the model nothing it didn't already have from team size + stack + trigger. |
| Failure modes ("when something breaks, what happens?") | What happens when ops break | Subsumed into the acute-trigger step (Step 5). The signal — "clients notice before we do," "no idea how often it breaks" — is captured better by the binary trigger question. |
| Frequency (how often the top pain process happens) | Daily / weekly / monthly | Bloat. The audit math doesn't need a separate frequency step — we can ask "weekly, monthly, or quarterly?" inline in the top-drag textarea (Step 6) and let the model parse it. Removing it saves a click. |
| Time-lost hours bucket | Hours/week lost to "work beneath their pay grade" | Self-reported hours are noisy. Replaced by a more concrete proxy in the trigger step (which we *know* correlates: "lost a 5-figure client to overservicing"). |
| Cost-of-inaction (6-month cost textarea) | "What does another 6 months cost you?" | **Therapy-question bloat.** It's the AI COO's job to compute this — that's literally the deliverable. Asking the user to compute it is the funnel asking them to do the work. Cut. |
| Desired outcome (textarea) | "If your top drags were gone, what would change?" | Visualization exercise. Doesn't change the audit; doesn't change the dollar number. Cut. The relief framing belongs in the *report*, not in the funnel. |
| Active-clients-count standalone step | "How many active clients?" | Folded into Step 3 (retainer share + active clients combined). |
| Standalone tools-other / tool-signals follow-up | The dynamic "based on your stack, what gets stitched together by hand?" sub-question | Folded into Step 4 as a single multi-select. The dynamic re-render mid-step adds friction and is the kind of cleverness that costs more in dropoff than it earns in signal. |

**Net:** 13 → 7. Honors the "3-minute" claim (target: 2:30 median completion).

---

## The 7 steps — full copy

### Step 1 — Agency type (the disqualifier)

**Eyebrow:** `1 / 7 · AGENCY PROFILE`

**Question (H2):**
`First — are you a agency?`

**Helper text:**
`I only run real audits for agencies $1M–$5M. Pick the closest fit — if you're not a agency, I'll show you a quick summary instead.`

**Why this matters block:**
`A paid-media agency, an SEO shop, and a social agency leak money in different ways — but they share a stack, a retainer model, and benchmarks I can actually math against. Outside marketing, my numbers stop being honest.`

**Options (narrowed to ICP):**
- `Paid media (Meta / Google / TikTok)`
- `SEO / content`
- `Social media management`
- `Full-service digital`
- `Not a agency — show me what OpsRadar does anyway`

*(Removes: Recruiting/Staffing, Design/Creative, Development, PR/Communications, E-commerce, "Other" for this specific agency funnel. This is a lead-quality choice, not company strategy. If `/audit` becomes the broad service-business funnel, restore the adjacent vertical options and calibrate the math per vertical.)*

**Validation:**
- One option required.
- Selecting the disqualifier option routes to the disqualifier flow (see below) — does not continue to Step 2.

---

### Step 2 — Revenue + team size

**Eyebrow:** `2 / 7 · AGENCY SIZE`

**Question (H2):**
`How big is the agency right now?`

**Helper text:**
`Two questions on one screen. I need both to size the leak — revenue tells me the order of magnitude, headcount tells me who's overserviced.`

**Why this matters block:**
`The 21.5% of agencies losing money in 2026 (Planable — up from 13% the year before, steepest jump on record) are mostly in the $1M–$5M band. 50% leave 20%+ of profit untapped to ops inefficiency (Productive.io 2026). That's where one bad client wipes out three good ones. I size every estimate to your actual band.`

**Sub-question A — Annual revenue:**
- `Under $1M`
- `$1M–$3M`
- `$3M–$5M`
- `$5M–$10M`
- `$10M+`

**Sub-question B — Team size (FTEs):**
- `Just me / under 5`
- `5–10`
- `10–25`
- `25–50`
- `50+`

**Validation:** Both required. If revenue is `<$1M` or `$10M+`, OR team is `Just me / under 5` or `50+` → soft warning on the next step ("you're outside my sharpest band — I'll still run it, but the numbers are less precise"). Don't block; the lead is still worth capturing for the partner list.

---

### Step 3 — Retainer share + active clients

**Eyebrow:** `3 / 7 · CLIENT MIX`

**Question (H2):**
`How does the money come in?`

**Helper text:**
`Retainer agencies and project agencies leak in completely different places. I'll calibrate the audit to whichever you actually run.`

**Why this matters block:**
`Retainer-heavy shops bleed via scope creep and overservicing — the silent kind that shows up in your bank account 60 days late. Average scope creep per project: $8,700 (tmetric.com 2025). 57% of agencies lose $1K–$5K every month to unbilled work (iota-finance 2026). Project shops bleed via underquoting and unbilled change orders. Same wound, different vein.`

**Sub-question A — Billing mix:**
- `Mostly monthly retainers (60%+ of revenue)`
- `Mostly projects`
- `Roughly half-and-half`
- `Performance / commission-based`

**Sub-question B — Active clients right now:**
- `1–5`
- `6–15`
- `16–30`
- `31–50`
- `50+`

**Validation:** Both required. `Performance / commission-based` triggers a soft warning ("agencies on pure perf are a different beast — audit will be lighter on margin, heavier on capacity").

---

### Step 4 — Tech stack

**Eyebrow:** `4 / 7 · STACK`

**Question (H2):**
`What's running inside the agency?`

**Helper text:**
`Pick anything your team touches weekly. I'll spot the integration gaps where time and money fall through the cracks.`

**Why this matters block:**
`Most agency leaks live at the seams between tools — Stripe doesn't tell HubSpot a client is late, Harvest doesn't tell ClickUp you've billed 14 of your 12 budgeted hours. The more I know about the stack, the sharper the leak map.`

**Options (multi-select, no per-vertical sub-renders — keep it flat for speed):**
- CRM: `HubSpot · Pipedrive · Salesforce · GoHighLevel`
- Project / PM: `ClickUp · Asana · Monday · Notion · Trello`
- Time tracking: `Harvest · Toggl · Clockify`
- Finance: `Stripe · QuickBooks · Xero`
- Ad platforms: `Meta Ads · Google Ads · TikTok Ads`
- SEO: `Ahrefs · SEMrush · Google Search Console`
- Analytics / reporting: `Google Analytics · Looker Studio · Supermetrics · AgencyAnalytics`
- Comms: `Slack · Loom · Calendly`
- Other tool *(text input, optional, max 60 chars)*

**Validation:** At least 2 tools selected, OR the "Other" field has 3+ chars. Don't gate on 4+ (the Tier-1 hard criterion) — let the model handle the soft-disqualifier in the report. Hard-gating here costs more in dropoff than it earns in lead quality.

---

### Step 5 — The acute trigger

**Eyebrow:** `5 / 7 · THE TRIGGER`

**Question (H2):**
`What's actually hurting right now?`

**Helper text:**
`Pick the one that's most true today. This is what I'll anchor the dollar estimate against.`

**Why this matters block:**
`Every $1M–$5M agency has a leak. The one that's bleeding *right now* is the one I can put a real number on. The other ones go in the follow-up list.`

**Options (single-select — these are the four Tier-1 acute triggers from `icp-customer-research.md` §3):**
- `A client just went unprofitable and I caught it too late`
- `I'm running a layoff — or about to`
- `I'm paying (or thinking about paying) a fractional COO $5K–$15K/month`
- `Revenue's growing but the bank balance isn't`
- `None of the above — I'm just curious`

**Validation:** One option required. "None of the above" continues the flow but flags the lead as low-intent in the funnel event (`metadata.trigger = 'curious'`).

*(This step replaces FOUR live steps — operations state, failure modes, hours lost, and frequency. They were all asking the same question through different doors: "how bad is it?" One direct question gets a better answer than four indirect ones.)*

---

### Step 6 — The top operational drag

**Eyebrow:** `6 / 7 · YOUR WORDS`

**Question (H2):**
`In one paragraph — what's the one thing that, if it broke today, would cost you the most?`

**Helper text:**
`Be specific. The more concrete the answer, the sharper the report. Name the process, the people, the tools, the cost — anything you'd say to a peer.`

**Why this matters block:**
`This is the only open-ended question I'll ask you. It's also the most important — it's where I find the leak the multi-choice questions don't see. One paragraph is enough.`

**Input:** Single textarea, 5 rows, 20-char minimum, 1000-char soft max. Placeholder text adaptive to Step 1 answer:

| Step 1 selection | Placeholder |
|---|---|
| Paid media | `e.g. Monthly client reports — 8 hours every Sunday stitching Meta + Google + Klaviyo. Two clients have churned in 90 days citing "reporting opacity."` |
| SEO / content | `e.g. Rank rollups — pasting Ahrefs into Google Docs every Monday. AI Overview tracking is fully manual. We've lost 3 keywords we wouldn't have caught for weeks.` |
| Social media management | `e.g. Approvals — clients DM the strategist directly, posts go out without sign-off, two retainers in the last quarter ended in "you posted the wrong thing."` |
| Full-service digital | `e.g. Status updates — PMs rewrite the same info across HubSpot, ClickUp, and Slack for every client. ~6 hours per PM per week. Nothing is the source of truth.` |

**Validation:** 20-char minimum.

---

### Step 7 — Email capture + 20-min call CTA

**Eyebrow:** `7 / 7 · WHERE TO SEND IT`

**Question (H2):**
`Where should I send your leak report?`

**Helper text:**
`Your report — with the dollar estimate, the top 3 places to plug it, and the next step — lands in your inbox in about 5 minutes. No list, no spam.`

**Why this matters block:** *(omit on this step — replaced with the handoff block below)*

**Fields:**
- `Your name` *(required)*
- `Work email` *(required, validated)* — micro-helper: `Used only to send your report.`
- `Agency name` *(required)*
- `Agency website` *(optional)* — micro-helper: `If you share it, I'll tailor the diagnosis to your actual services and stack. Optional — leave blank if you'd rather not.`

**The handoff block (new — replaces the live "Run My Diagnosis" final state):**

> **Primary CTA:** `Email me the report`
>
> **Below the CTA, a single-line offer:**
> `Or — book a 20-min call with the founder and we'll walk through it together.`
> *(Link opens the same Calendly used on `/` and `/pricing` — strategy says 20 min, not 30.)*
>
> **Below that — what happens next:**
> `→ Report in your inbox in ~5 minutes.`
> `→ If the leak's > $30K, expect a short note from Lawand within 24 hours offering to talk it through.`
> `→ No autoresponder sequence. No list. One follow-up max if you don't book.`

**Validation:** Name + valid email + agency name required. Website optional.

---

## Step 1 disqualifier flow — the graceful exit

> **The full flow when a user picks "Not a agency — show me what OpsRadar does anyway."**

### Screen 1 (replaces the rest of the funnel)

**Eyebrow:** `OPSRADAR IS FOR SERVICE BUSINESSES THAT BILL FOR CLIENT TIME`

**H2:**
`Honest answer: OpsRadar's not built for you yet.`

**Body (first-person, AI COO voice):**
`I'm the AI COO for agencies. Every benchmark I use, every alert I write, and every recommendation I make is calibrated against agencies running paid media, SEO, social, or full-service work. If I ran the audit on you, the numbers would be wrong in ways I wouldn't catch — and I'd rather not waste your 3 minutes pretending otherwise.`

`If that changes — if OpsRadar adds your vertical, or if you start a marketing arm — I'll let you know.`

**Below — single email-capture field, soft ask:**
- Label: `Want a heads-up when we expand?`
- Input: `you@yourcompany.com` *(optional)*
- CTA: `Tell me when it's ready`
- Microcopy below CTA: `One email when we ship. No list, no spam. Skip if you'd rather not.`

**Two link-style exits at the bottom (no emphasis):**
- `→ See what OpsRadar does for agencies` *(routes to `/`)*
- `→ Read the strategy doc instead` *(routes to `/about` or a public-facing strategy summary)*

### What this captures

- Email goes to a **separate Supabase table** (`disqualified_leads`) — not the main audit lead list.
- Nurture sequence: **one email only**, sent when OpsRadar ships a non-marketing vertical (probably never in the first 12 months — but the option is preserved).
- The lead is *never* routed to the main audit followup sequence, the cold email sequence, or the demo Calendly. Polite exit means polite exit.

*(The disqualifier costs us some email captures vs. the current "Other -> run the audit anyway" flow. That's the trade for this agency-specific funnel: tier-1 conversion velocity over total list size. Current company strategy is broader, so non-agency service-business leads should route to a separate waitlist or broad audit once that funnel exists.)*

---

## Final-step / Submission screen (post-submit, before email arrives)

> **The screen the user sees the moment they hit "Email me the report." Replaces the live spinner + "Analyzing your tech stack…" sequence.**

### State A — Loading (15–30 seconds)

**Wordmark top-left (unchanged).**

**Center stack:**
1. A minimal spinner (existing component is fine).
2. Rotating status lines, in first person:
   - `Running the leak math on your stack…`
   - `Checking which clients fit the overservicing pattern…`
   - `Pulling the agency benchmark for your band…`
   - `Writing your report…`
3. Below the lines: `~20 seconds. Don't close the tab.`

### State B — Sent (after the API returns)

**Eyebrow:** `REPORT SENT`

**H1 (large, serif):**
`Your leak report is in your inbox.`

**Subhead (28 words, single sentence):**
`Conservative estimate of what's leaking this year, the top 3 places to plug it, and one next step. Check {{lead.email}} in the next few minutes.`

**The dollar promise repeated (callout box, amber accent — matches the OG image alert styling):**
> `Your estimated annual leak: $XX,XXX–$XX,XXX`
> *(Server-computed range pulled from the report. If the model declines to estimate, show: "Your estimate is in the email — I wanted to double-check the math before quoting it.")*

**Primary CTA (two-button row):**
- Left: `Book the 20-min walkthrough` *(opens Calendly inline modal)*
- Right: `Wait for the email instead` *(no action — sets a localStorage flag and dismisses to `/`)*

**Below the CTAs, two trust lines:**
- `→ The call is with Lawand, the founder. No SDR, no pitch deck, no demo theatre.`
- `→ If we're not a fit, I'll tell you in the first 5 minutes.`
*(Switches voice from "I" (AI COO) to "we"/"Lawand" — the call is with the human, and the seam rule says we name that.)*

### Calendly embed copy

If the user clicks `Book the 20-min walkthrough`, the inline Calendly opens with this header strip above the embed:

> **Booking with Lawand · 20 minutes · No pitch**
> `We'll open your report on screen, walk the dollar estimate line by line, and answer the question you're actually here for: "is this real?" If the answer is no, you leave with the report and the math. If yes, we talk about what comes next.`

---

## What the post-audit email contains (briefing for dev)

The email is the moment the funnel either earns the call or doesn't. The audit found the live email contents weak; this brief is what replaces them.

**One paragraph for the dev:**

The email must (a) reproduce the dollar leak estimate prominently in the subject line and first 100 words, not buried in a PDF link; (b) summarize the top 3 leaks in plain language ("Acme is over scope by ~14 hours/month → ~$1.6K/month leak" — concrete, agency-named where possible, first-person AI COO voice); (c) include one teaser of what OpsRadar would *do* about it ("If you connected HubSpot + Harvest + Stripe, I'd alert you on the day Acme crosses the scope threshold — not 60 days late"); (d) close with the **single** next-step CTA: a 20-min call with the founder, Calendly link, with the same trust microcopy as the post-submit screen (`No pitch · No slides · If it's not a fit I'll tell you in the first 5 min`); (e) one follow-up email max if no booking in 48 hours — that email's job is to re-state the dollar number, nothing else; (f) no auto-resubscribe to a newsletter, no "more resources" cross-sells, no logos, no banners. Plain text feels truer than HTML chrome at this stage.

**Subject line for v1 send:** `Your agency is leaking ~$XX,XXX this year — here's where`
**Subject line for the one follow-up:** `RE: your $XX,XXX leak (one quick line)`

---

## Site-wide considerations this enforces

| Decision | What it means site-wide |
|---|---|
| **7 steps, not 13** | The "3-minute audit" claim — repeated on `/`, `/for/paid-media`, `/for/seo`, `/services` — finally becomes true. Honor it on every page that mentions the audit. |
| **ICP-only disqualifier upfront** | Every page that links into `/audit` should pre-qualify in the link copy too. Replace generic "Try the 3-minute audit" with "Free 3-min audit for agencies $1M–$5M." |
| **Dollar promise replaces "Free · Results"** | The trust line `Free · Results in your inbox in 5 minutes · Built for agencies $1M–$5M` should appear on every CTA that links to `/audit`. The dollar range `$30K–$80K` appears anywhere we want to *sell* the audit (homepage CTA, /for pages, OG cards) — not on the audit page itself (where it's the H1). |
| **AI COO category language** | The audit page uses the words "AI COO" once in the eyebrow, then disappears into first-person "I" voice for the duration of the funnel. The category lives in the framing; the voice does the work. |
| **20-min call (not 30)** | Resolves the live-site audit's flagged inconsistency. The audit's secondary CTA, the post-submit screen, the email, and the Calendly embed all say 20. |
| **Founder-named call** | "Book a call with the founder" / "with Lawand." No more plural "founders" — we have one founder doing demos. |

---

## Risk flags

### 1. The "3-minute" claim — is it actually 3 minutes at 7 steps?

**Mental timing of the new flow:**
- Step 1 (agency type, one click): ~5s
- Step 2 (revenue + team size, two clicks): ~10s
- Step 3 (retainer share + clients, two clicks): ~10s
- Step 4 (tech stack, multi-select, ~5 picks): ~30s
- Step 5 (acute trigger, one click): ~10s
- Step 6 (textarea, one paragraph): **~60–90s** *(the only real time sink)*
- Step 7 (email capture, 3 fields): ~20s
- **Total: ~2:25–2:55.**

Verdict: 3-minute claim holds at 7 steps if Step 6's placeholder is good enough to anchor the paragraph fast. If users routinely take 2+ minutes on Step 6, the claim is *technically* true but feels slow. Mitigation: track p50 completion time in funnel events; if median creeps over 3:30, shorten Step 6 to a 2-sentence guideline ("one or two sentences is enough — I'll fill in the rest") instead of "one paragraph."

### 2. The disqualifier costs email captures

The current funnel accepts Recruiting / Design / Dev / PR / E-commerce and runs the audit anyway. Those are probably **15–30% of total completions today.** The new flow routes them to a graceful exit with a soft email ask.

**Expected impact:**
- **Total audit completions:** down 15–30%.
- **Downstream booked-call conversion:** up — because every audit completion is now an ICP-fit lead, and the call CTA on the post-submit screen finally lands on a qualified user. Strategy says the call is the conversion event, not the audit.
- **Email list quality:** materially better. Cold-email playbook benefits directly — fewer "why are you emailing me about agency margin, I run a dev shop" responses.

If founder wants to preserve total list size, the fallback is to keep the disqualifier flow but **not** restrict the soft email-capture on Screen 1 — capture every disqualified lead into the separate table, and revisit in 6 months when verticalization is a roadmap question.

### 3. First-person "I" needs founder sign-off

This document recommends first-person "I" inside the audit funnel + audit email + audit report on `/results`, and "we" everywhere else. The seam is real and load-bearing.

**Argument for:** Distinctive, category-coherent, unowned by competitors, matches what Persona A says he wants ("someone to tell me").
**Argument against:** Some founders will read it as "AI larping as a person" and be turned off. The seam between "I" and "we" requires care in the email template — if the call CTA in the email switches voice clumsily, it reads broken.

**Decision needed before this ships:** Lawand to sign off on the seam rule. If "no" — fall back to "we" throughout, but the recommendation stands.

### 4. Cutting the cost-of-inaction + desired-outcome textareas

These two textareas are currently doing real work for the *generated audit's emotional grip* — they're where the model gets the user's own words about consequences and relief. Cutting them tightens the funnel but risks a less-personal report.

**Mitigation:** Step 6 (the top operational drag) is now the *only* free-text step, and it's positioned to absorb the emotional content the cut steps used to capture. The placeholder is engineered to invite consequence language ("two clients have churned in 90 days citing reporting opacity"). If reports start feeling generic, the fallback is to expand Step 6's prompt to: *"What's the one thing that, if it broke today, would cost you the most — and what has it already cost?"* — one question, two answers, no new step.

---

*End of doc. Next action: dev to scope the rebuild against `src/app/audit/page.tsx` (currently 1254 lines, 13-step flow, hardcoded `TOTAL_STEPS = 13`). The dynamic per-vertical tool re-render in Step 4 of the current file is a notable cleanup target — the new flow runs a flat multi-select.*
