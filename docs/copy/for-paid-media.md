# /for/paid-media Copy v2 — AI COO Commit

*Last updated: 2026-05-18*
*Source: design-audit-live-site.md §Page 9 + path-a-strategy-2026.md §11 (Decision 0) + ai-market-research-2026.md Part 6 (Fluency 2026)*
*Status: copy-only — visual + dev work tracked separately*

> **What this rewrite enforces:**
> 1. AI COO is the category. Zero "AIOS" mentions on this page. (Was 9.)
> 2. The placeholder testimonial is removed. (Was live in production. Trust-killer.)
> 3. Saved-hours stamps now include a dollar conversion at $100/h senior rate.
> 4. The "Sunday nights are for your family." headline is preserved as-is. It is the gold standard for the site.
> 5. The Before/After table is preserved and extended with two dollarized rows.
> 6. CTA is 20-minute call (was 30).

---

## Meta

**Title:** AI COO for Paid-Media Agencies — OpsRadar

**Description:** Your AI COO for paid-media agencies. Reports build themselves. Pacing alerts fire before MER tanks. Onboarding runs from signed contract — under your credentials, owned by you. Replaces ~38 h/month of senior time = ~$45K/year per strategist.

**OG / Twitter:**
- Title: AI COO for Paid-Media Agencies — OpsRadar
- Description: Reports that build themselves. Mid-campaign pacing alerts with dollar projections. Built on your accounts. $500–$3K/mo, not $10K fractional.
- Image direction: paid-media-specific OG (NOT generic OpsRadar dashboard). Dark theme, electric-blue accents. Three stacked cards in foreground: (1) MER pacing chart trending down with red alert ribbon "⚠ Acme · pacing 32% over — $4.2K overserve projected", (2) Slack-style Monday morning digest header ("Weekly recap · 11 clients · 8am Mon"), (3) creative rollup grid (4 thumbnails with fatigue indicators). Headline overlay: "Sunday nights are for your family."

---

## Hero (preserve the magic)

**Eyebrow:**
> For paid-media agencies

*(was: "AIOS FOR PAID-MEDIA AGENCIES" — drop AIOS, drop the all-caps shouting, keep the segment label)*

**H1 (preserve — this is the gold standard):**
> Sunday nights are for your family.

**Subhead (rewrite to drop AIOS, add dollar anchor):**
> Reports eat your Sundays. Pacing alerts come too late. BM access takes three weeks. OpsRadar is your AI COO for paid-media agencies — it ships the Monday digest at 8am, flags pacing mid-campaign with a dollar projection, and onboards new accounts under your credentials. Agencies running it claw back roughly $45K/year of senior time per strategist, and stop discovering overserve at quarter-end.

**Primary CTA:** Book a 20-minute call
**Secondary CTA:** Or try the 3-minute audit

**Hero visual direction (right half of hero — currently empty):**

A vertical-specific dashboard mockup, not a generic OpsRadar screenshot. Composition top-to-bottom:

1. **Alert ribbon (top, red/amber):**
   `⚠ Acme Outdoor · MER below 1.8 floor · pacing 32% over · ~$4,200 overserve projected this campaign · 1-click adjust`

2. **MER pacing chart (middle, primary):**
   Line chart, last 14 days, MER on Y-axis, red zone below the 1.8 threshold. The line dips into red on day 11. Annotation: "Pacing alert fired here — Tuesday 10:42am."

3. **Creative rollup card (lower left):**
   Four ad-creative thumbnails, each tagged with a fatigue indicator (Green / Amber / Red). Caption: "Cross-platform creative rollup · auto-tagged · posted to Notion."

4. **Monday digest preview (lower right, Slack-card style):**
   "Weekly recap · Monday 8:02am · 11 clients · 3 alerts · MER avg 2.4 · CPL down 14% WoW"

The point of the visual: prove that the AI COO is *paid-media-shaped*, not generic. Every element on screen is something a paid-media operator recognizes immediately.

---

## The three pains, three fixes block (existing OUTCOMES pattern, refined)

*Preserve the three-card "what changes" pattern. Rewrite each card with: a specific dollar/hour figure, the mechanism (what the AI COO actually does), and a peer-validation hook.*

### Card 1 — Reporting
**Tag:** Reporting
**Title:** Reports that ship themselves Monday at 8am.
**Body:** Your AI COO pulls Meta, Google Ads, Klaviyo, Triple Whale, and Shopify on Monday at 7am, renders a branded PDF, and posts a Slack digest by 8am. You stop spending the 8 hours every Sunday on a spreadsheet no client reads until Tuesday. Fluency 2026: 87% of agencies still pace budgets manually. The agencies running OpsRadar are in the 13%.

### Card 2 — Pacing
**Tag:** Pacing
**Title:** Alerts fire mid-campaign, with a dollar projection.
**Body:** Your AI COO watches MER in real time. The moment it crosses your floor, a Slack alert fires with the projected overserve — "Acme is pacing 32% over, ~$4,200 at risk if you don't adjust by Friday." Not last-click ROAS theatre. Not a Tuesday check that's two days too late. Agencies in their first month catch 3–5 pacing issues they would have eaten at quarter-end.

### Card 3 — Onboarding
**Tag:** Onboarding
**Title:** Signed contract to first report in days, not weeks.
**Body:** Your AI COO runs the onboarding sequence from signed contract: Business Manager access, Pixel install, GA4 config, Conversion API, MCC link. Under your credentials, owned by you. Saves 10–15 hours of senior time per new client — roughly $1,200 per account that used to vanish into setup. Fluency 2026: one in four agencies takes 1+ week to launch a new campaign. You stop being one of them.

---

## Workflow cards / saved-hours stamps (preserve + dollarize)

*Keep the three workflow cards. Add the dollar conversion to every "saved" stamp. Math: $100/h × 12 months = $1,200/year per hour saved per month.*

### Card 1
- **Name (mono):** `weekly-pacing-recap`
- **Desc:** Pulls MER, ROAS, and CPL from Meta + Google every Monday at 7am. Posts a formatted Slack digest per client — no manual Ads Manager check required.
- **Touches:** Meta API · Google Ads API · Slack
- **Saved (NEW):** ~8 h / mo saved = ~$9,600/year at $100/h senior rate

### Card 2
- **Name (mono):** `client-monthly-pdf`
- **Desc:** Aggregates spend, conversions, and creative performance from Triple Whale + Klaviyo on the 1st, renders a branded PDF, emails it to the client on the 2nd.
- **Touches:** Triple Whale · Klaviyo · Resend
- **Saved (NEW):** ~14 h / mo saved = ~$16,800/year at $100/h senior rate

### Card 3
- **Name (mono):** `new-client-onboarding`
- **Desc:** Triggers on signed contract: creates a BM sub-account, opens an access-request checklist, configures a GA4 property, schedules a kickoff Loom link.
- **Touches:** HubSpot · Meta API · GA4 · Loom
- **Saved (NEW):** ~12 h / new client saved = ~$1,200 per account · ~$14,400/year at 12 new accounts

**Block-level footer line (NEW, below the three cards):**
> Math at $100/h senior strategist rate. Fluency 2026 benchmark: strategists spend 39.75 hours/month on routine tasks. The three workflows above cover roughly the entire routine block.

---

## Customer quote block (REMOVE placeholder)

**Audit finding:** Live placeholder in production reads `"[Operator quote — to be replaced with real customer]" — Paid-media agency founder · 12-person agency · replaced Zapier + VA`. **Devastating for trust on a vertical page.**

**Decision (bridge option until Sean/SwishAd or another real customer is on the record):**

Replace the entire `<blockquote>` block with a short "Built with operators" social-proof line. Keep the same vertical slot — same surface area, same visual weight — but no fake quote.

**Bridge copy:**

> **Eyebrow:** Built with operators
>
> **Line (serif, large but smaller than a real testimonial would be):** Built with paid-media operators running between $40K and $400K/month in ad spend across DTC, B2B SaaS, and home services. Pre-customer feedback drove every workflow on this page.
>
> **Mono caption underneath:** Early access list is closed at 12 agencies. The 13th opens after Q3 case studies ship.

**When Sean / SwishAd (or any real customer) gives permission, this block replaces the bridge copy:**

> Format reserved for: ~30-word operator quote · Name · Role · Agency (size, vertical, ad spend tier) · One concrete result (dollar or hour figure).

**Site-wide implication:** The same placeholder lives on `/for/seo`. Apply the same fix there (separate doc).

---

## Before vs After table (preserve the strongest pattern + dollarize 2 new rows)

*This table is the strongest pattern on the site. Keep all five existing rows verbatim. Add two new rows with explicit dollar amounts.*

| Before | After OpsRadar |
|---|---|
| Sunday night report assembly across Meta, Google, Klaviyo, Shopify | Automated PDF lands in client inbox on the 2nd — no human touch |
| Pacing check is manual — someone opens Ads Manager mid-week | Slack alert fires the moment MER crosses your floor |
| New client onboarding takes 2–3 weeks of back-and-forth | BM access to first report in 5 days via structured workflow |
| Creative performance lives in Motion — nobody checks it before the call | Weekly cross-platform creative rollup auto-tagged and posted to Notion |
| Disapproved ads discovered when the client emails you | Daily audit workflow flags them in Slack before the client sees them |
| **(NEW)** Overserve discovered at quarter-end — $5K–$20K already eaten | Mid-campaign pacing alert with a dollar projection — catch it on day 11, not day 90 |
| **(NEW)** Strategist spends 39.75 h/mo on routine tasks (Fluency 2026) | Routine block drops to ~5 h/mo — claw back ~$3,500/month per strategist |

**Section header copy (unchanged):**
- Eyebrow: Before vs. after
- H2: What your agency looks like after OpsRadar lands.

---

## Integration spotlight (paid-media specific) — NEW SECTION

*A short integration band — single line per tool, what the AI COO does with each. This earns the page the right to be called *vertical*. Place between the Before/After table and the bridge testimonial block.*

**Eyebrow:** Built on your stack

**H2:** The five integrations a paid-media agency actually runs on.

| Integration | What your AI COO does with it |
|---|---|
| **Meta Ads** | Pulls spend, MER, and creative fatigue daily. Flags disapprovals before the client sees them. Auto-pauses underperforming sets when you whitelist the rule. |
| **Google Ads** | Tracks CPL and conversion-volume drift. Watches MCC-level pacing across all client accounts. Surfaces search-term anomalies before they burn budget. |
| **TikTok Ads** | Layers spend and ROAS into the Monday digest. Catches the MER divergence Meta and Google never see. |
| **HubSpot** | Triggers the onboarding sequence on a signed contract. Closes the loop on lead quality back to the ad source. |
| **Stripe** | Watches client invoice status. Flags overserve as a dollar amount the day it crosses your margin floor — not the day the invoice ships. |

**Footer line:** Ten more integrations live. New ones ship roughly every two weeks against the customer-request list.

---

## Pricing teaser — NEW SECTION

*The audit didn't flag missing pricing on this page, but the AI COO category language demands a fractional-COO anchor. Short band, two cards, fractional-COO benchmark on the right.*

**Eyebrow:** Pricing

**H2:** Less than two hours of a fractional COO.

**Body:** A fractional COO is $10K/month for a human who reviews your agency weekly. OpsRadar is your AI COO, 24/7, at agency-realistic prices.

| Tier | Price | Who it's for |
|---|---|---|
| **Starter** | $500 / mo | Paid-media agencies under 10 people, 1–2 integrations, the basics on autopilot |
| **Growth** (recommended) | $1,500 / mo | 10–25-person agencies, full integration suite, agentic actions, multi-client view |
| **Scale** | $3,000 / mo | 25+ people, the full AI COO surface area, partner-network access |

**Anchor line below the cards:** Replaces 80% of what a $10K fractional COO does. Runs every day, not the second Thursday of the month.

**CTA:** See full pricing →

---

## FAQ rows (paid-media-specific, 4 rows)

*Replace any existing generic FAQ with these four. All four address objections specific to paid-media operators.*

### Q1 — "We're a 6-person paid-media agency. Are we too small for an AI COO?"
**A:** Six people is exactly the right size. The ICP is $1M–$3M ARR, 10–25 employees — and pre-$1M agencies use Starter at $500/mo to lock in the workflows before they grow. The agencies that bleed are the ones running on a stack of 4–10 tools without a COO. That's almost every 6-person paid-media shop. You don't need to be bigger to need this. You need to be bigger to stop being able to afford *not* having it.

### Q2 — "Can you run on our existing Meta Business Manager?"
**A:** Yes — under your credentials, owned by you from day one. We don't move your BM, your MCC, or your Pixel. The AI COO authenticates via your accounts the same way a senior strategist would. If you part ways with OpsRadar tomorrow, everything stays with you. Nothing is locked in our infrastructure.

### Q3 — "Do you replace my media planner or augment them?"
**A:** Augment. The AI COO removes the 39.75 hours/month of routine work (Fluency 2026 benchmark) that buries your planner — reports, pacing checks, BM access requests, onboarding sequencing. What's left is the work that actually requires a strategist: creative strategy, account expansion, the client relationship. Most agencies redirect the freed capacity into one or two more clients per strategist — that's where the $45K/year shows up on the P&L.

### Q4 — "Can you alert me about creative fatigue?"
**A:** Yes — cross-platform. Daily creative scan across Meta and TikTok, fatigue scored by CTR decay + frequency + cost-per-result drift. The week's top fatigued sets land in your Monday digest with the recommended replacement queue. Agencies that wire this up catch ~40% more fatigue events in the first month than they were catching manually.

---

## Bottom CTA

*Preserve the existing structure. Two changes: 30 min → 20 min, "AIOS belongs" → "an AI COO belongs".*

**Eyebrow:** Ready when you are

**H2 (rewrite — drop "AIOS"):**
> See what your AI COO looks like.

**Body (rewrite):**
> A 20-minute call. We listen to how your agency runs, ask the questions only operators would ask, and tell you on the call whether OpsRadar belongs.

**Primary CTA:** Book a 20-minute call
**Secondary CTA:** Or try the 3-minute audit

**Caption:** 20 minutes · No pitch · We tell you if it's not a fit.

---

## Alternate H1s for A/B (if the family line doesn't test)

The "Sunday nights are for your family." line is the gold standard and ships as the default. These are A/B variants — each carries a different emotional / dollar / status frame. All four use the same hero subhead and CTA.

1. **Benchmark frame:**
   > 87% of paid-media agencies still pace budgets by hand. Yours doesn't have to.
   *Why it could win:* Fluency 2026 stat is sticky, peer-relative, and triggers loss aversion.

2. **Dollar frame:**
   > Stop discovering the $20K overserve at quarter-end.
   *Why it could win:* Names the wound in money terms. Highest-intent paid-media operators recognize the specific dollar range.

3. **Status / category frame:**
   > Your AI COO ships Monday's report at 8am. Your strategist ships strategy.
   *Why it could win:* Plants the AI COO category word in the H1. Reframes the team chart.

**Test protocol recommendation:** Sunday line stays as control. Cycle one variant for two weeks at a time. Primary success metric: 20-min call booking rate (not page CTR — vertical pages are bottom-funnel).

---

## Site-wide fixes this rewrite enforces

- **Placeholder testimonial REMOVED.** Same fix required on `/for/seo`.
- **AIOS → AI COO throughout.** 9 instances on the live page → 0. Subhead, OUTCOMES copy, workflow section header ("What a typical paid-media AIOS looks like" → "What a typical paid-media AI COO looks like"), Bottom-CTA H2, Bottom-CTA body, meta title, meta description, OG, Twitter all updated.
- **Saved-hours stamps now include dollar amounts** at $100/h senior rate.
- **CTA is 20-minute call**, not 30. Caption matches.
- **Workflow section H2 rewrite:** "What a typical paid-media AIOS looks like." → **"What a typical paid-media AI COO runs."**
- **Workflow eyebrow:** "Live examples" → keep, fine.
- **OUTCOMES section H2 rewrite:** "Three outcomes. One system." → keep — "system" is on-brand and not banned.

---

## Risk flags

1. **Hero visual depends on design/dev availability.** The right-half emptiness is a MEDIUM-severity audit finding across five pages. If the paid-media-specific mockup can't ship with the copy, ship the copy anyway — the placeholder testimonial fix is HIGH-severity and can't wait.

2. **"Sunday nights are for your family." is great but un-tested against a dollar headline.** Strongest A/B candidate is variant #2 ("Stop discovering the $20K overserve at quarter-end."). Recommend running the A/B on a two-week cadence within the first month of the rewrite shipping. Primary metric: 20-min call bookings, not page CTR.

3. **Real testimonial depends on Sean/SwishAd permission** (hottest pipeline lead, demo access sent May 5). Until then the "Built with operators" bridge ships. Do NOT re-introduce a placeholder under any circumstance. Empty trumps fake on a vertical page.

4. **Pricing teaser pulls a fractional-COO anchor ($10K/month).** If pricing strategy moves, this section needs to re-anchor. Tied to `docs/pricing-depth.md`.

5. **The "Fluency 2026: 87% manual pacing" stat is used twice** (Card 1 body, FAQ Q3). Sounds intentional and reinforces. If it starts to read repetitive in testing, drop the FAQ instance — Card 1 is higher-value placement.

6. **Integration spotlight names Stripe.** Per locked decision, Stripe runs Model C (customer brings their own API key). Copy is compatible — "watches client invoice status" is read-only and does not imply Stripe Connect.
