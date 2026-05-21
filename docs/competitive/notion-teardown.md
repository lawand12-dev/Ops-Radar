# Notion (notion.com) — Deep Design Teardown

*Captured 2026-05-18 · viewport 1440×900 · screenshots & raw computed-CSS JSON in `/tmp/design-teardowns/notion/`*

> Methodology: launched isolated Chromium via Playwright, navigated each page, ran `getComputedStyle()` on hero H1, hero P, primary CTA, nav, sections; pulled `:root` design tokens; sampled 600+ elements for distinct background / color / radius / shadow values; screenshotted hero (above-fold) and full page. All values below are pasted from the live DOM — not from memory.

> Source of truth files: `/tmp/design-teardowns/notion/{home,product,ai,customers,pricing,templates}.{json,hero.png,full.png}`

---

## May 2026 update — Agents took over the platform

Notion reorganized its entire pricing and AI architecture between Sept 2025 and May 2026:

- **AI Agents launched September 2025** (Notion 3.0) — autonomous, multi-step work lasting **20+ minutes per run**. (Source: betanews.com, 2026)
- **Custom Agents shipped February 2026** (Notion 3.3) — team-wide bots that run on schedules + triggers. **1M+ Custom Agents built by users since launch.** (Source: smartproductivitytools.com, 2026)
- **Standalone $10 AI add-on retired May 2025** — full AI access now requires the **Business plan at $20/user/mo**. This is the single largest pricing-architecture move in Notion's history. (Source: get-alfred.ai, 2026; felloai.com, 2026)
- **Custom Agents now usage-priced at $10 per 1,000 Notion credits (May 4 2026)** — explicit shift from seat-only to credit-overlay billing for AI workloads. (Source: aisotools.com, 2026)
- **April 2026 (Notion 3.4): Custom Agents 35–50% cheaper to run** — new lightweight models (GPT-5.4 Mini/Nano, Haiku 4.5, MiniMax M2.5) cut per-run credit consumption up to 10x. (Source: aiproductivity.ai, 2026)
- **Tier structure**: Free / Plus $10 / Business $20 (AI threshold) / Enterprise custom. (Source: get-alfred.ai, 2026)

**Sharper positioning lesson for OpsRadar**:
1. **The "AI tier" pricing move now has two camps.** Notion + ClickUp built AI as a paywall-elevator (forces upgrade to unlock AI). Linear refused (AI on every paid plan). Lovable monetizes via usage credits independent of tier. OpsRadar's $500 / $1.5K / $3K tiers should pick a camp and defend it. Recommendation: **Linear's camp** — every tier includes the AI brain; tiers differ on integration count, action throughput, and team seats. The narrative "the COO is the product, not an upsell" beats "$500 + $9/seat for the chat."
2. **Credit-based action billing is the second monetization axis.** Notion now bills Custom Agents at $10 per 1,000 credits *on top of* seat pricing. OpsRadar's **agentic actions** (auto-fired invoice reminders, scope alerts, briefings dispatched, COO chat runs) are exactly the unit that should meter — a clean second-revenue stream that scales with value delivered.
3. **"1M Custom Agents in 3 months" is a usage-as-marketing flex.** OpsRadar should track and publish a comparable counter — *actions taken*, *dollars saved*, *scope drift caught* — as a homepage live-ticker. Notion's million-agent number sells the platform more effectively than any feature copy.

---

## 1. The Visual System

### Color palette (empirical, from computed styles + `:root` design tokens)

**Surface backgrounds** (the canvas slabs Notion lays sections on top of):
| Role | Hex | Notes |
|---|---|---|
| Deep navy (campaign hero) | `#02093A` | rgb(2,9,58) — homepage + `/product` hero only |
| Near-black | `#191918` | rgb(25,25,24) — used by footer, dark surfaces |
| Pure white (page bg) | `#FFFFFF` | default on `/ai`, `/customers`, `/pricing`, `/templates` |
| **Signature warm off-white** | `#F6F5F4` | rgb(246,245,244) — appears in every page, alt section background, button-secondary fill |
| Subtle alt off-white | `#F9F9F8` | rgb(249,249,248) — `--color-gray-100`, second-tier section slab |
| Cool blue tint (accent muted) | `#F2F9FF` | rgb(242,249,255) — secondary button bg, callout cards (`--color-accent-muted`) |
| Peach/cream warm tint | `#FEF3F1` | rgb(254,243,241) — featured-story bg on `/customers` |

**Brand "color slab" palette** (the bold blocks used on `/product` "Bring all your work together"):
| Hex | rgb | Used as |
|---|---|---|
| `#FFC95E` | rgb(255,201,94) | Mustard-yellow product-shot slab |
| `#F77463` | rgb(247,116,99) | Coral/red-orange slab |
| `#62AEF0` | rgb(98,174,240) | Sky-blue slab |
| `#2A9D99` | rgb(42,157,153) | Teal slab |
| `#B18164` | rgb(177,129,100) | Warm brown slab |

These are saturated, friendly, slightly retro — they feel like Google Workspace-era illustration palettes. They do not feel like enterprise SaaS.

**Brand blues** (`:root` tokens):
- Primary action blue: `#0075DE` / `rgb(0,117,222)` (`--color-link-primary`, the "Learn more →" link)
- CTA button blue (homepage): `rgb(69, 93, 211)` — a more violet/indigo than the link blue
- Active/pressed blue: `#005BAB` (`--color-blue-700`)
- Pale blue card bg: `#F2F9FF`
- Hover: `#E6F3FE`

**Text colors:**
- Body / H1 (light pages): `rgba(0, 0, 0, 0.95)` — never `#000`; always 95% black for a softer feel
- Secondary text: `rgba(0, 0, 0, 0.9)` (heroP)
- H1 (dark hero): `rgb(255, 255, 255)`
- Secondary white text: `rgba(255, 255, 255, 0.75)`

### Typography

**Single font family across everything**:
```
NotionInter, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica,
"Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
```
`NotionInter` is a custom-shipped variant of Inter. **No serif anywhere on the marketing site.** No display font, no monospace. The brand carries entirely through size, weight, and letter-spacing — not through a face.

**Type scale** (from `:root` design tokens):
| Token | Spec | Used for |
|---|---|---|
| `--typography-global-title-md` | `700 4rem / 4rem`, ls `-0.1328125rem` | H1 hero (64px / 64px, ls -2.125px) |
| `--typography-global-title-emphasis` | `700 3.375rem / 3.5rem`, ls `-1.875px` | Section emphasis H2 (54px) |
| `--typography-global-title` | `700 2.625rem / 3rem`, ls `-1.5px` | Section H2 (42px) |
| `--typography-article-title` | `700 2rem / 2.5rem`, ls `-0.75px` | Sub-section title (32px) |
| `--typography-card-title-feature` | `700 1.625rem / 2rem` | Card feature title (26px) |
| `--typography-card-title` | `700 1.375rem / 1.75rem` | Card title (22px) |
| `--typography-card-title-block` | `700 1.125rem / 1.75rem` | Block title (18px) |
| `--typography-card-title-summary` | `700 1rem / 1.5rem` | Inline bold (16px) |
| `--typography-global-body` | `400 1rem / 1.5rem` | Body (16px/24px) |

**Notion's signature typographic move:** *negative letter-spacing scales with type size*. Big headlines are almost cramped (-2.125px at 64px = ~3% tighter); body sits at 0. This is what makes Notion's headlines feel "casual but confident" instead of corporate.

H1s are **always 64px / 700 weight** on every page (`/ai`, `/product`, `/pricing`, `/home`). Notion does not vary hero size by page — the scale is locked.

### Spacing & radii (from `:root` tokens)

**Border radii are tiny by 2026 standards:**
| Token | Value | Usage |
|---|---|---|
| `--border-radius-base` / `200` | `0.25rem` (4px) | Default inputs, badges |
| `--border-radius-300` | `0.3125rem` (5px) | |
| `--border-radius-400` | `0.375rem` (6px) | |
| `--border-radius-500` / `--border-button-radius` | `0.5rem` (8px) | **All buttons** |
| `--border-radius-700` / `--border-card-radius` / `--border-popover-radius` | `0.75rem` (12px) | Cards, popovers, product-shot frames |
| `--border-radius-800` | `0.875rem` (14px) | |
| `--border-radius-900` | `1rem` (16px) | Large containers |
| `--border-radius-round` | `624.94rem` | Pills (`9999px` essentially) — used for toggle pills |
| `--base-padding` | `60px` | Section vertical rhythm baseline |
| `--spacing-card-padding-inline-block` | `2rem` (32px) | Card horizontal padding |

Notion buttons are **8px radius, not pill, not 12px+**. This is conservative on purpose — keeps them feeling "tool" not "toy."

### Shadows — the signature multi-layer stack

Notion does **not** use single-blur shadows. Every elevation is a stack of 4–5 layered shadows with increasing y-offset and increasing alpha. Example (product-shot reveal shadow):
```
rgba(0,0,0,0.01)  0px 1px 3px,
rgba(0,0,0,0.02)  0px 3px 7px,
rgba(0,0,0,0.02)  0px 7px 15px,
rgba(0,0,0,0.04)  0px 14px 28px,
rgba(0,0,0,0.05)  0px 23px 52px
```
The cumulative max alpha is **~0.05** — extremely soft. The shadow is barely there but enormous (52px blur). This gives screenshots that "floating like an iOS app icon" feel without any halo.

### The signature visual moves

1. **Hand-drawn illustrations with thick black outlines** (`/ai`, `/templates`, `/product`) — character heads in colored circles (red, blue, yellow), light bulbs, checkmarks. They look like New Yorker cartoons rendered in vector. They are PNG (`/front-static/agents/*.png`) loaded through Next.js Image, 48–96px source size.
2. **Saturated full-bleed color slab sections** with a single product-shot floating on top (`/product` "Bring all your work together" — yellow, coral, teal, brown rectangles, 5 in a row).
3. **Product shots as the protagonist**: actual screenshots of the Notion product, framed with `border-radius: 12px` and the multi-layer shadow above. These are 3174×1984 source images, served via `_next/image`.
4. **Warm off-white as the dominant canvas** (`#F6F5F4`) — not cool gray, not pure white. The R is the highest channel, giving it a paper feel. This is the single most-imitable Notion move.
5. **Hand-illustrated section dividers** — e.g. the cluster of cartoon faces in colored circles on `/ai` ("Meet your 24/7 AI team") and `/templates` ("Custom agents are here").

---

## 2. The Hero Pattern

### Construction (measured on `/ai`, the clearest example)

```
[ thin top banner: "New Notion's developer platform: Any data. Any tool. ..." ]
[ 64px nav ]
─────────────── 60px+ vertical breathing room ───────────────
[ 2-column grid: H1 + sub + 2 CTAs   |   illustration cluster ]
[ "Trusted by teams at" + 4–5 logos ]
[ 4-up icon row: Agents / Enterprise Search / AI Meeting Notes / Admin controls ]
[ peach-tinted product-shot reveal begins, fades in scrolling ]
```

### Headline formula

All H1s observed are **5–6 words, sentence case, end with a period**:
- "Meet the night shift." (homepage)
- "Meet your 24/7 AI team" (`/ai`)
- "One tool to run your company." (`/pricing`)
- "Customer Stories" (`/customers`, decorative wordmark)

Pattern: **"Meet" / "One" / a verb-noun → declarative period.** Never a question. Never an em-dash. Never a colon. Period is the brand.

### Sub-headline formula

All hero P observed are **one sentence, ≤22 words, three verbs**:
- *"Notion agents keep work moving 24/7. They capture knowledge, answer questions, and push projects forward—all while you sleep."*
- *"Infinite minds, built for teamwork. Answer questions, prioritize tasks, and write reports—all while you sleep."*

Computed: 20px / 400 / line-height 1.5, color `rgba(0,0,0,0.9)`. Notion bumps sub-headline from body (16px) to 20px — a 25% size lift that creates the visual rhythm.

### CTA pattern

Always **two buttons, stacked horizontally**:
| | Primary | Secondary |
|---|---|---|
| Label | "Try for free" / "Get Notion free" | "Request a demo" |
| BG | `rgb(69, 93, 211)` (indigo-violet) | `#F2F9FF` (pale blue tint) |
| Color | `#FFFFFF` | brand blue |
| Padding | `6px 15px` | `6px 15px` |
| Radius | `8px` | `8px` |
| Font | 16px / 500 / no transform | 16px / 500 / no transform |

Note: **buttons are tiny by modern standards** (6×15 padding, 20px effective height). Notion does not use big chunky buttons. The button gets out of the way; the words get the weight.

### The illustration as visual anchor

On `/ai`, the right column of the hero is a cluster of 5 character/icon illustrations in colored circles arranged irregularly — no grid, slight tilt. The same cluster is reused as the `/templates` "Agents" card. **Notion uses a small library (~15–20 hand-drawn assets) across the whole marketing site as building blocks.** This is why everything feels consistent.

---

## 3. The Page Architecture

### Section ordering (homepage, observed top to bottom)

1. **Sticky banner** (`#191918`) — feature announcement, dismissable
2. **Hero** (`#02093A` deep navy or white) — H1 + P + 2 CTAs + product shot/illustration
3. **Logo wall** ("Trusted by teams at" — OpenAI, Figma, Ramp, NVIDIA, Volvo, Cursor, L'Oréal)
4. **4-up feature icon row** — single-line H3 per cell, no body copy
5. **Section: "Keep work moving 24/7."** — 54px H2 + 2-up product features (left column screenshot, right column 22px H3 + body)
6. **Custom Agents grid** — 6 cards, each with title formatted as "Triage product feedback→"
7. **Section: "Ask your on-demand assistants."** — three product shots with 22px H3 captions
8. **Color slab section: "Bring all your work together."** — 5 full-bleed colored slabs in a row, each holding one product shot
9. **Pull quote** ("Our AI everything app.") — centered, large serif-ish weight
10. **Calculator/proof section: "More productivity. Fewer tools."** — table of savings ($340 / $4,090)
11. **Testimonial wall: "Trusted by teams that ship."** — 4-up customer quote cards
12. **Final CTA: "Try for free."** — 3-card row: Notion / Notion Mail / Notion Calendar
13. **Footer** — black, multi-column sitemap

**Rhythm: 11+ distinct sections** above the footer. This is a **long, story-driven page** — not the 4–5 section homepage standard. Section count by page: home=12, ai=11, customers=2 (mostly grid), pricing=16, templates=45 (template grid pages are different beast).

### Section types Notion repeats

| Type | What it does | Example heading |
|---|---|---|
| **"Big H2 verb statement"** | 54px / 700 / one short sentence ending in period | "Keep work moving 24/7." |
| **Two-column product feature** | Left: product shot. Right: 22px H3 + body | "You assign the tasks. Notion Agent does the work." |
| **Grid of "Triage X →" cards** | 22px H3, arrow glyph in title, no body | "Triage product feedback→" |
| **Color slab** | Full-bleed saturated bg, product shot floats on top | "Simple and powerful." |
| **Pull quote** | Single quote, large, centered, no avatar | *"Our AI everything app."* |
| **Customer story card** | Photo + name/title + Notion+CustomerLogo lockup | "Ramp runs on Notion" |
| **Feature comparison table** | (pricing) plans × features grid | "Plans and features" |

### Pricing page architecture (specifically)

1. H1 "One tool to run your company." (64px, no sub)
2. Tiny logo wall ("Trusted by teams at: OpenAI, Figma, Volvo, Ramp, Cursor")
3. Toggle: `Pay monthly | Pay yearly` (pill, 9999px radius) + "Save up to 20% with yearly"
4. **2×2 plan cards**, but with a twist: cards 3–4 (Business, Enterprise) sit in a pale-blue `#F2F9FF` container with the heading "**The AI workspace for work that matters.**" — visually separating "starter plans" from "AI plans"
5. Long feature-comparison table — sticky header
6. Q&A accordion at bottom
7. Footer

The pale-blue-tinted Business/Enterprise container is the key move: it visually merchandises the upsell without putting "Recommended" in 40 places.

---

## 4. The Copy Patterns

### Headline formula
**Verb-led, period-terminated, ≤6 words.**
- "Meet the night shift." · "Keep work moving 24/7." · "Ask your on-demand assistants." · "Bring all your work together." · "More productivity. Fewer tools." · "Trusted by teams that ship." · "Try for free." · "One tool to run your company." · "Plans and features." · "Questions & answers."

Note "More productivity. Fewer tools." — **two short sentences separated by a period**, a Notion pattern. It's punchier than a comma.

### Sub-headline formula
**Subject + 3 verbs + outcome, single sentence.**
- *"They capture knowledge, answer questions, and push projects forward—all while you sleep."*
- *"Answer questions, prioritize tasks, and write reports—all while you sleep."*

The em-dash is load-bearing. "—all while you sleep" is reused across both heroes (homepage + `/ai`). They're not afraid to repeat their own best phrase.

### Body voice
Warm, second-person, accessible, **never references the company name in copy** (no "Notion does X" — instead "Notion Agent does"). Sentences are short. Numbers and proper nouns do heavy lifting:
- *"There's power in a single platform where you can do all your work. Notion is that single place."*
- *"By the time this meeting finishes and I go make a cup of tea, all those tasks are already done for me in the background."*
- *"Notion is saving us 200+ hours every month we used to waste hunting for answers."*

### Proof points
Notion stacks numerical proof in rows of 3–4, no charts:
- "Over 100M users worldwide · #1 knowledge base 3 years running (G2) · #1 AI enterprise search (G2) · #1 rated AI writing (G2) · 62% of Fortune 100 · Over 50% of YC companies · 1.4M+ community members · Trusted by 98% of the Forbes Cloud 100"

These appear as plain text — no big number animations, no count-ups. Just a row of facts.

### CTA language
**"Get Notion free"** (primary) + **"Request a demo"** (secondary) — across every page. The word "Get" not "Try" not "Start." (One inner page uses "Try for free.") Never "Sign up free" — always "Get Notion free" (brand-in-the-CTA).

### Customer story format (`/customers`)
Each card has:
- Optional metric pill ("70% cut in productivity-tool costs", "160+ product questions answered every week")
- Bold 22px title in the form **"How X did Y with Notion"** or **"X runs on Notion: How they did Y"**
- Photo of a real person (not a stock smile — they're working, in office)
- Tiny lockup at the bottom: `[Notion logo] + [Customer logo]`

The lockup at the bottom is itself a microbrand pattern — visually shows the partnership.

---

## 5. The Motion Language

Notion's motion is **restrained**. There is no parallax, no Lottie, no full-page scroll-jacking.

Observed from rendered DOM + section structure:
- **Hero illustrations are static PNGs**, not animated. No Framer Motion entrance.
- **Product shots fade up on scroll** into peach/blue-tinted containers (intersection-observer reveal — section has `opacity: 0` initial → `opacity: 1` after scroll trigger). The transitions are short (~300ms), no bounce, no spring.
- **CTA hover**: bg shifts from `rgb(69,93,211)` → `#005bab` (via `--color-button-primary-background-active`). No scale. No shadow change.
- **Bento carousel** (homepage "Ask your on-demand assistants") is a swipeable horizontal card row — keyboard arrows + drag. No autoplay observed.
- **Color slabs** do not animate their bg color — they just sit. The product shot inside might fade in.
- **Pull-quote** ("Our AI everything app.") is set in a regular weight without entrance — the page treats quotes as content, not as moments.

The discipline: motion only where it earns its keep (product-shot reveals, slider). Everything else is dead-still. This is what lets the illustrations carry the brand instead of motion.

---

## 6. The 7 Things to Steal for OpsRadar

| # | Steal | Why it works | How to apply to OpsRadar |
|---|---|---|---|
| 1 | **Warm off-white canvas `#F6F5F4` as base**, not cool gray, not pure white | The R-dominant tint reads as "paper / craftsman" not "SaaS chrome." Differentiates instantly from the cobalt-and-charcoal AI-tool category | Use `#F6F5F4` for landing-page alt sections / card backgrounds on `/`, `/pricing`, `/about`. Keep dark hero (`#0C0F1A` or similar — OpsRadar's electric-blue accent system); but break the page into alternating dark + warm-light slabs instead of dark-only |
| 2 | **64px H1, fixed, every page**, with negative letter-spacing scaling to size (-2.125px at 64) | Locked hero size = brand discipline = the page feels like one product, not 5 different agencies | Lock OpsRadar's marketing H1 to a fixed size (60–72px). Apply `letter-spacing: -0.03em` to ALL headings ≥32px. Currently OpsRadar mixes hero sizes — pin it. |
| 3 | **Period-terminated, verb-led headlines, ≤6 words** | "Meet the night shift." converts because it's a fact, not a question. The period closes the loop. This is *exactly* the founder-to-founder confidence OpsRadar brand voice already targets | Rewrite hero headlines to verb-led periods. Examples for OpsRadar: "Run the agency you can't see." · "Find the leak. Plug it tonight." · "Catch margin drains in week one." · "Meet your AI COO." (Notion's exact "Meet ___" template literally works for OpsRadar.) |
| 4 | **Pull single proof points into a flat row of facts** — no big numbers, no count-up animations, just text | Notion uses *"Over 100M users · #1 knowledge base 3 years running"* as a plain row. No theatrics. Builds credibility without sounding like a pitch deck | OpsRadar's metric-heavy ICP ($10K COO vs $500, 21.5% lose money, 95% of pilots fail) deserves a row, not a bento. Build a single line: "$10K/mo COO replaced · 21.5% of agencies lose money in 2026 · 24/7 monitoring · Live across HubSpot, ClickUp, Harvest + 7 more" |
| 5 | **Color-slab section with product-shot floating** — full-bleed saturated bg, single screenshot on top | This is the easiest way to make a long page feel rhythmic without illustrations. The screenshot becomes the protagonist; the color becomes the section ID | Build one section per OpsRadar page using a saturated brand-tint slab (OpsRadar's electric blue at 100% saturation, or a contrasting peach/amber). One screenshot: the alert that catches a $20K leak. That's the whole section. |
| 6 | **Multi-layer micro-shadow on product shots** — 4–5 stacked rgba shadows, max alpha 0.05 | The screenshot floats without halo. This is the look of "premium tool" — Linear, Vercel, Stripe all use a version of it | Replace any single `box-shadow` on screenshots/cards with the stack: `0 1px 3px rgba(0,0,0,.01), 0 3px 7px rgba(0,0,0,.02), 0 7px 15px rgba(0,0,0,.02), 0 14px 28px rgba(0,0,0,.04), 0 23px 52px rgba(0,0,0,.05)`. Use 12px corner radius on the screenshot frame. |
| 7 | **Pricing page: "Essentials" vs "AI workspace" twin-block layout** — Free/Plus in plain card, Business/Enterprise inside pale-blue container with its own H2 | Merchandises the upgrade visually without "Recommended" pill spam. Notion is steering ~70% of new paid signups into Business via *layout*, not language | OpsRadar's $500/$1,500/$3,000 ladder needs this: put $500 (Solo) in a plain card. Put $1,500 (Growth) and $3,000 (Scale) inside a pale-electric-blue container with H2 "**The COO for agencies that can't afford one.**" Visual segmentation, not a "Most popular" pill. |

---

## 7. The 3 Things That Wouldn't Work for OpsRadar

### 1. Hand-drawn cartoon illustrations of human heads / lightbulbs / checkmarks
- **Why Notion uses them**: they sell to *everyone* — students, freelancers, teams, enterprises. The illustrations are deliberately ambiguous about audience. A cartoon person could be anyone. They keep the brand soft and inclusive.
- **Why OpsRadar shouldn't**: OpsRadar's ICP is a 35–50 year old agency owner who's losing money and is angry about it. They are not in the market for "cute." Cartoon illustrations will *actively undermine* the "I am the sharp peer who tells you the truth" voice the product-marketing doc commits to ("Direct, confident, founder-to-founder · No-BS · Built-by-an-operator").
- **What to do instead**: keep OpsRadar's existing electric-blue/cyan accents + dark-hero treatment. Use product screenshots, real chart UI, live alert mockups as the visual protagonist — not characters. If illustration is needed, use the abstract geometric/data-viz language already present (shader background, beams, glow cards), not figurative.

### 2. The "Try for free" + freemium funnel positioning
- **Why Notion can**: their CAC on free users is effectively zero — viral team-share dynamics, $0 marginal cost to add a free user, freemium-to-paid is a 5-year nurture for them.
- **Why OpsRadar can't**: founder-led sale, demo-first model (the product-marketing doc literally says **"Conversion action: Book a 20-minute demo with the founder. (Demo-first model; demo-to-paid conversion runs 55–75%)"**). Free trials on a $500–3,000/mo product where each customer requires integration setup would bury the founder in unqualified leads. OpsRadar needs *fewer* better leads, not more leads.
- **What to do instead**: lift Notion's hero *layout* (H1 + sub + 2 CTAs side-by-side) but the CTAs should be **"Book a demo"** (primary) + **"See live example"** (secondary, → demo dashboard or video). Not free signup.

### 3. The 12+ section, story-driven, 6,000+ scroll-pixel homepage
- **Why Notion can**: their visitors are at every stage of awareness — some are students who never heard of them, some are admins evaluating for a 500-person rollout. They need ~12 sections to address everyone.
- **Why OpsRadar can't**: ICP is narrow — agency owner with $500K–$5M revenue, 5–50 people, losing margin, can't afford a COO. They have *one* problem. The page should slam that problem in 3–5 sections, then push to demo. A 12-section page asks the agency owner to scroll past 8 sections that don't apply to them and risks them bouncing before the demo CTA.
- **What to do instead**: 5-section homepage. (1) Hero: problem + AI COO promise + demo CTA. (2) Proof row: 4 facts. (3) "How it works" — 3 panels with product screenshots. (4) Pricing strip. (5) Final CTA "Book a 20-min demo." Done. Steal Notion's *typography and color discipline*; don't steal their page length.

---

## 8. Direct Inspiration Mapping

| OpsRadar page / surface | Notion element / pattern | Specific change |
|---|---|---|
| `/` (landing) hero | `/ai` hero: 64px H1 + 20px sub + 2 CTAs side-by-side + illustration cluster on right | Rewrite to **"Meet your AI COO."** (60–64px, weight 700, ls -2px) + sub "Watches utilization, margin, scope creep, and client health 24/7—and tells you exactly what to do." Replace right-column illustration with a live alert mockup card ("Acme is 23% over scope. Send invoice →") on a `#F6F5F4` slab |
| `/` hero CTAs | Notion: `Get Notion free` (indigo bg) + `Request a demo` (pale-blue bg) | OpsRadar: primary `Book a demo` on electric-blue `#0066FF`, secondary `See live example` on `#F2F9FF` pale blue. **8px radius, 6×15 padding, 16px / 500.** Stop the current larger button style. |
| `/` logo strip | "Trusted by teams at" + 4 grayscale wordmarks | Once early customers close — single line: "Trusted by agencies running on" + 4 logos. Until then: "Backed by data from" + 4 source logos (Fluency, Planable, Mosaic, MIT NANDA studies) |
| `/` features section | `/product` "Keep work moving 24/7." — 54px H2 + 2-up: left product shot, right column 22px H3 sub-features | Build "Find the leak. In real time." — left: dashboard screenshot showing alert. Right: 3 sub-features (Scope Drift detection · Utilization alerts · Cash-flow flags) each as 22px H3 + 1-sentence body |
| `/` color-slab moment | `/product` "Bring all your work together" — 5 saturated full-bleed slabs | OpsRadar: ONE slab in OpsRadar electric-blue (`#0066FF` or a warm contrast like coral `#F77463`) with the **single most-impressive product shot** — the COO chat answering a real margin question with live data. Section H2: "**Ask the COO. Anytime.**" |
| `/pricing` | Notion `/pricing`: H1 "One tool to run your company." + 2×2 plan grid where Business/Enterprise sit in pale-blue container with its own H2 | OpsRadar: H1 **"The COO at the price you can afford."** Solo ($500) in plain card. Growth ($1,500) + Scale ($3,000) inside a pale-electric-blue `#E6F3FE` container with H2 "**For agencies that need a real ops brain.**" Below: long feature table sticky-header. |
| `/about` or founder page | Notion doesn't really have one — but `/customers` "Featured Story" peach-tinted card with photo + bold title + Notion+Customer lockup | Build OpsRadar's "Why this exists" section as a peach/cream `#FEF3F1` slab with founder photo + 22px bold title + short story. Lockup at bottom: `[OpsRadar logo] [Was built for] [Agency type]` |
| Audit / results page UI | Notion product-shot framing: 12px corner radius + 4-layer micro-shadow + warm-white frame around screenshot | Apply same shadow stack + 12px radius to every dashboard screenshot used in marketing. Currently OpsRadar mixes screenshot treatments — standardize. |
| Typography (global) | NotionInter at fixed scale: 64/54/42/32/26/22/18/16, weight 700, letter-spacing scales -0.03 to -0.04em | Lock OpsRadar's heading scale to ~the same ratios. Apply `letter-spacing: -0.025em` on h1–h3. Use existing NotoSansDisplay (do NOT switch fonts) but enforce the scale + tracking. |
| Section copy | Notion: section H2 = verb-led period (e.g. "Keep work moving 24/7.") | Rewrite OpsRadar section H2s to verb-led periods: "Catch margin leaks early." · "Stop paying for a fractional COO." · "Prove your AI ROI." · "Run the agency you can't see." |
| Proof points | Notion flat-row facts: "100M users · #1 knowledge base · 62% of Fortune 100" | Build OpsRadar fact-row: "21.5% of agencies lost money in 2026 · 95% of AI pilots can't prove ROI · 15–30% margin leaks to ops · $10K/mo fractional COO replaced" |
| Final CTA | Notion `/product` "Try for free." — 3-card row of products | OpsRadar: simpler — single panel with H2 "**Book a 20-minute demo with the founder.**" + the founder's actual photo + Calendly embed |
| Customer testimonial style (post-launch) | Notion `/customers` cards: metric pill + bold "How X did Y" + working photo + lockup at base | Once OpsRadar has 3+ paying customers: use this exact format. Metric ("Caught $42K of overservicing in month one"), title ("How SwishAd plugged a margin leak with OpsRadar"), photo of Sean working, lockup "[OpsRadar] + [SwishAd]" |

---

## Appendix — Raw artifact paths

- Computed CSS JSON per page: `/tmp/design-teardowns/notion/{home,product,ai,customers,pricing,templates}.json`
- All pages bundled: `/tmp/design-teardowns/notion/all.json`
- Above-fold screenshots (1440×900): `/tmp/design-teardowns/notion/*-hero.png`
- Full-page screenshots: `/tmp/design-teardowns/notion/*-full.png`
- Scrape script: `/tmp/design-teardowns/notion/scrape.mjs`
