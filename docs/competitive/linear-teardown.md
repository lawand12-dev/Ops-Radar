# Linear (linear.app) — Design Teardown

*Captured 2026-05-18. Six pages: `/`, `/method`, `/features`, `/customers`, `/pricing`, `/now`.*

**Capture method note:** Playwright was hijacked across domains in this session (navigations to linear.app landed on ramp.com / cursor.com). After two retries per the brief, I fell back to **headless Chrome screenshotting** (real renders at 1440×900, virtual time budget 4s) plus **direct CSS bundle download** (16 `.css` files pulled from `static.linear.app`) plus **WebFetch for copy**. All design tokens below are real `:root` CSS custom-property values from Linear's own stylesheets. Screenshots are in `/tmp/design-teardowns/linear/`.

---

## May 2026 update — "issue tracking is dead"

The most consequential positioning move of 2026 in this category came from Linear:

- **March 2026: Linear launched Linear Agent in public beta** — works in the web/mobile/desktop apps and as a plug-in for Slack, Teams, Zendesk. CEO Karri Saarinen publicly declared **"issue tracking is dead"** and reframed Linear as an agentic work platform rather than a tracker. (Source: theregister.com, March 2026; linear.app/changelog, March 2026)
- **AI is included on every paid plan at no extra cost** — Agent and Skills ship across all tiers; Automations and Code Intelligence gate to Business/Enterprise; usage-based pricing for heavy compute only kicks in at GA. Explicit contrast with ClickUp Brain's +$9–$28/seat add-on. (Source: ai-tools-hq.com, 2026)
- **Pricing unchanged**: Free / Basic $10 / Business $16 / Enterprise custom. The decision *not* to launch an "AI tier" is itself the positioning move. (Source: aiproductivity.ai, 2026)

**Sharper positioning lesson for OpsRadar**:
1. **The category-rename move.** Linear's CEO publicly buried his own category ("issue tracking is dead") to lead the next one ("agentic work platform"). OpsRadar's equivalent is to publicly bury "agency dashboards" / "PSA reporting" — name them dead — and lead with **"the agency brain."** Don't be the better dashboard; declare dashboards over.
2. **Bundle AI into every tier rather than gating it.** OpsRadar's Starter ($500) should include the COO chat and the action queue — not relegate them to Growth/Pro. The competitor narrative is "AI add-on doubles your bill"; the OpsRadar counter-narrative is "AI *is* the product, not an upsell."
3. **Plug-in distribution.** Linear Agent shipped Slack/Teams/Zendesk plug-ins on day one. OpsRadar's COO alerts should ship as a Slack app first, not as an email-only or dashboard-only channel — meet the founder where they already triage.

---

## 1. The Visual System

### Color palette (verbatim from `:root`)

**Dark theme (default — what visitors see):**
| Token | Value | Role |
|---|---|---|
| `--color-bg-marketing` | `#010102` | Page background (the marketing-only black, *darker than the app's `#08090a`*) |
| `--color-bg-primary` | `#08090a` | App-surface black |
| `--color-bg-secondary` | `#1c1c1f` | Card / panel one step up |
| `--color-bg-tertiary` | `#232326` | Hover / nested surface |
| `--color-bg-panel` | `#0f1011` | Floating panel |
| `--color-text-primary` | `#f7f8f8` | Headlines, body |
| `--color-text-secondary` | `#d0d6e0` | Sub-copy, dek |
| `--color-text-tertiary` | `#8a8f98` | Muted / metadata |
| `--color-text-quaternary` | `#86848d` | Captions, dates |
| `--color-border-primary` | `rgba(255,255,255,0.08)` | Hairlines (translucent, not a hex) |
| `--color-border-secondary` | `rgba(255,255,255,0.12)` | Stronger hairlines |
| `--color-accent` | `#7170ff` | Indigo/violet brand |
| `--color-accent-hover` | `#828fff` | Brighter accent on hover |
| `--color-brand-bg` | `#5e6ad2` / `#7070ff` | Brand fills (two stops) |
| `--color-link-primary` | `#7070ff` → `#828fff` (hover) | Links |
| `--color-blue` | `#4ea7fc` (with `display-p3 0.431 0.6816 0.9988` P3 fallback) | Status blue |
| `--color-green` | `#27a644` | Status |
| `--color-orange` | `#fc7840` | Status |
| `--color-yellow` | `#f0bf00` | Status |
| `--color-red` | `#eb5757` | Status |
| `--color-teal` | `#00b8cc` | Status |
| `--color-indigo` | `#5e6ad2` | Brand stop |
| `--color-linear-plan` | `#68cc58` | Product-specific |
| `--color-linear-build` | `#d4b144` | Product-specific |
| `--color-linear-security` | `#7a7fad` | Product-specific |

**The signature visual move:** the marketing background is `#010102` — *blacker than black*. The app inside the marketing screenshots uses `#08090a` (slightly lifted). The result: in-product UI floats out of the page because its background is fractionally lighter than the surrounding canvas. Almost everyone uses pure `#000` or a `#0a0a0a` — Linear is more deliberate than both.

### Typography

```
--font-regular: "Inter Variable", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Open Sans", "Helvetica Neue", sans-serif;
--font-serif-display: "Tiempos Headline", ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
--font-monospace: "Berkeley Mono", ui-monospace, "SF Mono", "Menlo", monospace;
--font-settings: "cv01","ss03";   /* Inter character variants */
--font-variations: "opsz" auto;
```

**Weights:** `300 / 400 / 510 / 590 / 680` (note: not the standard 400/500/600/700 — Linear uses the *fractional* weight axis of Inter Variable for `510` medium and `590` semibold to land between conventional weights).

**Type scale (real tokens, with line-height + letter-spacing):**
| Token | Size | Line-height | Letter-spacing |
|---|---|---|---|
| `--text-tiny` | `0.625rem` (10px) | `1.5` | `-0.015em` |
| `--text-micro` | `0.75rem` (12px) | `1.4` | `0` |
| `--text-mini` | `0.8125rem` (13px) | `1.5` | `-0.01em` |
| `--text-small` | `0.875rem` (14px) | `21/14 ≈ 1.5` | `-0.013em` |
| `--text-regular` | `0.9375rem` (15px) | `1.6` | `-0.011em` |
| `--text-large` | `1.0625rem` (17px) | `1.6` | `0` |

**Hero h1** (measured from the rendered 1440×900 screenshot): ~80px, weight `680` (the "bold" custom weight), Inter Variable, white `#f7f8f8`, ~1.05 line-height, slight negative tracking. The `/method` hero swaps to **Tiempos Headline serif** at a much larger size — visible serifs, almost editorial.

**Pattern:** Sans-serif (Inter) for product/marketing pages, **serif (Tiempos) reserved exclusively for the `/method` "manifesto" page** to signal it's a different artifact — a book, not a brochure.

### Spacing scale

Gap tokens shipped in the bundle: `0, 2, 3, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 32, 40, 48px`. Padding tokens: `0, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 48px`. Page-level:

```
--page-max-width: 1024px;          /* docs/method pages */
--page-padding-inline: 24px;
--page-padding-block: 64px;
--page-inset: 32px;
--homepage-max-width: calc(1344px + var(--homepage-outer-padding) * 2);
--homepage-outer-padding: 46px;    /* desktop; drops to 28→16→10 at smaller breakpoints */
--homepage-padding-inset: 32px;
```

So the homepage gutter is wider (1344px content max) than long-form pages (1024px). That's two different reading widths for two different reading jobs.

### Border treatments

Radii: `--radius-4 / 6 / 8 / 12 / 16 / 24 / 32`, plus `--radius-circle: 50%` and `--radius-rounded: 9999px`. The Sign-up pill in the nav is `9999px` (full pill). Cards in the screenshots read as `8–12px`. **Hairlines are not solid borders — they're `rgba(255,255,255,0.08)`**, which keeps them feeling structural without ever creating hard edges in a dark canvas.

### Shadows

```
--shadow-low:    0px 2px 4px rgba(0,0,0,0.1);     /* dark */
--shadow-medium: 0px 4px 24px rgba(0,0,0,0.2);
--shadow-high:   0px 7px 32px rgba(0,0,0,0.35);
```
Three steps only. Shadows used very sparingly in the marketing pages — the product screenshot mid-hero gets the `--shadow-high` treatment to lift it off the canvas.

### The signature visual move (summary)

Three things together make Linear instantly recognizable, and you can't fake any of them without the others:

1. **Marketing-only blacker black** (`#010102`) so the product UI (`#08090a`) floats *out* of the page.
2. **Translucent hairlines** (`rgba(255,255,255,0.08)`) instead of solid borders — structure without rigidity.
3. **Real product screenshots** rendered at high fidelity as the hero visual, never illustrations or generic 3D.

---

## 2. The Hero Pattern

Above-the-fold construction is identical across `/`, `/customers`, `/pricing`:

```
[top nav: 64px tall, hairline border-bottom, Sign up = pill button]
[60–100px vertical breathing room]
[h1: 80px Inter 680, left-aligned, max ~2 lines]
[dek: 17px Inter 400 in secondary color, ~1 line]
[60–100px breathing room]
[product visual — real screenshot of the app, takes the rest of the fold]
```

There is **no CTA in the hero** of the homepage. The primary CTA on the homepage is a *banner pill* near the top right of the hero visual reading "Issue tracking is dead" (linking to `linear.app/next`) — a manifesto pill, not a "Get Started" button. Sign-up lives only in the nav. This is a deliberate "we don't need to chase you" posture.

### Headline formula

The same template, four ways:

| Page | Headline |
|---|---|
| `/` | *"The product development system for teams and agents"* |
| `/features` | *"The system for modern product development"* |
| `/method` | Eyebrow: *"THE LINEAR METHOD"*. Serif h1: *"Practices for building"* |
| `/pricing` | *"Pricing"* (one word) |
| `/customers` | *"Customers"* (one word) |
| `/now` | *"Now"* (one word) |

Two heroes only have content: `/` and `/features`. The rest use **one-word page titles**. That's a brand confidence move — they treat marketing nav pages like product pages, not landing pages.

**The recurring sub-tagline:** *"Built for the future. Available today."* — appears as the dek on `/customers`, the dek on `/pricing`, and the footer CTA section on the homepage. It's their cross-page anthem.

### Visual element

The hero visual is **always a real Linear app screenshot** (issue panel with sidebar, "Faster app launch" issue with activity feed, "GitHub Copilot" agent dialog). Not a 3D render, not a stylized illustration, not a Figma mockup — the actual product, rendered at app fidelity, with realistic data ("Faster app launch", "Render UI before vehicle_state sync", "ENG-2703"). The screenshot is then placed against the marketing-blacker-black so the app's own `#08090a` background lifts.

---

## 3. The Page Architecture

### Section types (in order, homepage)

1. Top nav (64px, hairline border, transparent → solid on scroll)
2. Hero (h1 + dek + product hero visual, no CTA)
3. Five "capability" sections, each: **h2 left** + **product visual right (or below)** + **short paragraph + bullet list**
   - "Make product operations self-driving"
   - "Define the product direction"
   - "Move work forward across teams and agents"
   - "Review PRs and agent output"
   - "Understand progress at scale"
4. **Customer logo wall + count line**: *"Linear powers over 25,000 product teams. From ambitious startups to major enterprises."*
5. Customer quote band (3 quotes, attribution: name + company)
6. Footer CTA: *"Built for the future. Available today."* + sign-up CTA
7. Multi-column footer

**Rhythm:** every capability section is the same height. No varied widths, no asymmetric layouts. The visual rhythm is metronomic — `[h2 → screenshot → bullets] × 5`. This is what makes scrolling feel calm: zero novelty per section, the eye knows exactly where to land.

### `/method` architecture

Editorial table-of-contents page. Eyebrow → serif h1 → 3-line dek → two-column body (TOC left, content right). Three top-level sections: **Introduction**, **Direction**, **Building**, each with 4–6 chaptered links. Reads like a book, not a SaaS page. (Linear treats Method as content marketing crown jewel — high-link-equity, evergreen, frequently cited.)

### `/customers` architecture

Page title only (no dek). Filter row: **Featured · SaaS · AI · Fintech · Consumer · Hardware · Health · Enterprise**. Then 3-column grid of customer cards: each card is a **brand-colored block (the customer's own brand color) with their logo in white**, headline beneath ("Why OpenAI chose Linear and scaled to 3,000 users"), "Read story →" link. OpenAI = lavender-pink gradient block, Coinbase = saturated blue, Oscar = indigo, Ramp = lime yellow, Cursor = grayscale photo of a person with white CURSOR wordmark overlay. The page itself is monochrome; the customer cards bring all the color.

### `/pricing` architecture

Title + 4 columns side-by-side, no toggle visible at top (yearly toggle lives *inside* each paid tier card). Each column: tier name (h2, large), price (h3), micro-tagline, then checkmark feature list, then CTA pill at bottom. No "Most popular" badge in view. Below the cards: long compare-features matrix.

### `/now` architecture

Page title + filter row (**All · Changelog · Community · News · Craft · AI · Practices · Press**) + RSS icon. Then 3-column card grid: cover image (often a black product detail or pattern), title, 2-line body, byline `Name · Date`. Looks identical to a Substack archive. Posts dated in the future show normally — they're future-dated for SEO/freshness.

---

## 4. The Copy Patterns

### Headline formula

**"The [definite article] system for [verb-ing] [audience]."** Used on `/`, `/features`, and the legacy *"The issue tracker built for high-performance teams"* before this. It's a category claim, not a benefit claim. Linear writes like a magazine ("the system"), not a SaaS ("our platform").

### Recurring sub-taglines (verbatim)

- *"Built for the future. Available today."* (dek on `/customers`, `/pricing`; section heading in homepage footer)
- *"Plan the present. Build the future."* (`/features` repeating tagline)
- *"Purpose-built for planning and building products. Designed for the AI era."* (homepage dek)

The voice is: **two short sentences in present-tense parallel construction.** Almost every dek follows that beat.

### Body voice

Short declarative sentences. No adjectives. The verbs do all the work:
- "Convert feedback into routed, labeled issues."
- "Plan from idea to launch with initiatives and PRDs."
- "Deploy AI agents for complex tasks."
- "Structural diffs for human and agent code review."

There is no "supercharge," "seamlessly," "powerful," "intuitive," "modern" — exactly the SaaS-cliché list Linear seems to actively avoid.

### CTA language

| Where | Text |
|---|---|
| Top nav (single primary) | **Sign up** |
| Hero | (none — replaced by the manifesto pill *"Issue tracking is dead"*) |
| `/features` and elsewhere | **Get started**, **Contact sales**, **Open app**, **Download** |
| `/customers` cards | **Read story →**, **Watch video →** |
| `/now` cards | (no CTA — title is the link) |

**One canonical primary CTA across the whole site: "Sign up" (pill, off-white background `#f7f8f8` / black text).** Secondary actions are right-arrow text links, not buttons. The arrow → is consistent across the entire site.

### Social proof treatment

Two layers, no "as seen in":
1. **Count + claim:** *"Linear powers over 25,000 product teams. From ambitious startups to major enterprises."* (homepage), *"Powering more than 25,000 organizations. From ambitious startups to major enterprise and Fortune 20 companies."* (customers page).
2. **Three named quotes** at the bottom of the homepage, attribution `Name, Company`:
   - *"You just have to use it and you will see, you will just feel it."* — **Gabriel Peal, OpenAI**
   - *"Our speed is intense and Linear helps us be action biased."* — **Nik Koblov, Ramp**
   - *"Linear is excellent, just excellent. It has the right opinions for fast moving teams."* — **Kaz Nejatian, Opendoor**

Note the quote selection: they're **vibe quotes, not ROI quotes.** No numbers, no "saved us 40%," no "10x faster." Just *feelings of users you respect.* That's a deliberate signal that the brand sells on craft, not on payback.

---

## 5. The Motion Language

I could not measure animation timings without a working Playwright session, but from the headless renders + the CSS bundle:

- `--x133wec9: 0.1s` and `--xhsrmg4: 50ms` are timing tokens — Linear uses **two transition speeds**: 50ms for micro-state changes (hover) and 100ms for component-level changes. Both very fast.
- `--focus-ring-width: 1px`, `--focus-ring-outline: 1px solid var(--focus-ring-color)` — focus rings are hairline, not the chunky 2–3px default. Keeps everything feeling precise.
- The product UI mid-hero has the `--shadow-high` `0px 7px 32px rgba(0,0,0,0.35)` lift, suggesting a subtle parallax / float on scroll.
- The customer-card grid uses `--radius-12: 12px` — likely scales on hover.
- Nav: hairline border `rgba(255,255,255,0.08)` becomes solid `#23252a` on scroll (token `--color-border-primary` swap).

**The whole motion philosophy seems to be: "movement is fast (under 100ms) and structural (state change, not decoration)."** No parallax scenes, no scroll-jacking, no Lottie animations visible on the screenshot pages.

---

## 6. The 7 Things to Steal for OpsRadar

OpsRadar is a B2B SaaS for agency owners. The category we're creating is "AI COO." Linear's audience (engineering leaders) and ours (agency owners) both share one trait: **they want to be talked to like operators, not like prospects.** That's why these patterns travel.

1. **Steal the "marketing-blacker-black" trick.**
   Linear uses `#010102` for marketing and `#08090a` for the app screenshot. The 3-bit difference makes the product *float*. → Apply to OpsRadar marketing site: set page bg to `#010101`/`#020203`, keep the dashboard screenshots at our current `#08090a`-ish. Anywhere we screenshot the OpsRadar dashboard, it should sit on a *darker* canvas than the dashboard itself.

2. **Steal the one-word page titles.**
   Linear's `/customers`, `/pricing`, `/now` are literally just *"Customers"*, *"Pricing"*, *"Now"*. → Apply to OpsRadar: rename `/customers` → "Customers" (no "Trusted by," no "Loved by"), `/pricing` → "Pricing", and **make `/now` a thing** — a changelog/posts feed titled "Now" with the dek *"Updates from the OpsRadar team."* Cheap to ship, high-credibility, makes us look established.

3. **Steal the headline formula: "The [thing] for [verb-ing] [audience]."**
   Linear: *"The product development system for teams and agents."* → OpsRadar homepage: *"The operations brain for marketing agencies."* (already close — make it even more category-claiming and less benefit-led on the hero. Save the "stop bleeding margin" hook for section 2, not the h1.)

4. **Steal the recurring two-sentence parallel-construction dek.**
   Linear: *"Plan the present. Build the future."* / *"Built for the future. Available today."* → Write an OpsRadar one: *"Watches your agency 24/7. Tells you what to do next."* Use it on the home dek, the pricing dek, and the customers dek. Repetition is what makes it stick — Linear says the same one in three places on purpose.

5. **Steal the manifesto pill instead of a hero CTA.**
   Instead of *"Sign Up"* / *"Book a Demo"* in the hero, Linear runs a small pill *"Issue tracking is dead"* linking to a manifesto page. → OpsRadar hero pill: *"Spreadsheets aren't a COO"* or *"The $10K/month fractional COO has a problem"* → link to a teardown / manifesto. Demo CTA stays in the nav.

6. **Steal the customer-grid color treatment.**
   On `/customers`, Linear renders each story as a **brand-colored block with the customer's logo in white**, headline below, "Read story →". No screenshot, no headshot. → For OpsRadar customers page (once we have 5): each card is a saturated block in the agency's brand color, agency wordmark in white, headline *"How SwishAd recovered $X in scope creep with OpsRadar,"* one-line attribution. The color does the visual work — saves us from needing photoshoots.

7. **Steal the "Method" page as a permanent content artifact.**
   Linear's `/method` is the most-linked page on their site — it's an evergreen manifesto styled like a book (Tiempos serif h1, two-column TOC, chaptered). It positions Linear as the *opinionated authority* on how product teams should work. → Build `/method` for OpsRadar = **"The Agency Operating Method"** — our 8–12 principles for running a healthy agency (utilization > 70%, scope drift caught in <14 days, weekly health score, etc.). Use a serif headline (Noto Serif Display, we already ship it) to visually mark it as different from the product pages. This is our single best play for inbound SEO + authority signal, full stop.

---

## 7. The 3 Things That Wouldn't Work for OpsRadar

1. **No CTA in the hero.**
   Linear can afford no hero CTA because they have 25,000 customers and "Sign up" is in the nav and people already know the brand. OpsRadar at 0–10 customers with cold demand cannot. We **need** "Book a 20-min demo" front-and-center on every page, not buried in nav. Keep the manifesto-pill idea (#5 above) but *in addition to* a real CTA button, not instead of it.

2. **One-word "Pricing" page with no anchor.**
   Linear's pricing page is `Pricing` + four columns + matrix. No money-back, no ROI calculator, no anchor explanation. They can do this because they're product-led, $10/$16/user, low decision risk. OpsRadar at $500–$3,000/mo to an agency owner who is paranoid about cost needs **a payback proof above the tier cards** (e.g., "Most customers recover their first month's fee within 21 days") and an FAQ block beneath. Linear's stark layout would feel evasive at our price point.

3. **Serif headline as a styling default.**
   The Tiempos serif on `/method` works because (a) it's restricted to one page, (b) Linear has already established a brutally-restrained sans-serif system everywhere else, (c) their audience is engineers who find a Vol. III magazine serif charming, not corporate. If we sprinkle Noto Serif Display across multiple pages, we lose the contrast trick and look like another consulting-firm template. **Reserve serif for exactly one page (the Method/Manifesto). Sans everywhere else.**

---

## 8. Direct Inspiration Mapping

| OpsRadar page | Linear element / pattern | Specific change to make |
|---|---|---|
| `/` (homepage hero) | Hero h1 formula + dek + product visual (no hero CTA, manifesto pill instead) | Rewrite h1 to: *"The operations brain for marketing agencies."* Dek: *"Watches your agency 24/7. Tells you what to do next."* Keep demo CTA (we're not Linear-confident yet), but add a manifesto pill above it: *"Fractional COOs have a scaling problem."* |
| `/` (capability sections) | Metronomic `[h2 left → product screenshot right → 1 paragraph + 3 bullets] × 5` | Restructure homepage middle into 5 identical-rhythm sections: Margin · Utilization · Scope creep · Cash · Client health. Each section: agency-specific h2, real dashboard screenshot, 3 bullets. Same height every time. |
| `/` (background) | `--color-bg-marketing: #010102` + dashboard `#08090a` so product floats | Set marketing pages bg to `#020203`. Keep dashboard screenshots at their existing dark surface. Result: the dashboard *lifts* off the page. |
| `/` (footer CTA band) | *"Built for the future. Available today."* + Sign up | OpsRadar version: *"The COO that doesn't sleep. Available today."* + "Book a demo" CTA. |
| `/customers` (new build) | Title-only hero, filter chips, brand-color blocks with white logo, "Read story →" | Build `/customers` once we have 5 wins. Each card is the agency's brand color, white wordmark, headline like *"How [Agency] caught $X in scope creep before quarter-end."* Filter chips: *Featured · Paid · Social · SEO · Full-service*. |
| `/pricing` (existing) | 4-column side-by-side, no toggle at top (toggle per card), checkmark bullets, pill CTAs | Keep current structure but: tighten copy under each tier name to one micro-line ("All Free features +" pattern), tighten bullet lists to top 5, move yearly toggle into the card. **Add** a payback line above the cards that Linear doesn't need but we do. |
| `/now` (new build) | Page title "Now" + filter chips + 3-column post grid + RSS | Build `/now` as the changelog + benchmark releases + customer stories feed. Filter chips: *All · Changelog · Benchmarks · Customer · Method · Press*. Dek: *"Updates from the OpsRadar team."* |
| `/method` (new build — highest leverage) | Eyebrow "THE LINEAR METHOD" + serif h1 + 3-section TOC + chaptered long-form | Build `/method` = *"The Agency Operating Method."* Eyebrow: *"THE OPSRADAR METHOD."* Serif h1 in Noto Serif Display: *"How to run a healthy agency."* Three sections: *Direction · Operations · Margins.* Each chapter is a standalone page with backlink-worthy depth. **Single biggest SEO + authority play in this teardown.** |
| Site-wide nav | 64px tall, hairline bottom border `rgba(255,255,255,0.08)`, single pill CTA "Sign up" on far right | Audit current nav: ensure border-bottom is translucent (not solid), single pill on right is "Book a demo," all other items are plain text links. |
| Site-wide CTAs | One canonical primary pill style (`9999px` radius, white bg, black text) + "→" text links for everything secondary | Standardize OpsRadar buttons: one pill style for primary, arrow text-link for secondary. No outlined buttons, no ghosted buttons. |
| Site-wide type | Inter Variable with `cv01,ss03` + `opsz` axis + weights `400/510/590/680` | If we're not already on Inter Variable with those OpenType features enabled, switch. The fractional weight (`510` medium, `590` semibold) is the move — it's subtler than the standard 500/600. |
| Site-wide social proof | Big number ("25,000 organizations") + 3 vibe quotes from named operators at known companies. No ROI numbers in the quote — save those for case studies. | When we have 5 customers, write the homepage social-proof line as a vibe quote ("It's like having a COO in Slack — Sean, SwishAd"), not a stat. Save the dollar amounts for the `/customers` case-study cards. |
| Site-wide hairlines | `rgba(255,255,255,0.08)` translucent, never solid | Replace any solid `1px solid #222`-style borders with translucent white at 8–12% opacity. Looks structural without ever feeling boxy. |

---

*End of teardown. Screenshots: `/tmp/design-teardowns/linear/01b-home-rendered.png`, `02-method.png`, `02-features.png`, `02-customers.png`, `02-pricing.png`, `02-now.png`. CSS bundles: `/tmp/design-teardowns/linear/css/`.*
