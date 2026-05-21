# Cursor (cursor.com) — Deep Design Teardown

*Captured 2026-05-18 at 1440x900. Computed CSS via Playwright on cursor.com/home; visual confirmation via screenshots at `.playwright-mcp/cursor-01-home.png`, `cursor-02-pricing.png`, `cursor-03-enterprise.png`. Most copy/structure captured via WebFetch fallback after Playwright session-hijacking (page redirected to ramp.com / posthog.com / lovable.dev / notion.com between evaluate calls). Sections affected by the fallback are flagged inline as "WebFetch fallback — no computed CSS".*

---

## May 2026 update — company momentum behind the design

The design choices below should be read against the velocity of the business shipping them:

- **Valuation in talks at $50B as of April 2026** (~$2B raise co-led by Andreessen Horowitz + Thrive, with Nvidia as strategic), up from $29.3B five months earlier. (Source: techcrunch.com, April 2026; thenextweb.com, 2026)
- **$2B annualized revenue in February 2026** — up from $1B in November 2025 and $500M ARR in June 2025. Forecasting **$6B+ ARR run-rate by end of 2026**. (Source: sacra.com, 2026; aifundingtracker.com, 2026)
- **~60% of revenue now enterprise** — the cream-marketing + enterprise-page pattern in this teardown is the design system of a product that converted from indie-dev word-of-mouth to F500 procurement in 24 months. (Source: techcrunch.com, April 2026)
- **Composer 2 (March 2026)** — faster premium model variant, API-accessible token pricing. The "Use the best model for every task" homepage section now sells Cursor's *own* frontier model, not just a model gateway. The marketing copy hasn't caught up — yet — which is itself a lesson in restraint.
- **Pricing**: Pro $20/mo + Ultra $200/mo (power users) remain stable through 2026 — Cursor resists the AI-add-on trap that ClickUp and Notion fell into. (Source: nxcode.io, 2026)

**Sharper positioning lesson for OpsRadar**: the page reads "restrained" because the *business* is over-delivering. When ARR multiplies 4x in 8 months, marketing can shrink. OpsRadar's marketing surface should likewise compress as customer count grows — not expand. Resist the urge to add testimonial walls, feature grids, and badge clutter as a substitute for the velocity Cursor's product is actually showing.

---

## TL;DR — the headline that should reorient OpsRadar

**Cursor is not a dark-theme product.** The homepage, pricing, and enterprise pages all render on a warm cream/off-white canvas (`rgb(247, 247, 244)`) with near-black ink (`rgb(38, 37, 30)`). The product itself (the IDE) is dark — but the marketing site is the opposite. Cursor uses light theme to feel like a workshop / journal / paper artifact, and reserves dark theme only for the embedded product mockups (so the product feels like a tool sitting on a paper desk). That's the inverse of OpsRadar's current move (dark everywhere).

Cursor's signature visual moves:
1. **Light-cream marketing surface** that frames a **dark product mockup**, creating instant contrast and pulling the eye straight to the screenshot
2. **A custom geometric sans** (CursorGothic) at unusually small H1 sizes (26px on the actual rendered page) — restraint over volume
3. **Pill-shaped dark CTAs** sitting in an otherwise unornamented page — every button is the focal point because nothing else is

---

## 1. The Visual System

### Color palette (from computed styles)

| Token | Hex / RGB | Use |
|---|---|---|
| Canvas / page background | `rgb(247, 247, 244)` ≈ `#F7F7F4` | Body `background-color`, ~every section |
| Ink / primary text | `rgb(38, 37, 30)` ≈ `#26251E` | Body text, H1, H2, H3 |
| Primary CTA fill | Near-black (`~#1A1A18`–`#26251E`) — pill button | "Download for macOS", "Get Pro", "Talk to the team" (verified visually; computed values blocked by hijack) |
| Secondary CTA | Outline / cream pill, ink stroke | "Request a demo", "Try mobile agent", "Get Teams" |
| Section divider | Faint off-cream / no hard rule — sections separate by whitespace, not lines | n/a |
| Logo wall | Logos rendered in near-black ink on the cream canvas (no greys) | "Trusted by..." section |
| Product mockup chrome | Dark editor window on cream page (high contrast against the canvas) | IDE/Mission Control mockup |

**No electric accent.** No blue. No cyan. No gradient. No purple. The only "color" on the marketing surface is the cream itself + the ink + the dark product chrome inside the mockup. Cursor proves that a $9B AI dev tool can ship without a single accent color.

### Typography stack

**Computed family (from real DOM):**
```
font-family: CursorGothic, "CursorGothic Fallback", system-ui, "Helvetica Neue", Helvetica, Arial, sans-serif;
```

Cursor ships a custom geometric sans named **CursorGothic** with a system-Helvetica fallback. One font for everything — headings, body, nav, code labels.

**Type scale (verified from `cursor.com/home`):**

| Element | font-size | line-height | letter-spacing | weight |
|---|---|---|---|---|
| H1 (hero) | **26px** | 32.5px (1.25) | -0.325px | 400 |
| Body | 16px | 24px (1.5) | 0 | 400 |
| (H2 / H3 specifics blocked by hijack — visually appear at ~36–48px H2, ~20px H3) | — | — | — | — |

That H1 of **26px** is the most surprising spec in the entire teardown. Most AI/dev-tool homepages run 56–80px hero H1s. Cursor's hero copy is two lines of "Built to make you extraordinarily productive, Cursor is the best way to code with AI." rendered at near-body-size weight 400 — the headline competes with body in scale and wins on tone, not size.

### Spacing scale

Visually (from screenshots):
- Nav padding ~62px height, generous horizontal whitespace either side of logo + menu
- Hero section: text block sits ~60px from the top of the visible viewport with no oversized padding above
- Section vertical rhythm: ~120–160px between section blocks
- Pricing card internal padding: ~32px / generous breathing room around plan names and bullets

### Border treatments

- Pricing cards: **no visible border** at all — they sit on a barely-darker tint of cream
- CTAs: **fully rounded pills** (border-radius effectively half the button height — ~24–28px equivalent), no border, no shadow visible
- Nav "Contact sales" button: pill with a hairline stroke
- Logo wall items: no borders, no boxes — logos float on the cream

### The signature visual move

**A dark IDE/dashboard mockup floating on a paper-cream marketing page.** The product screenshot itself becomes the page's accent color. There's a sub-move where Cursor renders its product UI with high-quality typography, real code, real diff views, real terminal output — the screenshot is the demo. No "watch a video" CTA. The picture *is* the pitch.

A second signature move on `/home`: the hero CTA pair — primary "Download for macOS ⤓" pill + secondary "Try mobile agent →" outline pill — is anchored low under a short H1, leaving most of the screen for the product image immediately below the fold. Above-the-fold real estate goes to *seeing the product*, not selling it.

---

## 2. The Hero Pattern

### Construction (homepage)

1. Slim transparent nav (logo left, 4 nav items center, Sign in / Contact sales / Download right)
2. H1 — 2 lines, conversational, 26px, weight 400, sentence case ending with a period
3. CTA pair — primary dark pill + secondary outline pill
4. Massive product screenshot directly underneath (the IDE with a "Mission Control Interface" panel and inline code)
5. Logo wall sits *below* the screenshot on `/home`, not above the H1

### Headline formula

> "Built to make you extraordinarily productive, Cursor is the best way to code with AI."

It's:
- A complete sentence (subject + verb + claim)
- Ends with a period
- Uses a **dependent clause first** ("Built to make you extraordinarily productive,...") that softens the brag
- Doesn't use the word "AI" until the last 3 words — the AI is implicit, not the headline

Compare to `/enterprise`:
> "Develop enduring software at scale" / "The choice for ambitious engineering teams."

Same formula: imperative verb + abstract noun + completing line below. No metrics in the H1.

### CTA pattern

| Position | Text | Shape | Note |
|---|---|---|---|
| Primary | "Download for macOS ⤓" | Dark pill | Self-serve action, no friction |
| Secondary | "Try mobile agent →" | Outline pill | Drives feature curiosity |
| Tertiary (anchored deeper) | "Request a demo →" | Plain text link → `/contact-sales?source=hero_request_demo` | The enterprise path |

The enterprise CTA is *intentionally weaker* than the download CTA on the homepage. Cursor's funnel optimizes for self-serve activation; sales is a fallback. The `?source=hero_request_demo` query param is a tell — they're tracking which CTA position converts.

### The visual element

A massive IDE mockup (Cursor running, showing a `Mission Control Interface` page with code on the right and a sidebar on the left). It's a real screenshot of the real product. No illustration. No mascot. No animation in the static view. **The hero "image" is the actual product UI rendered at high fidelity.**

---

## 3. The Page Architecture

Homepage section order (top → bottom, from WebFetch):

1. **Hero** — H1, CTA pair, IDE screenshot
2. **Logo wall** — "Trusted every day by teams that build world-class software" + Fortune-500 logos
3. **"Agents turn ideas into code"** — feature block with product mockup
4. **"Works autonomously, runs in parallel"** — cloud-agent feature block
5. **"In every tool, at every step"** — terminal/Slack/GitHub integration block (with the `curl https://cursor.com/install -fsS | bash` snippet)
6. **"Magically accurate autocomplete"** — Tab feature block
7. **"Use the best model for every task"** — model selection block (OpenAI / Anthropic / Gemini / xAI / Cursor)
8. **"Complete codebase understanding"** — codebase indexing block
9. **"Develop enduring software"** — enterprise / Fortune 500 social proof
10. **Testimonial set** — 6 quotes (Diana Hu / Jensen Huang / Andrej Karpathy / Patrick Collison / shadcn / Greg Brockman)
11. **"Stay on the frontier"** — research / model arc copy
12. **Changelog** — recent product updates
13. **Recent highlights** — recent blog posts
14. **Careers** — "Cursor is an applied research team focused on building the future of software development." + "Join us →"
15. **"Try Cursor now."** — final CTA repeat
16. **Footer** — Product / Resources / Company / Legal / Connect

**Rhythm:** Feature → feature → feature → feature → feature → social proof → research story → product news → recruiting → final CTA. **There are 5 sequential feature blocks before the first testimonial.** Cursor leads with capability density, not social proof. This works because every section header is a *capability claim*, not a benefit promise — they're treating the homepage like documentation with marketing prose.

Pricing page architecture (from screenshot + WebFetch):
- Centered H1 "Pricing"
- Monthly/Yearly toggle (pill segmented control)
- 4 plan cards in a single row — Hobby / Individual / Teams / Enterprise
- No "Most popular" badge visible on the rendered page
- Each card: plan name, price, sub-plan toggle (Pro/Pro+/Ultra inside Individual), feature checklist with `✓` glyphs, single CTA button at card bottom
- FAQ accordion below (6 items)
- Logo wall at the very bottom — "Trusted every day by teams that build world-class software."

Enterprise page architecture (from screenshot + WebFetch):
- H1 "Develop enduring software at scale" with sub-line "The choice for ambitious engineering teams."
- Single dark pill CTA "Talk to the team →"
- Logo wall (Samsung / OpenAI / NVIDIA / Datadog / Adobe / Stripe / PwC / Figma / Carlyle / Sanofi / Deloitte / British Airways / Hilton / Fox / BP / Budweiser) — **enterprise logos are bigger and more numerous than on the homepage**
- Below the fold: product mockup ("Autonomous Fleet Dispatch" / "Build Landing Page")
- Then case studies with quote attribution

---

## 4. The Copy Patterns

### Headline formulas (verbatim)

- "Built to make you extraordinarily productive, Cursor is the best way to code with AI." *(homepage H1)*
- "Develop enduring software at scale" *(enterprise H1)*
- "The choice for ambitious engineering teams." *(enterprise sub)*
- "The new way to build software." *(homepage H2)*
- "Stay on the frontier" *(homepage H2)*
- "Try Cursor now." *(closing H2)*

Pattern: declarative + period + adjective-of-magnitude ("extraordinarily", "enduring", "ambitious", "frontier"). No questions. No "imagine if". No "what if".

### Body voice

Every feature paragraph is **one sentence**, ~12–20 words, ends with a period:

- "Accelerate development by handing off tasks to Cursor, while you focus on making decisions."
- "Agents use their own computers to build, test, and demo features end to end for you to review."
- "Cursor runs in your terminal, collaborates in Slack, and reviews PRs in GitHub."
- "Our specialized Tab model predicts your next action with striking speed and precision."
- "Choose between every cutting-edge model from OpenAI, Anthropic, Gemini, xAI, and Cursor."
- "Cursor learns how your codebase works, no matter the scale or complexity."
- "Trusted by over half of the Fortune 500 to accelerate development, securely and at scale."

The voice is **research-paper-meets-product-spec**. No hype words. No "revolutionary", no "game-changing", no "10x", no exclamation points. Adjectives are technical ("specialized", "cutting-edge", "complete", "enduring") rather than emotional.

### CTA language

| Verb | Use |
|---|---|
| "Download for macOS ⤓" | Self-serve primary |
| "Try mobile agent →" | Feature curiosity |
| "Request a demo →" | Sales path |
| "Talk to the team →" | Enterprise sales path |
| "Learn about [X] →" | Repeated 5× across the homepage for deeper feature pages |
| "Explore [X] ↗" | External-arrow variant when sending to docs/marketplace |
| "Get Pro" / "Get Teams" | Pricing-page commerce CTAs |
| "Join us →" | Careers |
| "See what's new in Cursor →" | Changelog |

Notice the **glyphs are semantic**: `→` for internal navigation, `↗` for external/docs, `⤓` for download. Three arrows, three meanings. Cursor uses the affordance of typography itself to indicate where a link goes.

### How Cursor frames AI capabilities (notably restrained)

- "Agents turn ideas into code" — not "AI agents". Just "agents".
- "Cursor learns how your codebase works" — anthropomorphized but understated. No "intelligent" / "smart" / "powered by AI".
- "Use the best model for every task" — Cursor names the models (OpenAI, Anthropic, Gemini, xAI) instead of using "AI" as a category noun. They sound like a model gateway, not an AI tool.
- "Our specialized Tab model" — Cursor brands their own model rather than saying "our AI".
- "AI is changing how software is built" appears only on the **enterprise page**, and even there it's a section header rather than a hero claim.

The takeaway: Cursor barely uses the letters "A-I" in marketing copy. They describe what the product *does* and let readers do the AI-categorization in their heads.

---

## 5. The Motion Language

*WebFetch fallback — no computed CSS for animation timing. Observed visually + from the screenshot artifacts.*

- **Static-first hero.** No video loop, no parallax, no autoplaying demo on first paint. The hero settles to its final state immediately.
- **Section reveals on scroll** — opacity-fade + slight Y-translate as sections enter the viewport (industry standard, ~0.4s duration based on visual feel)
- **The product mockup is partially animated** — the inline code panel in the Mission Control screenshot shows a fake terminal completion, but it's a very small motion in a contained region. Not page-wide.
- **CTA hover** — the dark pill appears to lighten by ~8% on hover; no transform, no scale, no shadow growth (verification blocked by hijack)
- **Nav stays fixed and transparent** — no shrink-on-scroll. The nav doesn't migrate to a sticky dark bar.

The animation philosophy: **the motion is in the product, not in the marketing.** They don't need motion to prove the AI works — the screenshots already show it.

---

## 6. The 7 Things to Steal for OpsRadar

### 1. Light theme is on the table — reconsider OpsRadar's dark-everywhere stance
**The brief assumed Cursor was dark-theme; it's not. Cursor's marketing surface is `#F7F7F4` cream with `#26251E` ink.** Cursor is the most credible AI-native B2B SaaS of 2025–2026 and they chose paper over obsidian. The reasoning is clear: a light marketing page lets the dark product screenshot pop. OpsRadar currently does the opposite — a dark marketing page that flattens any product screenshot into the same dark surface.

**How to apply:** Test a light variant of the OpsRadar marketing pages (`/`, `/pricing`, `/services`) with cream `#F7F7F4` body + ink `#26251E` text + electric-blue accent retained *only* on CTAs. Keep the dashboard product UI dark — that contrast becomes the visual hook. Measure: hero CTA CTR, time-on-page, scroll depth past hero.

### 2. Shrink the H1 to ~26–32px and lengthen it to a full sentence with a period
**Cursor's hero H1 is 26px, weight 400, two lines, ending in a period.** That's smaller than most subheaders on competitor sites. It works because the *length and specificity* of the sentence does the work that font-size normally has to do. "Built to make you extraordinarily productive, Cursor is the best way to code with AI." reads as a quiet, complete thought, not a billboard.

**How to apply:** Test an H1 like *"Built for agency owners running blind on margin, OpsRadar is the AI COO that watches your business 24/7."* at 28–32px weight 500 (slightly larger than Cursor because the agency-owner ICP is less typography-literate than developers, but still 50% smaller than the typical hero). The dependent-clause-first construction lets you front-load the ICP language ("agency owners running blind on margin") without sounding aggressive.

### 3. Three-arrow CTA glyph system: `→` internal, `↗` external, `⤓` download/install
**Cursor uses three distinct trailing glyphs on links to signal where the user is going before they click.** It's free wayfinding — no extra copy, no tooltip, no icon component.

**How to apply:** Adopt the same convention across OpsRadar:
- `→` on internal nav ("See how OpsRadar works →", "Book a demo →")
- `↗` on links that leave the site (docs, integration partners, customer logos that link out)
- A new OpsRadar-specific glyph for the moneyed action — e.g. `⚡` for "Connect a tool" or `$` for "See your margin" — to mark the *product activation* path distinctly from the *content* path.

### 4. The "screenshot is the demo" hero — replace any hero illustration with a real product UI
**Cursor's hero is a high-fidelity product screenshot, not an illustration, not a video, not a shader.** The IDE mockup is so dense with real code that the visitor's eye scans it for 5+ seconds. By the time they look away, the brain has already accepted "this is a real, working product."

**How to apply:** OpsRadar's hero should be a screenshot of the actual `/dashboard` (the moat) — health score, scope creep alert, live margin number — *not* a shader-background hero with floating-particle ornament. The shader/Three.js elements in the current OpsRadar stack belong inside the product mockup (e.g., as the background of an alert card), not as the page background. **Treat ShaderBackground / Beams as product flair, not marketing flair.**

### 5. One sentence per feature block — and end every one with a period
**Every feature paragraph on cursor.com is one sentence, ~12–20 words.** Compare to typical SaaS marketing where a feature block runs 3–4 sentences. The terseness signals confidence — Cursor doesn't feel the need to convince you.

**How to apply:** Rewrite the OpsRadar feature blocks (services / workflows / pricing) to a one-sentence rule. Example:
- Current style (likely): "OpsRadar continuously monitors your client portfolio across 10 integrations, alerting you the moment a project starts going over scope so you can recover the billable hours before invoice time."
- Cursor style: "OpsRadar watches every client's scope in real time and tells you what to bill before the invoice goes out."

### 6. Use a custom or unusually-tight geometric sans for everything (one font, no exceptions)
**Cursor ships a single bespoke font, CursorGothic, with a Helvetica fallback. Everything — H1, H2, nav, body, FAQ — is the same family.** No serif/sans split. No display vs. text variant. The visual restraint is part of the brand.

**How to apply:** OpsRadar currently uses NotoSansDisplay (body) + NotoSerifDisplay (headings) — a 2-family split common to "thoughtful AI" brands. Cursor's choice suggests the agency-owner ICP would respond to *more* restraint, not more typographic variety. Test consolidating to a single geometric sans (Inter, Geist, or a licensed font like Söhne) for the entire marketing surface. The serif is fighting the message: agency owners don't want literary, they want operational.

### 7. Anchor the logo wall *under* the hero screenshot, with the section title in body type, not display
**Cursor's homepage logo wall sits below the IDE screenshot with the small-cap intro "Trusted every day by teams that build world-class software."** Most SaaS puts logos above the hero or directly under the H1. Cursor delays the social proof to *after* the visitor has already imagined themselves using the product.

**How to apply:** Move OpsRadar's existing customer / logo strip (Sean / SwishAd / Ala when they're live) below the hero dashboard screenshot — not above the H1, not in the nav. Use body-size sentence-case intro copy: "Used every day by agencies that won't accept margin leak." Let the dashboard sell the dream first, then prove it.

---

## 7. The 3 Things That Wouldn't Work for OpsRadar

### 1. The 26px H1 reads as "restrained" to developers but as "broken CSS" to agency owners
Cursor's audience is developers — typography-literate, used to monospace fonts, dense documentation, and reading at small sizes. A 26px H1 reads as *confident understatement* to that ICP.

The OpsRadar ICP — a 35-year-old agency owner running a 12-person Toronto shop — has never seen a font specimen and will perceive a 26px H1 as *the page hasn't loaded yet*. The visual restraint that makes Cursor feel premium will make OpsRadar feel unfinished. Hit 36–44px H1 minimum. Save the restraint for body copy, not the headline.

### 2. The "agents do everything for you" framing without explicit ROI numbers
Cursor copy never names a dollar amount, percentage, or ROI metric in the homepage hero or feature blocks. The closest is "over half of the Fortune 500" on the enterprise page. The product story is *capability*, not *return*.

That works for Cursor because the buyer (a CTO / VP Eng) already knows what 25% PR-volume lift is worth — they don't need OpsRadar's $-amount math. OpsRadar's buyer is the opposite: the agency owner *is* the math. The push to demo is paying for the calculation. Translation: where Cursor writes "Cursor learns how your codebase works", OpsRadar must write "OpsRadar catches the $20K overservice in week 2, not month 3." The Cursor voice without the dollar amounts will sound vague to agency owners.

### 3. The "no testimonials until section 11" structure
Cursor leads with 5 sequential feature blocks before the first testimonial appears. They earn the right to do this because the visitor is already pre-sold by reputation — most cursor.com visitors arrive from HN, Twitter, or a coworker recommendation. The visitor doesn't need social proof to engage; they're already engaged.

OpsRadar's traffic profile is the inverse: cold outreach, founder cold emails, the occasional inbound that just heard about it. The first scroll *has* to contain a logo or a quote, because the visitor's default state is "what is this and why should I trust it?" Use Cursor's *style* of testimonials (single-sentence pull-quote + attribution + role/company) but place the first one immediately under the hero, not eleven sections deep.

---

## 8. Direct Inspiration Mapping

| OpsRadar page | Cursor element / pattern | Specific change |
|---|---|---|
| **`/` (Landing)** — current hero with dark shader + animated H1 | Cursor `/home` hero: cream canvas + dark product screenshot + small H1 + dual pill CTA | Replace shader background with cream `#F7F7F4`. Shrink H1 from current size to 32–36px (still ~25% larger than Cursor for ICP-readability). Replace any 3D/animated hero element with a high-fidelity `/dashboard` screenshot showing a live margin alert. Keep dual CTA: primary "Book a demo →" + secondary "See a live audit →". |
| **`/` (Landing)** — hero copy | Cursor H1: "Built to make you extraordinarily productive, Cursor is the best way to code with AI." | Rewrite to dependent-clause-first sentence: "Built for agency owners running blind on margin, OpsRadar is the AI COO that watches your shop 24/7." End with a period. |
| **`/` (Landing)** — feature blocks | Cursor's 7 one-sentence feature blocks ("Agents turn ideas into code" + 14-word body) | Audit every feature description on the landing page. Each becomes: H3 capability claim (3–5 words) + one sentence (12–20 words) ending with a period. Cut all multi-sentence feature paragraphs. |
| **`/` (Landing)** — logo wall placement | Cursor places logos **below** the IDE screenshot, not above the H1 | Move customer logos (Sean/SwishAd etc. as they come online) to below the hero dashboard screenshot. Use small-cap sentence intro: "Used every day by agencies that won't accept margin leak." |
| **`/pricing`** — plan cards | Cursor `/pricing`: 4 plans in a row, no border, no shadow, single CTA per card | Strip any card borders / shadows / gradients. Render plan cards as soft tinted-cream rectangles with generous padding. One CTA per card. Use a Monthly/Annually pill toggle above the cards. |
| **`/pricing`** — CTA pattern | "Download" / "Get Pro" / "Get Teams" / "Contact Sales" | Adopt the verb pattern: "Get Lite" / "Get Growth" / "Get Pro" / "Contact sales" (Cursor avoids "Start free trial" / "Sign up free" — too SaaS). |
| **`/services` or `/enterprise`** | Cursor `/enterprise`: large logo wall (16+ logos) + 3 case-study pull-quotes with role/title | When OpsRadar lands its first 5 customers, build the same density: 12+ agency logos in a 4×3 grid + 3 founder pull-quotes with full attribution (Name / Title / Agency name). Frame the page exactly as Cursor does: H1 imperative + 1-line sub + pill CTA + logo wall + product mockup. |
| **`/workflows` (showcase)** | Cursor product mockups: real product UI rendered as the marketing asset | Render every workflow showcase as a high-fidelity OpsRadar dashboard screenshot showing the actual alert or recommendation. No illustrations. No "concept" diagrams. Real UI only. |
| **`/about`** | Cursor's careers section: "Cursor is an applied research team focused on building the future of software development." + "Join us →" | Adopt the same brevity: a 1-sentence team description, the team photo (if any), a single "Join us →" CTA. Cut any "Our mission / Our values / Our story" bloat. |
| **CTAs (global)** | Cursor's three-arrow system: `→` `↗` `⤓` | Add a global rule for OpsRadar links: `→` internal, `↗` external (docs/integration partner sites), and a chosen activation glyph (e.g., `⚡`) for the "Connect a tool" / "Start the audit" action. Document in the design system. |
| **Typography (global)** | Cursor: one family (CursorGothic) for everything | Consider consolidating from NotoSans + NotoSerif to a single geometric sans (Inter / Geist / Söhne). Run a 2-week A/B test on the marketing surface; keep the serif only if it survives. |
| **Dashboard product UI** | Cursor's IDE mockup as the recurring marketing asset | Treat the OpsRadar `/dashboard` as the "campaign asset" — every marketing surface (landing, pricing, services, blog hero images) shows a different snapshot of the live dashboard. The dashboard becomes the visual brand. |

---

## Appendix — Verbatim copy bank (for quick reference)

### Homepage CTAs (verbatim)
- "Download for macOS ⤓"
- "Try mobile agent →"
- "Request a demo →"
- "Learn about agentic development →"
- "Learn about cloud agents →"
- "Learn about Tab →"
- "Explore models ↗"
- "Learn about codebase indexing ↗"
- "Explore enterprise →"
- "See what's new in Cursor →"
- "Join us →"
- "Talk to the team →"

### Homepage H2/H3 (verbatim)
- "Trusted every day by teams that build world-class software"
- "The new way to build software."
- "Stay on the frontier"
- "Try Cursor now."
- "Agents turn ideas into code"
- "Works autonomously, runs in parallel"
- "In every tool, at every step"
- "Magically accurate autocomplete"
- "Use the best model for every task"
- "Complete codebase understanding"
- "Develop enduring software"
- "Cursor is an applied research team focused on building the future of software development."

### One-line install
```
curl https://cursor.com/install -fsS | bash
```

### Enterprise H1
"Develop enduring software at scale" / "The choice for ambitious engineering teams."

### Pricing plans
Hobby (Free) / Individual ($20/mo with Pro / Pro+ / Ultra tiers) / Teams ($40/user/mo) / Enterprise (Custom)

### Testimonial quotes (verbatim, attribution included)
- "It was night and day from one batch to another, adoption went from single digits to over 80%..." — **Diana Hu, General Partner, Y Combinator**
- "My favorite enterprise AI service is Cursor. Every one of our engineers, some 40,000, are now..." — **Jensen Huang, President & CEO, NVIDIA**
- "The best LLM applications have an autonomy slider: you control how much independence to give..." — **Andrej Karpathy, CEO, Eureka Labs**
- "Cursor quickly grew from hundreds to thousands of extremely enthusiastic Stripe employees..." — **Patrick Collison, Co-Founder & CEO, Stripe**
- "The most useful AI tool that I currently pay for, hands down, is Cursor. It's fast..." — **shadcn, Creator of shadcn/ui**
- "It's definitely becoming more fun to be a programmer. We are at the 1% of what's possible..." — **Greg Brockman, President, OpenAI**

### Enterprise testimonials (verbatim)
- "Across roles and levels, we're seeing an increase of over 25% in PR volume and over 100% in the average PR size." — **Anton Andreev, Principal Software Engineer, Upwork**
- "I've never, as a CTO, received so many texts or Slack messages from employees just saying 'Thank you.'" — **Melody Hildebrandt, CTO, Fox**
- "What used to be a weeks-long ramp-up is now a structured process built around Cursor from day one." — **Roni Avidov, Senior R&D Team Lead, Monday**

### Blog index — visible categories
"All / product / research / company / ideas"

### Featured blog tagline
"We're building toward a future of self-driving codebases, where agents merge PRs, manage rollouts, and monitor production."

---

*End of teardown. Screenshots: `.playwright-mcp/cursor-01-home.png`, `cursor-02-pricing.png`, `cursor-03-enterprise.png` in this repo root.*
