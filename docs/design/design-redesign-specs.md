# OpsRadar Page-by-Page Redesign Specs

*Authored 2026-05-18. Per-page specifications for the 10 marketing pages, derived from `docs/design-language-opsradar.md` and `docs/design-audit-live-site.md`.*

*Conventions:*
- *Component, token, and pattern names refer to `design-language-opsradar.md` §1–§8.*
- *Copy direction (tone, length, claim type) is specified but the actual copy is Wave 3's job.*
- *`[POSITIONING — pending user decision]` flags any spot where the AIOS-vs-AI-COO choice changes the copy.*

---

## / — Homepage

### Current State
A washed-out cream landing with a serif "The AI Operating System for agencies." H1, a 4-card stacked mockup collage on the right that has no clear hierarchy, no proof points above the fold, and fictional Acme demo numbers instead of benchmarks.

### Target State
The high-stakes Proof Hero (§5.3 Variant A). The page reads as **operator-built instrumentation**: a single live-ticker eyebrow above an outcome-led headline, a single product mockup (the OpsRadar alert card), a Mercury-style thesis billboard, a Linear-style metronomic capability rhythm, and a closing founder block. Visual register: **Mercury-warm body + Ramp-numerical proof + Linear-restrained section grammar**. The visitor leaves with a number in their head ("$1.2M recovered this quarter") and a face in their head (the founder block in the footer).

### Section-by-section spec

**1. Top nav** (sticky)
- §5.11 spec. 64px height, hairline divider on scroll. 5 items + Sign in + primary pill "Book a demo." Add `/pricing` to nav (currently missing — single biggest fix).
- Inspiration: Linear nav grammar + Vercel active-state pill.

**2. Hero — Proof Hero (Variant A)**
- Section uses `--paper-0` `#FBFAF7` background; 120px top padding; hairline-divider above the body opens the page.
- **Eyebrow:** the Live Margin Ticker (§7 Pattern 1). `AGENCY MARGIN RECOVERED THIS QUARTER · $1,247,830 · +$47/sec`. Static placeholder data until Supabase aggregate exists.
- **H1:** 56px / weight 480 / `-0.025em` letter-spacing / 2 lines max / ends with period. [POSITIONING — pending user decision] Direction: a *specific number + outcome verb + JTBD* construction (Ramp compound-imperative formula). Tone: founder-to-founder. Avoid banned words ("platform", "dashboard", "n8n").
- **Sub-paragraph:** 21px lead, max-width 540px, names 2 benchmarks (e.g., the 21.5% / 15–30% pair) — Vercel's "one-sentence product definition" pattern.
- **CTA pair:** PRIMARY pill "Book a demo" + SECONDARY pill "See the audit example" (per design-language §5.1). 12px gap. No arrows.
- **Trust line:** `20 minutes · No pitch · We tell you if it's not a fit` — micro at --text-small.
- **Hero composite (below CTAs):** ONE asset, not a 4-card collage. A single dark Alert Card mockup (§5.2, §7 Pattern 3) showing *"Acme is 23% over scope this month. 3 unbilled deliverables. Send invoice →"*, floating on a slim crosshair-lite frame, with the Notion 5-layer shadow. Width matches the `1280px` hero max.

**3. Thesis Billboard** (Mercury pattern)
- Section: 160px vertical padding, single 42px H2 spanning the centered column, no body, no image.
- Direction: a triple-anchor + outcome clause sentence with three numbers and one outcome (Mercury "$0 monthly fees. $0 minimums. $0 USD wires. So your business can do more." rhythm). Example shape: *"15–30% margin leaks. 30–90 day detection lag. $10K/month fractional COO. The math is broken."*

**4. Capability rhythm — 4-up `[h2 left · alert mockup right · 3 bullets]`** (Linear metronomic pattern)
- 4 sections, each ~640px tall, identical rhythm so the eye knows where to land.
- Each section eyebrow in `--text-eyebrow` uppercase: `OPERATE · OBSERVE · BRAIN · GUARD` (keeps the 173-mention installed vocabulary). [POSITIONING — pending user decision]: if AIOS-vs-COO call drops the four-pillar branding, these become unlabeled benefit sections.
- Each H2 a verb-led complete sentence ending in period (Notion/Cursor rule). Length 4–6 words.
- Right column: an alert mockup or product UI snippet specific to that pillar (Margin · Utilization · Scope · Cash flow OR the four pillars depending on positioning).
- 3 bullets per section in `--text-body`, each starting with a verb, each containing a `<DollarStamp>` (§7 Pattern 2).

**5. Logo strip** (after the capability rhythm)
- §5.5 spec. Single greyscale row + intro line at --text-small --text-muted.
- **Until real customer logos exist:** *drop the logo strip entirely* and replace with a Mercury-style identity H2: *"Built for the 60% of sub-$5M agencies running ops in their head."* Cursor's lesson — fake logos kill trust harder than no logos.

**6. The "Meet OpsRadar" 3-step strip** (Lovable steal #4)
- 3 columns: Connect / Watch / Get the call before the crash.
- Each step: small icon (geometric, --radar-500 stroke), 4-word verb-noun H3, single sentence body.
- 80px between this section and the next.

**7. Single dark band — "Connects to your stack"** (Stripe's one dark section)
- The single `--ink-2` `#0D1738` slab on the entire page. Sets context: "this is the technical/integration layer."
- Heading: "Connects to HubSpot, ClickUp, Harvest, Stripe + 6 more."
- Below: the 10 integration wordmarks in white at consistent height, horizontal row. Lovable-style hover scaling: 1 → 1.02 over 200ms.
- Below the logos: one sentence at --text-body in `rgba(255,255,255,0.75)` about read-only first, agentic with 30-min undo. Direction: name the safety net.

**8. Stat band** (Ramp stat-as-typography)
- 3 columns, each a `<StatBillboard>`:
  - $1,247,830 — *agency margin recovered this quarter*
  - 47 days → <24h — *detection lag, before / with OpsRadar*
  - $500 vs $10K — *OpsRadar vs the fractional COO you can't afford*
- Background: `--paper-1`. Numbers at --text-display 42px weight 500.

**9. Closing CTA band — "Ready to ___?"** (Lovable steal #7)
- Repeat the hero CTA pair, this time inside a card with the Founder Block (§7 Pattern 5) on the left and the CTA on the right.
- Direction: H2 a compound-imperative ("Stop running blind. Start seeing margin.") + founder photo + "Talk to the founder" CTA + microcopy *"No card. 20 minutes. Just the founder."* (PostHog steal #2, adapted).

**10. Footer**
- §5.11 footer spec. Dark `--ink-0`. Tagline rewrite [POSITIONING — pending]. "Spotted a typo? Email the founder →" lower-right.

### 3 specific changes the dev should make this week
1. **Replace the right-side 4-card stack with a single Alert Card mockup** (§5.2 spec) showing `"Acme is 23% over scope this month. 3 unbilled deliverables. Send invoice →"`. Use the Notion 5-layer shadow recipe and 12px radius. Drop the rest of the stack.
2. **Replace the hero CTAs with the pill PRIMARY + SECONDARY pair from `design-language §5.1`** — `bg: var(--radar-500)`, `border-radius: 9999px`, `padding: 12px 20px`, `transition: background-color 300ms cubic-bezier(0,0,0.2,1)`, no transform on hover. Drop the current rectangular Shadcn-default button shape site-wide.
3. **Add the Mercury-style identity H2 below the hero** ("Built for the 60% of sub-$5M agencies running ops in their head."). Drop any fake-logo or "trusted by" strip until real logos exist.

### Files to modify
- `src/app/page.tsx`
- `src/components/ui/responsive-hero-banner.tsx` (replace with new hero composite)
- `src/components/ui/button.tsx` (pill PRIMARY variant)
- `src/app/components/ToolLogos.tsx` (remove from above-fold; move to dark integration band)
- `src/app/components/RhythmBreak.tsx` (use for the thesis billboard slot)
- `src/app/components/BookCallButton.tsx` (rename to use the new pill spec)
- New: `src/components/marketing/live-margin-ticker.tsx`
- New: `src/components/marketing/alert-card.tsx`
- New: `src/components/marketing/dollar-stamp.tsx`
- New: `src/components/marketing/stat-billboard.tsx`
- New: `src/components/marketing/founder-block.tsx`

---

## /aios — Product Page

### Current State
A philosophy-lecture hero with a massive single-word "AIOS" wordmark and no visual, no CTA above the fold, OPERATE/OBSERVE/BRAIN/GUARD as a long vertical sequence rather than a 4-up grid, and a `100% AIOS / 0% COO` mention count. The worst hero on the site per the audit.

### Target State
The page becomes the **product canvas**. Hero is replaced with a 4-up pillar grid (or, [POSITIONING — pending] if AIOS branding is dropped, an outcome-grid). The page rhythm is Linear-metronomic — each pillar gets its own capability section with a screenshot, a verb-led H2, and 3 bullets. The page is positioned as **"This is what we ship"**, not **"This is the category"** — Mercury's lesson that category-claim language only works when paired with proof.

*Note on the AIOS-vs-COO decision:* this page's URL and content are most affected by the call. **The design spec is category-neutral.** If the call kills AIOS, the page renames to `/product` and the 4 pillars stay but are presented as "what the AI COO watches" instead of "the four parts of AIOS." Either way, the page architecture below works.

### Section-by-section spec

**1. Hero — Variant A (Proof Hero), 4-up below**
- §5.3 Variant A but with the hero composite replaced by a **4-up grid** taking the entire below-headline space.
- Each grid cell: pillar name (or pillar-equivalent outcome) at --text-h3, single icon (16px line stroke, --radar-500), one-line outcome at --text-body, link "Learn about [pillar] →" at --text-small in --radar-500.
- H1 direction: a 5-word verb-led category claim ending in period [POSITIONING — pending].
- Sub: 1 sentence, names the integration count and the "one place" framing (Vercel one-sentence product definition).
- Add CTA pair above the 4-up grid — `Book a demo` + `See the audit example`.

**2. Per-pillar capability sections (×4)**
- Linear metronomic rhythm. Each section ~720px tall. Eyebrow in --text-eyebrow uppercase, H2 verb-led complete sentence, 3 bullets, single product UI mockup on the right.
- The four sections use the Lovable color-token names mapped to function: OPERATE (`--paper-card`), OBSERVE (`--ink-0` with white-on-dark), BRAIN (`--paper-1`), GUARD (`--ink-2` deep navy). Alternating light/dark gives the page rhythm without illustrations.
- For each, the right column is a product UI screenshot of that pillar in action. If a real screenshot doesn't exist, use a high-fidelity HTML mock (Vercel "live in-product mock" pattern).

**3. BRAIN example queries section** (the audit-flagged strongest copy)
- Pull out of position #3 of the existing page and put it at the top of the BRAIN section, not buried.
- 3 example queries rendered as conversation-card mockups: real-looking question on top, real-looking answer below with a chart embedded.

**4. Before / After table** (§5.9, §7 Pattern 4)
- Two-column. "Before [product]" / "With [product]".
- 6 rows minimum, each with a dollar-or-hour stamp in the right margin.
- Header bg `--paper-1`, body alternating.

**5. Founder block + CTA band**
- Same closing rhythm as `/`.

### 3 specific changes the dev should make this week
1. **Replace the giant "AIOS" wordmark hero with a 4-up pillar grid.** Each cell follows the spec above; visitors should grasp the four parts in 3 seconds.
2. **Move the BRAIN example queries up to the top of their section** (currently 4 scrolls deep). Render the example queries as dark conversation-card mockups with the 5-layer shadow.
3. **Replace the long vertical OPERATE/OBSERVE/BRAIN/GUARD list with the Linear metronomic 4-section rhythm** — alternating light/dark backgrounds, each section the same height, each containing one screenshot mockup and 3 bullets with `<DollarStamp>` components.

### Files to modify
- `src/app/aios/page.tsx`
- Possibly rename to `src/app/product/page.tsx` with a 301 from `/aios` [POSITIONING — pending]
- `src/components/marketing/alert-card.tsx` (4 variants for the 4 pillars)
- New: `src/components/marketing/pillar-grid.tsx`
- New: `src/components/marketing/before-after-table.tsx`

---

## /how-it-works — Process Page

### Current State
The audit calls this "best-on-site copy." Step descriptions are concrete and direct ("We do not build AIOS for agencies we do not understand."). But the page is text-heavy stacked vertically with no horizontal stepper, no timeline labels (only Discovery says "about a week"), and no prices for Discovery/Blueprint/Build. CTAs only at bottom.

### Target State
Keep the strong copy. Add visual structure: a **horizontal 4-step stepper above the fold**, a real timeline on each step, prices on the paid engagements, and a **soft CTA at the end of each step section**. Visual register: Mercury editorial column for the body, with each step's right column carrying a concrete deliverable artifact (screenshot of a discovery doc, a blueprint PDF cover, a built workflow alert).

### Section-by-section spec

**1. Hero — Variant A (lighter version)**
- Eyebrow: `THE PROCESS`
- H1: a verb-led complete sentence about the journey, ≤8 words, ending in period.
- Sub: 1–2 sentences (Vercel-style declarative product definition for the *process*).
- Add a primary CTA "Book the first call" inline.

**2. Horizontal 4-step stepper** (above the fold, sticky on scroll)
- 4 pills in a row: `01 Call · 02 Discovery · 03 Blueprint · 04 Build`
- Each pill shows: step number, label, duration (`20 min · ~1 week · ~2 weeks · ongoing`), price stamp (`Free · $X · $X · subscription`).
- Pills are anchor-links to the section below. Active pill highlights with `--radar-500` underline.
- This is the single biggest visual change — it lets the buyer see the whole journey at a glance.

**3. Per-step long-form section (×4)**
- Same metronomic rhythm: H2 (verb-led, period), 2-paragraph body in `--text-body`, a "what you get" bullet list, an artifact mockup on the right.
- Each section ends with a **soft CTA**: `Ready for step [N]? Book the [next action] →` — internal link to Calendly or to the next step's anchor.
- Each section's right column: a real artifact (Discovery doc preview, Blueprint PDF cover, etc.). Reuse the audit's "Prepared by Dom · 04 May" PDF mockup pattern but with the Mercury card treatment.

**4. Pricing strip — "What each step costs"**
- A compact 4-column row of price stamps for Discovery / Blueprint / Build tiers, linking to `/pricing`.
- Discovery free, Blueprint $X (paid engagement per `pricing-depth.md`), Build subscription tiers.

**5. Founder block + closing CTA band**
- Same as `/`.

### 3 specific changes the dev should make this week
1. **Add a horizontal 4-step stepper above the fold** with step number, duration, and price-or-free stamp on each pill. Make the pills anchor links to the section below.
2. **Add a "Ready for step N? Book the [next action] →" soft CTA at the end of each step section.** Each soft CTA is a ghost-variant button (per design-language §5.1).
3. **Add a single price strip between section 3 and 4** ("Discovery: free · Blueprint: $X · Build: from $500/mo") linking each to the `/pricing` page.

### Files to modify
- `src/app/how-it-works/page.tsx`
- New: `src/components/marketing/process-stepper.tsx` (the horizontal sticky stepper)
- New: `src/components/marketing/artifact-mockup.tsx` (the reusable artifact card for each step's right column)
- Link cross-references from `/pricing`

---

## /services — Product / Deliverables Page

### Current State
Functionally a duplicate of `/aios` — same 4-pillar framework, same CTAs, same audience question. Uses monospace workflow names (`invoice-reminders`, `client-monthly-recap`) that signal "for developers." 100% AIOS framing. Title double-brand bug.

### Target State
**Merge into `/aios` (or `/product` post-positioning-call)** and 301 this URL. The audit's clearest recommendation: collapsing two weak pages into one strong one. If the merge isn't possible this sprint, the page becomes a **deliverables-focused supplement to `/aios`**: shows real screenshots of real workflows running, with human names instead of monospace identifiers, and a dollar stamp on every workflow.

### Section-by-section spec (if kept as a standalone page)

**1. Hero — Variant A**
- Eyebrow: `WHAT YOU GET`
- H1: a verb-led complete sentence about deliverables. Direction example: *"The work, automated. The decisions, surfaced."*
- Sub: positions this page as "what shows up after the Blueprint" — a downstream-of-`/how-it-works` page.

**2. Deliverables-list section**
- Replace the monospace workflow names with **human-readable names** (audit recommendation):
  - `invoice-reminders` → "Overdue-invoice follow-up"
  - `client-monthly-recap` → "Monthly client recap delivery"
  - `lead-router-v2` → "Inbound-lead router"
- Each deliverable is a card (--paper-card, 32px padding, 5-layer shadow):
  - Human name as H3
  - Single sentence describing the trigger and outcome
  - `<DollarStamp>` showing recovered hours-or-dollars
  - "See the workflow" anchor link to a deeper page (future)

**3. Before / After table** (§5.9)
- Same pattern as `/aios`, this time targeted at the *deliverables shape* not the *system shape*.

**4. Closing CTA band**

### 3 specific changes the dev should make this week
1. **Replace every monospace workflow name with a human name** (per audit recommendation). Apply across the page in a single pass.
2. **Add a `<DollarStamp>` next to every workflow** — the audit said "Without numbers, this is a feature list."
3. **Decide the merge:** open a ticket to merge `/services` into `/aios` (or `/product`) and 301 this URL. Until the merge ships, add a banner at the top of `/services` linking to `/aios` so the buyer doesn't get stranded between two cousin pages.

### Files to modify
- `src/app/services/page.tsx`
- `next.config.ts` (add the 301 once the merge ships)
- `src/components/marketing/dollar-stamp.tsx`

---

## /pricing — Pricing Page

### Current State
**HARD 404.** Orphaned from nav and footer. No internal links. The single highest-leverage broken page on the site.

### Target State
Ship a v0.1 pricing page **this week**. Three borderless cards on `--paper-1` (Mercury rule, no "Most popular" ribbon), middle tier keyword inline-colored `--radar-500`, the Notion twin-block move (Solo plain, Growth + Scale inside a `rgba(0,102,255,0.06)` container with its own H2). The Fractional Operator SKU appears as a fourth card or a band below the three. Visual register: **Mercury borderless pricing + Notion twin-block + Stripe shadow on the recommended card**.

### Section-by-section spec

**1. Hero — Variant A (single column, compact)**
- Eyebrow: `PRICING`
- H1: a two-clause balanced couplet (Ramp/Vercel pattern). Direction: *"See your margin. Stop the leak."* — promise + fear pair. [POSITIONING — pending].
- Sub: one sentence naming the entry price and the value-anchor. "Plans from $500/month. Replace what a fractional COO charges $10K to do."
- No CTA in hero — the cards are the CTA.

**2. Billing toggle**
- Pill segmented control: `Pay monthly | Pay annually (save 20%)` at radius 9999px. Inactive state in --paper-card, active in `--radar-500` fill.

**3. Three primary tier cards**
- Per design-language §5.7 spec. White on `--paper-1`, no borders, 32px padding, 24px gap.
- Tier 1 — **Solo** — $500/mo. "For the agency owner who is the ops team." 5 features. CTA pill "Book a demo for Solo."
- Tier 2 — **Growth** — $1,500/mo. The keyword "Growth" inline-colored `--radar-500`. Slightly elevated (translateY -8px + deeper shadow). "For agencies with a Head of Ops or Account Director." 7 features. CTA pill "Book a demo for Growth."
- Tier 3 — **Scale** — $3,000/mo. "For agencies with multi-client portfolios." 9 features. CTA pill "Book a demo for Scale."

**4. Twin-block separator + Fractional Operator SKU** (Notion pattern, adapted)
- Below the 3 cards, inside a pale-radar `rgba(0,102,255,0.06)` container with 80px padding, render the Fractional Operator SKU as a wider card:
  - Eyebrow `FOR FRACTIONAL COOs`
  - H2 "The COO multiplier."
  - $2,500 + $250/agency/month
  - 3-bullet value prop
  - CTA "Apply to the Fractional Operator program" (ghost variant linking to a future partner page)

**5. Payback proof band**
- A 3-stat row: "Average payback period: ~21 days · Average margin leak recovered: $X · Average detection lag improvement: 47d → <24h."
- Backs the price with proof (Linear-can-skip-this, OpsRadar-cannot lesson from the Linear teardown).

**6. Before / After cost table**
- Two-column: "Without OpsRadar" / "With OpsRadar" — fractional COO at $10K vs $1.5K, manual reporting at $30K/year wasted vs $0, etc.

**7. FAQ accordion** (Mercury 7–10 rows)
- Pull questions from `pricing-depth.md` objection bank.
- Default first 3 questions open (per audit fix).

**8. Founder block + closing CTA band**

### 3 specific changes the dev should make this week
1. **Ship the page.** Three tier cards (Mercury borderless spec) + Fractional Operator card below, on `--paper-1` page bg. No "Most popular" ribbon — the middle tier's name keyword in `--radar-500` is the entire visual hierarchy.
2. **Add `/pricing` to the nav** and the footer link grid. Add Calendly CTA labels parameterized by tier ("Book a demo for [Solo|Growth|Scale]").
3. **Populate the FAQ Pricing tab on `/faq`** with the objection-bank rows from `pricing-depth.md` (cross-referenced).

### Files to modify
- `src/app/pricing/page.tsx` (new content — currently 404)
- `src/components/ui/pricing-component.tsx` (extend or rebuild to the new spec)
- `src/components/ui/site-header.tsx` (add `/pricing` to nav)
- Footer component (add `/pricing`)
- `src/app/faq/page.tsx` (populate Pricing tab in parallel)

---

## /about — About Page

### Current State
**Worst trust page on the site.** No founder photo. No founder bio. "Founder" appears once — in a CTA. Lawand's name appears 0 times in body copy. Same headline as the homepage. Institutional "we" with no referent. The page reads as "we have a philosophy" rather than "here's who we are."

### Target State
**The founder is the page.** Variant C (Manifesto Hero) — the editorial register where serif is allowed. Founder photo + name + one sentence above the fold. A "why we built this" anecdote with a real number. A team block (even if it's just "Lawand + Dom + 2 contractors" — radical transparency).

### Section-by-section spec

**1. Hero — Variant C (Manifesto)**
- Eyebrow: `ABOUT`
- H1 in **NotoSerifDisplay** at 56px weight 400 (the one allowed serif page-pair: `/about` + `/method`). Direction: a single specific declarative sentence that distinguishes this page from `/` ("Built by an operator who watched agencies bleed margin for years.").
- Dek at --text-lead, 3 lines max.
- **No CTA above the fold** (Linear restraint earned by the manifesto register).

**2. Founder block** (§7 Pattern 5, full-page version)
- Two-column. Left: 320px photo of Lawand. Right: name + role + 2-paragraph bio + email + LinkedIn link.
- The bio uses first-person singular ("I spent X years inside Y agencies. I built this because Z."), not the homepage's collective "we."

**3. The origin story**
- 672px editorial column.
- A specific anecdote with a real number. Direction: "We watched an agency lose $40K in Q3 on a client they thought was profitable. That's when OpsRadar got built."
- Use the Mercury thesis-billboard pattern for the dollar amount — pull it out as a standalone H2 in the middle of the section.

**4. Team block**
- If team is small (and per `product-marketing.md` it is), embrace the smallness — PostHog's lesson. Direction: *"Six people. One product. The founder takes every call for the first 100 customers."*
- 4–6 small founder/team avatars at 64px, each with name + role.

**5. The "Why we built it" 3-up authority row** (Mercury press-row pattern adapted)
- 3 cards, each a fact:
  - "10 agency-stack integrations shipped"
  - "First product built for agency-vertical ops"
  - "Founder-led — Lawand onboards you personally"

**6. Closing CTA band**
- Per spec, with the founder block visible.

### 3 specific changes the dev should make this week
1. **Add the founder block above the fold** — Lawand photo (96px circle minimum), name, role ("Founder, OpsRadar"), one-sentence bio, email + LinkedIn link. Single biggest trust unlock on the site.
2. **Differentiate the headline from the homepage** — use the Manifesto serif H1 (NotoSerifDisplay, weight 400). Direction: a sentence that names the operator-built positioning.
3. **Add the $40K origin-story anecdote** with the dollar amount as a Mercury thesis-billboard H2 in the middle of the page.

### Files to modify
- `src/app/about/page.tsx`
- New: `src/components/marketing/founder-block.tsx` (used here at full-page size and in footers at slim size)
- Add photo asset to `public/` (Lawand portrait, retina, optimized)
- `src/app/fonts/` — confirm NotoSerifDisplay is loaded with the right weights

---

## /faq — FAQ Page

### Current State
4 visible questions (all collapsed by default). Tabs for Pricing / Process / Tech & tools exist but contain **zero questions in the DOM**. Call length says "20-min" — the rest of the site says "30 minutes." Strategy says 20 minutes is correct.

### Target State
Variant C (manifesto-ish but with the FAQ accordion). 4–6 questions per tab, real and operator-voiced. First 3 questions open by default. 20-minute call length aligned site-wide. Visual register: Mercury 672px editorial column + Notion pricing-tab grouping discipline.

### Section-by-section spec

**1. Hero — Variant C (compact)**
- Eyebrow: `QUESTIONS`
- H1 at 42px (smaller than `/about` — FAQ is utility not manifesto). Direction: "Things we get asked." (Notion period-terminated, verb-led.)
- Dek: 1 sentence pointing to the founder email at the bottom.

**2. Tab strip**
- 4 tabs: `The basics · Pricing · Process · Tech & tools`. Active state: `--radar-500` underline + bold.
- All tabs populated. Minimum 4 questions per tab; aim for 5–6.
- Question content: pull from `pricing-depth.md` objection bank, `cold-email-playbook.md` reply handlers, and `competitor-teardowns.md` battle card rows.

**3. Question rows**
- Each question is a hairline-divided row (no card boxes).
- Question at --text-h4 weight 500.
- Answer at --text-body in a 672px column.
- Default first 3 questions across all tabs to *open* (audit fix).
- Critical questions to ensure exist (audit):
  - "How does this compare to a fractional COO?" (Pricing tab)
  - "How long until my OpsRadar is live?" (Process tab)
  - "What does Discovery cost?" (Pricing tab)
  - "Do you have an integration for [X]?" (Tech & tools tab)
  - "Can I cancel anytime?" (Pricing tab)

**4. "Still have questions?" CTA block**
- Founder block on the left + a primary pill "Talk to the founder" on the right.
- Microcopy: *"No card. 20 minutes. Just the founder."*

### 3 specific changes the dev should make this week
1. **Populate Pricing / Process / Tech & tools tabs** with 4–6 questions each, sourced from `pricing-depth.md`, `cold-email-playbook.md`, and `competitor-teardowns.md`.
2. **Fix the 20-min vs 30-min inconsistency site-wide** — replace all 24 instances of "30 minutes" / "30-min" with "20 minutes" / "20-min" (FAQ is correct per strategy). Sync the Calendly embed.
3. **Default the first 3 questions to open** across all tabs.

### Files to modify
- `src/app/faq/page.tsx`
- `src/app/components/FaqAccordion.tsx`
- Global find/replace: 24 instances of "30 minutes" / "30-min" → 20-min equivalents (across `src/app/**/*.tsx`)
- Calendly URL config in `src/lib/constants.ts`

---

## /audit — Audit Form

### Current State
13 steps (the audit promises "3 minutes"). No site nav/footer (focus mode). Accepts non-ICP business types (Recruiting, Design, Development, PR, E-commerce). Helper text uses first-person singular "I" while the rest of the site uses "we."

### Target State
A focused diagnostic experience. Variant A hero on step 0 (the landing), then a clean form with the audit form-card spec (§5.10). Cut to **7 steps maximum** (audit recommendation), narrow to ICP business types, lead with a dollar promise, and tighten the post-submission handoff to the demo. Visual register: Stripe-elevated form card + Mercury editorial copy + Vercel one-sentence helper text.

### Section-by-section spec

**1. Pre-form landing — Variant A (Proof Hero)**
- Eyebrow: `THE AUDIT · FREE`
- H1: a verb-led promise with a dollar amount. Direction: *"Find the leak. In under 5 minutes."*
- Sub: names the dollar promise — "Most agencies that complete this find $30K–$80K/year of leakage" (audit recommendation).
- Primary CTA pill: "Start the audit" (replaces "Get my free audit →" — drop the arrow per Cursor/Mercury rule).
- Right column: a high-fidelity preview of what the audit output looks like (a static screenshot of the eventual report).

**2. Form card** (§5.10)
- Wrapped in a `--paper-card` card, 40px desktop / 24px mobile padding, 8px radius, the Notion 5-layer shadow stack.
- 7-segment dotted progress bar at the top (cut from 13). Filled segments in `--radar-500`.
- Question at --text-h2 36px weight 500.
- Helper text at --text-body --text-muted, in a `--paper-1` slab below the question.
- Options as large tappable cards (8px radius, 24px padding), hover `--paper-hover`.
- Two-CTA footer: ghost "Back" + primary pill "Next →".

**3. Narrow ICP options**
- Replace the current options list with marketing-agency variants only:
  - Paid Media · SEO · Full-service digital · Social-first · Content/PR · Brand/Creative (marketing) · Other
- Drop Recruiting/Staffing, Design/Creative (production), Development, PR/Comms, E-commerce. Audit recommendation.
- For "Other," route to a soft disqualifier ("OpsRadar is built for marketing agencies — we'll let you know when we expand.").

**4. Submission state — "Generating your audit"**
- Loading state per design-language §6.
- Skeleton of the eventual report. 4-stage status line. Health Score gauge animating from 0 to placeholder.

**5. Results handoff (post-submit, before report email)**
- A success card: *"Your audit is on its way. While it generates, book a 20-minute call — we'll walk through it together when you arrive."*
- Embedded Calendly inline.

### 3 specific changes the dev should make this week
1. **Cut the audit from 13 steps to 7.** Honor the "3-minute" promise. Identify the 6 lowest-information steps and merge or remove.
2. **Replace the business-type options with marketing-agency-only variants** (audit recommendation). Add a soft disqualifier path for "Other."
3. **Add the dollar promise to the pre-form landing** — "Most agencies that complete this find $30K–$80K/year of leakage." Render as a sub-paragraph at --text-lead and as a small inline note on step 1.

### Files to modify
- `src/app/audit/page.tsx`
- Audit step components (find the step-config file inside `src/app/audit/`)
- New: `src/components/marketing/health-score-gauge.tsx` (used in loading state)
- `src/app/results/page.tsx` (handoff target)
- `src/lib/audit-grounding.ts` / step config (cut 13 → 7 steps)

---

## /for/paid-media — Vertical Page

### Current State
Best headline on the site ("Sunday nights are for your family."). Strongest "Before vs After" table. Clean ban-word usage. **Two bugs:** placeholder `[Operator quote — to be replaced with real customer]` shipped to production, and an empty white right half of the hero where a vertical-specific mockup belongs.

### Target State
Variant B (Vertical / Persona Hero) — fill the right column. Keep the strong headline. Drop the placeholder testimonial. Add a vertical-specific dashboard mockup (MER pacing chart + creative rollup). Attach dollar amounts to the saved-hours stamps. Visual register: **Mercury hero composite + Linear capability rhythm + Ramp stat-as-typography for the savings**.

### Section-by-section spec

**1. Hero — Variant B (Vertical / Persona)**
- Left column: same eyebrow ("FOR PAID-MEDIA AGENCIES"), same H1 ("Sunday nights are for your family."), same sub (the 3-problem list), the saved-hours stamps band, and the CTA pair.
- **Right column (the empty space): a paid-media-specific mockup** — a MER pacing chart with a "client X pacing 22% under target" alert overlay, plus a small creative rollup card showing 3 creatives with spend + CTR.
- Use the dark Alert Card spec (§5.2).

**2. Saved-hours stamps band — add dollar stamps**
- Current: `~8 h / mo saved`, `~14 h / mo saved`, `~12 h / new client saved`.
- New: `~14 h / mo saved = $16K/year at $100/h senior rate` — each stamp gets its dollar derivation in --radar-500.

**3. Remove the placeholder quote** — until a real one exists, replace the slot with a category-stat identity line: *"For the agencies whose Sundays already disappeared into client reports."*

**4. Before / After table** (§5.9, the existing strongest pattern)
- Keep the table content. Restyle to the new spec — alternating row backgrounds, mono numeric content, --radar-500 delta stamps.

**5. "How it works for paid media" 3-step strip**
- Vertical-specific version of the Lovable 3-step. Direction:
  - "Connect Meta Ads, Google Ads, GA4 in 4 minutes."
  - "OpsRadar watches pacing, CPA, ROAS overnight."
  - "Get the Sunday-morning alert that saves the Sunday night."

**6. Founder block + closing CTA band**
- Specific founder ask: "Lawand books these directly. Sean from SwishAd is happy to be a reference."

### 3 specific changes the dev should make this week
1. **Remove the `[Operator quote — to be replaced]` placeholder immediately.** Replace with a category-stat identity line (or delete the slot entirely until a real quote exists).
2. **Fill the empty right-column hero with a paid-media-specific dashboard mockup** — MER pacing chart with a pacing alert overlay, using the dark Alert Card spec. The single biggest visual fix on the page.
3. **Add dollar derivations to every saved-hours stamp** — "~14 h / mo saved = $16K/year at $100/h senior rate." Use the `<DollarStamp>` component.

### Files to modify
- `src/app/for/paid-media/page.tsx`
- New: `src/components/marketing/mer-pacing-mockup.tsx` (paid-media-specific hero asset)
- `src/components/marketing/alert-card.tsx` (paid-media variant)
- `src/components/marketing/dollar-stamp.tsx` (apply to the saved-hours band)

---

## /for/seo — Vertical Page

### Current State
Strong headline ("Track what matters in 2026."). Names the right 2026 problem (AI Overviews, LLM citations). Same two bugs as /for/paid-media — placeholder quote + empty right-half hero.

### Target State
Variant B with an SEO-specific mockup (an AIO citations tracker or an Ahrefs digest card). Same pattern as `/for/paid-media`, vertical-specific content. Visual register identical to `/for/paid-media`. Quantify the AIO tracking value.

### Section-by-section spec

**1. Hero — Variant B**
- Left column: same as current.
- **Right column: SEO-specific mockup** — an AIO citations tracker card showing "3 client domains lost AIO presence this week" + an Ahrefs digest preview. Dark Alert Card style.

**2. Saved-hours stamps band — same treatment as /for/paid-media**
- Add dollar derivations.

**3. Remove the placeholder quote** — same fix.

**4. Before / After table** — keep content (the Google-Doc → Ahrefs-digest line is strong), restyle.

**5. AIO + LLM citations data block** — a small standalone section quantifying AIO tracking value: *"Agencies tracking AIO presence catch $X of client-churn risk we'd otherwise see at quarter-end."*

**6. Founder block + closing CTA band**

### 3 specific changes the dev should make this week
1. **Remove the placeholder quote** (same fix as paid-media).
2. **Add an SEO-specific dashboard mockup to the empty right column** — AIO citations tracker + Ahrefs digest card.
3. **Add the quantified AIO tracking value** — a one-sentence sub-section with a dollar amount.

### Files to modify
- `src/app/for/seo/page.tsx`
- New: `src/components/marketing/aio-citations-mockup.tsx` (SEO-specific hero asset)
- `src/components/marketing/alert-card.tsx` (SEO variant)

---

## SITE-WIDE FIXES

These are the 5 cross-cutting changes from the audit that hit every page. Ship them in a single sweep — each is a small but high-leverage edit.

### Fix 1 — The `<title>` double-brand-suffix bug
**Symptom:** Every page renders as `[Page] — OpsRadar — OpsRadar`. Template is concatenating the brand suffix twice.
**Fix:** Identify and remove the duplicate suffix in either `src/app/layout.tsx` `metadata.title.template` or in the per-page `metadata.title`. Likely the per-page title strings already include " — OpsRadar" and the template adds it again.
**Files:** `src/app/layout.tsx`, every page's `export const metadata` (audit each).

### Fix 2 — Footer tagline
**Symptom:** "The operating system for agency operations. Audit, build, and monitor every workflow you already run." Uses banned word "workflow" and positions the audit as a marketing diagnostic rather than a product.
**Fix:** Rewrite to a 1-sentence tagline aligned with the positioning decision. [POSITIONING — pending user decision] Direction: name the buyer + the JTBD + the differentiator in ≤20 words. Avoid banned words.
**Files:** Footer component (likely in `src/app/components/` or `src/components/ui/site-header.tsx`'s footer counterpart — search for the tagline text).

### Fix 3 — `/pricing` link in nav and footer
**Symptom:** No link to `/pricing` exists anywhere on the site. Even after we ship the page (per `/pricing` redesign spec above), users can't find it.
**Fix:** Add `Pricing` to the main nav (between `Product` and `For agencies ▾`) and to the footer link grid (Product column). Use the pill chip active-state when the route matches.
**Files:** `src/components/ui/site-header.tsx`, footer component.

### Fix 4 — Founder block site-wide
**Symptom:** Founder-led sale is the differentiator. The founder is invisible on every page.
**Fix:** Add the slim Founder Block (§7 Pattern 5) to the footer of every marketing page. 40px circle photo + name + "Spotted a typo? Email the founder →" link.
**Files:** Footer component. Photo asset added to `public/`. New `src/components/marketing/founder-block.tsx` used at slim (footer) and full (about page) sizes.

### Fix 5 — Positioning commit: AIOS vs AI COO
**Symptom:** 100% AIOS on the live site, 0% AI COO. Strategy doc and cold emails commit 100% AI COO. The site disagrees with the outreach and the strategy. This is not a small inconsistency — it is a hard fork.
**Fix:** This decision is **out of scope for the design redesign** (user is deciding separately). Once the call is made:
- If AIOS wins: keep current site language, update `path-a-strategy-2026.md`, cold emails, and unshipped `/vs/*` pages.
- If AI COO wins: site-wide find/replace `AIOS` → `[the new category language]`, `AI Operating System` → `AI COO`, rewrite hero H1s across all 10 pages.
The four-pillar vocabulary (OPERATE / OBSERVE / BRAIN / GUARD) is 173 mentions strong and can survive either decision — under AIOS it's "the four parts"; under AI COO it's "what the AI COO does."
**Files:** Everywhere. Single most consequential commit on the site. Plan this as a one-day sweep after the call is made.

---

## Sequencing recommendation (week-1 dev plan)

1. **Day 1 (highest leverage)** — Fixes 1–4 (site-wide), plus ship `/pricing` v0.1 with three tier cards.
2. **Day 2** — Remove placeholder quotes on `/for/paid-media` and `/for/seo`. Add the right-column mockups to both vertical pages.
3. **Day 3** — Replace the homepage hero composite with the single Alert Card mockup. Add the Live Margin Ticker eyebrow (with static-with-jitter data until Supabase aggregate is wired).
4. **Day 4** — Build the founder block component. Apply to `/about` hero and every page's footer. Photograph or commission a Lawand portrait if not already shot.
5. **Day 5** — `/aios` 4-up pillar hero replacement + BRAIN section reorder. `/services` human workflow names. `/how-it-works` horizontal stepper.

Defer for Wave 3 (after the AIOS-vs-AI-COO commit):
- Final H1 copy on every page
- Footer tagline rewrite
- New `/method` page build
- New `/customers` page when first 5 testimonials exist

---

*End of redesign specs. Cross-reference design tokens, components, and patterns in `docs/design-language-opsradar.md`.*
