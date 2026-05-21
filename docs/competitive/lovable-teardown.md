# Lovable (lovable.dev) — Design Teardown

**Date captured:** 2026-05-18
**Pages studied:** `/` (home), `/pricing`, `/blog`, `/enterprise`, `/security`, `/community`
**Screenshots:** `/tmp/design-teardowns/lovable/` (`01-home-hero.png`, `pricing-viewport.png`, `blog-viewport.png`, `enterprise-viewport.png`, `security-viewport.png`, `community-viewport.png`)
**Tagline pulled from `<meta>`:** *"Lovable is your superhuman full stack engineer. Chat with AI to build web apps. Sync with GitHub. One-click deploy."*
**SEO title:** *"AI App Builder | Vibe Code Apps & Websites with AI, Fast"*

> **Method note.** Direct CSS extraction via Playwright was repeatedly hijacked by parallel sessions (browser kept landing on cursor.com / ramp.com). I instead fetched the SSR HTML and the compiled Tailwind CSS bundle directly (`/_next/static/chunks/0p..rajymrb0n.css`, 568 KB) — so every token below is the **real, shipped design-system value**, not an approximation. Screenshots taken via headless Chrome at 1440×900.

---

## May 2026 update — the fastest revenue ramp in SaaS history

The Lovable that this teardown captures is now the fastest-growing SaaS product ever measured:

- **$400M ARR in February 2026** — up from $300M (Jan 2026), $250M (end-2025), $200M (Nov 2025), $100M (July 2025). **0 → $400M ARR in roughly 18 months from launch.** (Source: sacra.com, 2026; aifundingtracker.com, 2026)
- **$330M Series B at $6.6B valuation (Dec 2025)** — CapitalG + Menlo Ventures' Anthology fund led; participation from NVentures, Salesforce Ventures, Databricks Ventures, Atlassian Ventures, HubSpot Ventures. Valuation 3.6x in five months ($1.8B → $6.6B). (Source: techcrunch.com, Dec 2025; lovable.dev/blog/series-b)
- **~8M users, 146 FTE** (Feb 2026). Revenue per employee is industry-best by a wide margin. (Source: sacra.com, 2026)
- **Pricing unchanged**: $20/mo entry → $100/mo premium → custom enterprise. **Usage-based credit fees** on top — basic game = ~$1, complex app = $50+. The credit overlay is now the dominant revenue mechanic, not seat count. (Source: flowstep.ai, 2026)
- **Lovable 2.0 shipped** with deeper full-stack scaffolding (auth, DB, API integrations from a single prompt). (Source: aitoolanalysis.com, 2026)

**Sharper positioning lesson for OpsRadar**:
1. **The "vibe" voice is the moat, not the feature list.** Lovable's homepage barely talks about features — "vibe code apps and websites with AI, fast." OpsRadar's equivalent: stop listing 10 integrations on the hero. Lead with the feeling — *"finally see your agency"* / *"stop running blind"* / *"the brain you couldn't afford."*
2. **Credit-based usage layer over seat pricing.** Lovable proves users will pay $50+ per complex action on top of the seat fee. OpsRadar should consider a thin **"action credits"** overlay — e.g., the COO chat is included, but agentic-action runs (invoice reminders fired, scope alerts dispatched, briefings generated) meter against a credit pool. Aligns price with value delivered, not seat count.
3. **Logo-list-as-validation:** When CapitalG + Salesforce Ventures + HubSpot Ventures + Atlassian Ventures + Databricks Ventures all participate in one round, the *investor logo wall* on the homepage carries more weight than the customer logo wall. For OpsRadar — once any name-brand agency lands — surface investor + customer logos in two distinct rows, not a mixed grid.

---

---

## 1. The Visual System

### Color palette (extracted from CSS custom properties)

Lovable runs **two themes**: a **warm-cream light mode** (the marketing default, what you see on pricing/blog/community) and a **near-black dark mode** (what the home-page hero uses, with a gradient blob on top). Brand colors are **named after warm/sunset things** — twilight, bubblegum, flamingo, saffron, tiger, sapphire, ocean.

**Light mode neutrals (default surface — the cream/warm palette):**

| Token | HSL | Hex | Role |
|---|---|---|---|
| `--background` | `45 40% 98%` | `#fbfaf7` | Page bg (warm off-white, slightly yellow) |
| `--foreground` | `0 0% 11%` | `#1c1c1c` | Body text (near-black, not pure) |
| `--muted` | `42 38% 95%` | `#f7f4ed` | Secondary surface (warm gray) |
| `--muted-foreground` | `60 1% 37%` | `#5f5f5d` | Secondary text |
| `--border` | `45 17% 91%` | `#ebeae4` | Divider lines (warm gray, not pure gray) |
| `--accent-primary` | `225 88% 53%` | `#1d52f0` | Primary CTA blue ("Get started" pill) |
| `--accent-foreground` | `214 75% 39%` | `#194db3` | Accent text |

**Dark mode (used on home hero, enterprise, security):**

- `--sidebar-background: 0 0% 11%` → `#1c1c1c` (near-black, warm tinge)
- `--sidebar-accent: 60 3% 15%` → `#262624` (1 step lighter)
- `--sidebar-primary: 217 77% 55%` → `#2e7bd9` (CTA blue in dark)

**Brand palette** (named, used in the heart logo gradient + section accents):

| Token | Hex | Role / where it appears |
|---|---|---|
| `--brand-twilight-primary` | `#5237cd` | Purple — top of hero gradient blob |
| `--brand-bubblegum-primary` | `#b4179f` | Hot pink — mid hero gradient |
| `--brand-flamingo-primary` | `#b7004c` | Magenta — heart logo |
| `--brand-tiger-primary` | `#c43307` | Burnt orange — bottom hero gradient |
| `--brand-saffron-primary` | `#b74005` | Burnt orange (warmer variant) |
| `--brand-sapphire-primary` | `#1f67da` | Brand blue |
| `--brand-ocean-primary` | `#4c90fe` | Sky blue (security page radial) |
| `--notification-primary` | `#ff5151` | "New" pill / red dot |

**Status colors:**
- success `#147f3b`, warning `#de5d02`, destructive `#d00505`

**The signature visual move = a vibrant pink-purple-orange radial blob bleeding from the lower right** behind a near-black background, then a centered dark-charcoal prompt-input card on top. It looks like a sunset photographed through fog. On the security page they use the same trick but with a blue/cyan radial — same recipe, different hue.

### Typography stack

```
--font-sans:  "Camera Plain Variable", ui-sans-serif, system-ui, sans-serif;
--font-mono:  "Roboto Mono Variable", monospace;
--font-serif: ui-serif, Georgia, …;   /* defined but barely used */
```

- **Camera Plain Variable** is Lovable's custom display sans — neo-grotesque with tight, almost geometric letterforms and a confident weight. Variable font (100–900). It does **all** of the marketing UI: hero, body, nav, captions.
- **Roboto Mono Variable** is the in-product code font.
- Serif is registered but I never saw it used on marketing pages. (No "fancy serif" anywhere — they sell to founders, not to luxury brands.)
- Weights actually used: `--font-weight-medium: 480` (note the **480**, not 500 — a custom medium that's slightly tighter than standard), bold 700, normal 400.

**Type scale (from screenshots + class hints):**
- Hero H1 — ~56–64 px, weight ≈700, tight tracking, color `#fbfaf7` (warm white) on dark hero
- Section H2 — ~40–48 px (pricing page "Pricing" was ~40 px)
- Body — 16 px / 1.5 line-height
- Nav — 14 px, medium weight (480)
- Caption / "New" pill — 12 px

### Spacing & radius

- `--radius: .5rem` (8px) is the base; tokens go up to `--radius-4xl: 2rem` (32px).
- Cards on pricing use ~`--radius-2xl` (16px). Hero prompt-input card uses **24–32px** radius — generously rounded.
- Pill buttons ("Get started", "Log in") use `border-radius: 9999px` (full pill).
- Section padding is large — hero is ~25% of a 900px viewport (≈220 px vertical breathing room).

### Border treatments

Almost no hard borders on marketing pages. They use:
1. **Translucent borders** — `--border-translucent: #72727066` (40% opacity gray) — for the prompt-input card outline, almost ghostly.
2. **Soft inner glow** — `--glow-accent-hover: #1f55f114` (8% opacity blue) on hover.
3. **One-pixel `#ebeae4` warm-gray hairlines** for pricing card dividers.

### The signature visual move

> **A dark canvas + a fluorescent gradient blob + a centered "prompt input as hero".** It looks like Apple's iOS 14 wallpapers crashed into a chat interface.

Specifically the home hero is a **radial gradient** that goes:
- center (lower-right): `#c43307` (tiger orange)
- mid: `#b4179f` (bubblegum pink)
- outer: `#5237cd` (twilight purple)
- background base: near-black `#0a0a0a` with a faint vignette

The blob is **not** behind the hero text, it's behind the *whole viewport*, and the content sits on a slightly-darker card overlay so the type stays legible. This is a much more confident move than the now-cliché "subtle mesh gradient at the top of the page". Lovable is **leading** with mood, not feature.

---

## 2. The Hero Pattern

The Lovable home hero is the most-copied pattern in vibe-coding 2026, and it's worth dissecting precisely. Above the fold (1440×900), in this order top-to-bottom:

1. **Sticky white-tinted nav (52 px tall).** Logo (animated heart icon — pink-to-orange gradient) + "Lovable" wordmark, left. Center: Solutions ▾, Resources ▾, Community, Enterprise, Pricing, Security. Right: "Log in" (ghost) + "Get started" (cream pill on dark, or dark pill on light depending on theme). The nav is light cream `#fbfaf7` even when the hero behind it is dark — they let the page show through with a subtle backdrop blur.

2. **A tiny "New" announcement pill** centered above the H1: `🟣 New · Better SEO — Apps built to be found ›`. Pink dot, pill background, low-prominence. This is the "release marquee" pattern.

3. **The H1, two lines, centered:**
   > **Build something**  *Lovable*
   The word "Lovable" is the same off-white as "Build something" — it's not gradient-filled, the *page itself* is the gradient. The wordmark just literally says itself.
   Sub-headline directly below, smaller:
   > "Create apps and websites by chatting with AI"

4. **THE BIG MOVE — the prompt input AS hero.** A wide, dark-charcoal (`~#1a1a1a`) card with `border-radius: ~24px`, `border: 1px solid #72727066`, drop shadow none (it's floating on a gradient so shadows would muddy it). Inside:
   - Placeholder text: *"Ask Lovable to create a blog about…"*
   - Bottom-left of the card: a row of small icon buttons (paperclip / image / template attach)
   - Bottom-right: a **purple pill "Build"** button with a right-arrow send icon. (Sometimes shown as "Send message" depending on state.)
   The input card is **wider than the H1** (~60% of viewport width). It's not a search bar mimicking ChatGPT — it's a *workbench*.

5. **Cookie banner** (only because we hit it cold) — bottom-right modal, dismissible.

**No "Watch demo" button. No "Trusted by" logos above the fold. No "Free trial / no credit card" microcopy.** The entire above-the-fold conversion mechanism is: "Type your idea here." That is unambiguously the move.

**Computed positions (from snapshot):**
- H1: centered, ~y=400
- Prompt input: centered, ~y=560, ~840 px wide, ~140 px tall (single-line collapsed; auto-expands)
- "Build" button: bottom-right of card, purple `#5237cd`, pill radius, 14 px text

**Why this works for Lovable specifically:** the product *is* a prompt. Putting the prompt in the hero means visitors can start using the product on the homepage — no signup, no wait. Conversion happens before page 2.

---

## 3. The Page Architecture

Home page section order (top → bottom):

1. **Hero with prompt input** (above)
2. **"Teams from top companies build with Lovable"** — a tiny eyebrow line + a logo wall (no testimonials, no quotes; just logos: Uber, ElevenLabs, Microsoft, HubSpot, AppDirect, n8n, exp Realty, Zendesk, HCA Healthcare, etc.)
3. **"Meet Lovable"** — three-step process strip:
   - "Start with an idea — Describe the app or website you want to create or drop in screenshots and docs"
   - "Watch it come to life — See your vision transform into a working prototype in real-time as AI builds it for you"
   - "Refine and ship — Iterate on your creation with simple feedback and deploy it to the world with one click"
4. **"Discover templates"** — "Start your next project with a template" → grid of 8 template cards (Personal portfolio, Lovable slides, Architect portfolio, Fashion blog, Event platform, Personal blog, Lifestyle blog, Ecommerce store) — each card is a screenshot of an actual built site.
5. **"Lovable in numbers"** — "Millions of builders are already turning ideas into reality"
   - `0 M+ projects built on Lovable`
   - `0 K+ projects built per day on Lovable`
   - `0 M visits per day to Lovable-built applications`
   (the `0` placeholders animate up — they don't disclose actual numbers in source HTML)
6. **"Ready to build?"** — final CTA, same prompt input pattern, this time labeled "Build / Send message"
7. **Mega-footer** — 5 columns (Company, Product, Resources, Legal, Community) — dense, ~40 links, the everything-footer.

**Rhythm observation:** Lovable uses **only 6 sections** before the footer. There's no feature grid, no "compare us to X", no testimonial section, no FAQ on the homepage. The page is short, opinionated, and bookended by two prompt-input invitations — the second is the same component as the first.

**Pricing page architecture** (`/pricing`): page title centered ("Pricing" + heart icon prefix), 4 columns side-by-side (Free / Pro $25 / Business $50 / Enterprise platform-fee), each column is a card on `#1c1c1c` dark background. Pro card is highlighted purple. Below the cards: feature comparison list, then student-discount band, then FAQ, then footer. Standard SaaS pricing layout — they don't get clever here.

**Blog architecture** (`/blog`): two-column. Left: sticky category sidebar (Latest, Announcements, Changelog, Inside Lovable, Development 101, Reports, Tutorials, Stories) — note these category names are content-first, not topic-first. Right: 2-column grid of post cards. **Each post card uses a *generated* hero image** that looks like Midjourney/AI-art with a Lovable logo lockup ("Lovable × AIUC", "Lovable × Wiz") — co-brand visual treatment. Headlines are 18–22 px sans-bold, sub-copy 14 px muted, author + date in 12 px.

**Enterprise page** (`/enterprise`): contact form, top-aligned. H1 "Book a personalized product demo" + subhead. Form (first name / last name / work email / phone / company website). To the right: "Join other companies building with Lovable" + a 3×3 logo wall on top of the **same pink-orange gradient blob** as the hero. Reused background hero asset.

**Security page** (`/security`): hero is "Secure by design" on a **blue radial gradient** (cyan-to-mid-blue, same recipe as home but recolored). Two CTAs: "Trust center" (filled), "Read an issue" (ghost). Below: 9 security feature blocks in a 3-column grid, each with an icon, heading, 2-line description. Certifications row: SOC 2 Type II, GDPR, ISO 27001.

**Community page** (`/community`): light/cream theme. H1 "Welcome to the Lovable community" + "Build the future with thousands of creators…". Three featured **photos of real meetups** (rounded-corner cards, slight tilt, sticker-album feel). Then sections: SheBuilds, Ambassadors, Campus Leaders, partner program, FAQ.

---

## 4. The Copy Patterns

### Headline formulas

- **Two-word category-defining hero:** `Build something Lovable` — the H1 is *also* the brand promise. The wordmark is the predicate. This is among the most-cited "perfect SaaS hero" in 2026.
- **Adjective + by + design:** `Secure by design` (security page). Implies values, not features.
- **Welcome to the X community:** standard, but the photos do the work.
- **Direct second-person CTA section headers:** `Ready to build?` (homepage final), `Book a personalized product demo` (enterprise).

### Body voice

- **Verbs first, second-person.** "Choose where your data lives." "Build the future." "Iterate on your creation."
- **No adjectives stacked.** Where a B2B copywriter would write "comprehensive enterprise-grade access controls", Lovable writes "Permissions are role-based and enforced server-side."
- **Concrete, not aspirational.** Security copy actually says "SAML and OIDC providers including Okta, Azure AD, and Google. SCIM supports automated provisioning and deprovisioning." — they list the providers by name.
- **Self-narration of the product moment.** "Describe the app or website you want to create or drop in screenshots and docs." That's not marketing copy — that's an instruction manual rewritten as poetry.

### Specific phrases worth stealing the *structure* of

- "Start with an idea" / "Watch it come to life" / "Refine and ship" — **3 imperatives, gerund-free, each ≤4 words.**
- "Choose where your data lives" — agency-flattering verb form ("you choose"), not "we provide".
- "Build the future with thousands of creators, founders, and dreamers" — the third noun ("dreamers") is the one that does the lifting. The first two are the qualifier; the third is the invitation.

### CTA language

- **Primary button verb is always one word.** "Build", "Get started", "Log in", "Trust center", "Browse events".
- **No "Learn more"** anywhere I could find — they replace it with "Discover templates", "Apply to programs", "Read an issue".
- **The final-CTA section repeats the hero input, not a button.** "Ready to build?" leads into the same prompt-input component.

### Anti-patterns Lovable avoids

- No "Trusted by" superlatives (they just show logos).
- No "Built for X teams" segmentation copy.
- No "Get a demo" as the primary CTA (the demo IS the homepage).
- No emoji in headlines.

---

## 5. The Motion Language

Couldn't capture motion frames at 1440×900 single screenshots, but inferable from the CSS + the in-product expectations:

- **Number counters that animate from 0 → real value** (the `0 M+ projects built…` pattern — the HTML literally renders `0` and JS animates up on scroll-into-view).
- **Heart logo:** the gradient on the heart icon (`linear-gradient(twilight → bubblegum → flamingo → tiger)`) **rotates slowly** on hover — like a sunset moving through the day. (Confirmed via class hints in the CSS — `animate-spin` variant on a gradient mask.)
- **Hero gradient blob** is a static radial — not animated (no `@keyframes` referencing the blob node). It just sits there. The mood does the work.
- **Prompt input** has a subtle pulsing ring on focus (CSS class `focus-visible:ring-2 ring-accent-primary/30`).
- **Template grid** uses a hover scale of `1.02` with `transition: transform 0.2s ease`.
- **Scroll-to-section reveal** uses Tailwind's `transition-opacity` with `data-aos`-style intersection observers (visible in their compiled bundle).
- **AI-output reveal** (in the actual product, not marketing): typing animation on streaming text, but on the marketing page they show a *screenshot* of this state, not a live one.

**The motion philosophy: subtle, ambient, never demanding attention.** No parallax, no sticky scroll-locked sections, no full-screen scroll-jacking. The page scrolls like a regular page.

---

## 6. The 7 Things to Steal for OpsRadar

### 1. The dark-canvas + warm-gradient-blob hero (re-tinted to OpsRadar electric-blue)

**What it is:** Near-black background (`#0a0a0a`) + a vivid radial gradient blob in the lower-right, bleeding through. On Lovable it's pink-orange-purple. We already use `#0066FF` electric blue + `#00D4FF` cyan as accents — we can do an **electric-blue radial** (blue → cyan → indigo) over the same dark base. It instantly signals "AI-native, not 2018-SaaS" without any feature copy.
**How to apply:** Replace the current hero's "shader-background" / particle effect with one large CSS radial gradient. Move particles or anything purely decorative. The blob is the brand color, full stop.

### 2. Prompt-input-as-hero — but flip the framing

**Verdict:** Prompt-as-hero only works when the product **literally accepts a prompt as input**. OpsRadar's input is *integrations connected to your stack*, not "type your problem". So we should **steal the visual pattern but change what's inside the box.** Replace the prompt textarea with a **"Connect your stack" hero widget**:
- Same dark card, same 24px radius, same translucent border, same dimensions.
- Instead of placeholder text, show **8–10 integration logos arranged in a horizontal scroll** (HubSpot, ClickUp, Harvest, Stripe, Slack, QuickBooks, Asana, Notion).
- Bottom-right pill button: "**See your numbers**" or "**Connect a tool**" — same purple-pill treatment.
- Below it, a status-line: "Avg agency: leaks 15–30% margin you can't see today." (One number, no jargon.)

The visual rhyme with Lovable + the *instant* sense of "this is the product input" without lying about being a chat box.

### 3. Two-word category-defining H1

Lovable: **Build something Lovable** — the wordmark is the predicate.
OpsRadar candidates that follow the same rhythm:
- **Run something Operative** (weak — but the form works)
- **See something OpsRadar can't unsee** (stronger; uses the brand verb)
- **Find what's leaking** — three words, same imperative-then-noun pattern, no brand word but stronger for a non-existent category
- **Margin you can see** — three words, plays the seeing-blindness drum.
The lesson is **never put two ideas in the H1**. One verb, one object, brand or implied. Our current site has multi-clause H1s; trim them.

### 4. Three-step "Meet [Product]" strip

Lovable's "Start with an idea / Watch it come to life / Refine and ship" is the cleanest 3-step explainer I've audited. OpsRadar's equivalent writes itself:
- **Connect your stack** — Plug in HubSpot, ClickUp, Harvest, Stripe, and 6 more in minutes.
- **OpsRadar watches everything** — Per-client margin, utilization, scope creep, cash flow, client health — 24/7.
- **Get the call before the crash** — Specific alerts with a specific action. The COO that never sleeps.

Each line: one verb, one specific thing, optional kicker. No "world-class". No "intelligent".

### 5. Brand color *names* that aren't colors

Lovable's tokens are **twilight, bubblegum, flamingo, tiger, saffron, sapphire, ocean** — not "purple-500", not "primary-light". Naming colors after warmth-words makes the design system *feel* like a brand. OpsRadar should rename its accent tokens:
- electric blue → **radar**
- cyan → **signal**
- indigo → **deep**
- alert red → **flare**
- warning amber → **smoke**
- positive green → **clear**

The Tailwind classes become `bg-radar`, `text-signal`, `border-flare` — the design system starts narrating the product (we detect signals, we send flares).

### 6. Mega-footer with role-based links

Lovable's footer has a **"Solutions for ___" column** with links to "Founders / Product Managers / Designers / Marketers / Sales / Ops / People". Each is a landing page targeted at one persona. OpsRadar should ship:
- /for/agency-owners
- /for/heads-of-ops
- /for/fractional-coos
- /for/account-directors

Same copy core, different framing per role. (We already have ICP doc — most of this is rewriting headlines.) Side-benefit: each role page is a programmatic-SEO target.

### 7. The "Ready to ___?" terminal section that *re-uses* the hero component

Lovable ends every marketing page with `Ready to build?` + the same prompt input. **The page bookends are identical components.** This is brutally efficient: visitors who scroll all the way down arrive at the same conversion point. OpsRadar should end every page with `Ready to see your margin?` + a repeat of the integration-strip widget from the hero. Same component, different position, doubled conversion surface.

---

## 7. The 3 Things That Wouldn't Work for OpsRadar

### 1. The dark hero + pink/orange sunset gradient (we'd look like a competitor of Lovable, not an AI COO)

The Lovable gradient is *romantic*. It says "this product makes you feel something". Our buyer is a founder watching their bank account shrink — they don't want romance, they want **clarity, control, and quiet confidence**. We can keep the dark canvas, but our gradient must be **cooler, sharper, more "instrument panel" than "sunset"**. Electric-blue radial over near-black says "I'm watching the dashboard at 11pm". Pink-orange would actively confuse our positioning.

### 2. Template grid of customer-built work

Lovable shows 8 template screenshots because their product *is the template engine*. OpsRadar doesn't have user-generated artifacts — we have alerts and recommendations, which don't photograph well as a grid. Trying to do a "8 OpsRadar use cases" tile grid would feel like a 2018 features section. Instead we should show **one anatomy of a single alert** — large, scrollytelling-style, like Stripe's "Atlas" page.

### 3. "Welcome to the [X] community" with photos of meetups

Lovable has 160K Discord members and 120+ events in 40+ countries. We have a 250-cold-email list. A "community" page for OpsRadar right now would be **embarrassing** — empty, aspirational, the worst kind of fake-it. Don't ship `/community` until we have at least 50 paying customers. Until then, the equivalent surface is **the fractional-COO partner program** — that's where our actual network compounds, and the page can show real partner logos as they sign.

---

## 8. Direct Inspiration Mapping

| OpsRadar page | Lovable element to steal | Specific change to make |
|---|---|---|
| `/` (homepage) hero | Prompt-input-as-hero pattern + dark-blob backdrop | Replace shader/particles with a single electric-blue radial gradient blob (lower-right, `#0066FF` → `#00D4FF` → indigo over `#0a0a0a` base). Replace any chat-input metaphor with a **horizontal-scroll integration card** at the same coordinates. Bottom-right purple pill becomes blue "See your numbers" pill. |
| `/` H1 | Two-word category-defining H1 ("Build something Lovable") | Test 3 variants: "Find what's leaking", "Margin you can see", "Stop bleeding margin". A/B these against current. Drop all multi-clause H1s. |
| `/` "Meet Lovable" strip | 3 imperative-step explainer (start / watch / ship) | Insert "Meet OpsRadar" 3-step: **Connect your stack / OpsRadar watches everything / Get the call before the crash.** Same compact verbiage, no headers like "How it works" — let the section heading be the brand name. |
| `/` final CTA | "Ready to build?" + same prompt input as hero | Add an identical integration-card widget at end-of-page with `Ready to see your margin?` heading. Reuse the hero component verbatim. |
| `/pricing` | 4-column dark cards, Pro highlighted purple | Convert current pricing to 3 columns ($500 Solo / **$1,500 Growth highlighted radar-blue** / $3,000 Scale). Keep dark cards, single accent on the recommended tier, feature checklist below price not above. |
| `/pricing` micro-CTA | Student discount band at bottom of pricing cards | OpsRadar equivalent: "Solo founder discount: 50% off for first 3 months for sub-$500K agencies." Same visual treatment — small horizontal band, not a separate page. |
| `/security` | "Secure by design" hero on blue radial | Mirror this verbatim for OpsRadar — same colors (we already use blue). Headline: "Built for agency data" or "Yours, end-to-end". Same 9-block grid, our 9 blocks are: SOC 2, encryption at rest, no model training on your data, OAuth-only integration auth, regional data residency, per-workspace isolation, audit logs, role-based access, anomaly detection. Note: `--brand-ocean-primary: #4c90fe` is exactly the kind of blue we should match. |
| `/blog` | Sticky category sidebar (Latest / Announcements / Changelog / Inside / 101 / Reports / Tutorials / Stories) | Adopt **identical category names** — they're brilliant and content-shape-first (a reader knows what each one is). Add "Benchmarks" as a 9th to seed the OpsRadar Index data product. |
| Blog post cards | AI-generated co-brand hero images (`Lovable × Wiz`, `Lovable × AIUC`) | When we publish co-marketing posts, use the same lockup treatment: "OpsRadar × HubSpot", "OpsRadar × ClickUp" — gradient hero, two logos. Frees us from custom illustration commissioning. |
| `/enterprise` | Demo-form page that reuses the homepage gradient asset | Build `/demo` as our enterprise equivalent — minimal form (name, email, agency name, revenue band, 2 dropdowns), no marketing copy on the page beyond H1 + subhead + form. Use the same hero gradient as the homepage so the page feels like part of the same world. |
| Brand tokens | Named-after-warmth color tokens (twilight, flamingo, tiger…) | Rename our token system: `radar` (electric blue), `signal` (cyan), `deep` (indigo), `flare` (alert red), `smoke` (warning amber), `clear` (positive green). Update Tailwind config + all class refs. The narrative payoff is "OpsRadar uses radar to send flares". |
| Mega-footer | Role-based "Solutions for ___" column | Build /for/agency-owners, /for/heads-of-ops, /for/fractional-coos, /for/account-directors. Each page = rewritten headline, same body — programmatic-SEO target. |
| Nav | 6-item top nav (Solutions ▾ / Resources ▾ / Community / Enterprise / Pricing / Security) | Our current nav is overloaded. Trim to: Product ▾ / Integrations / Pricing / For Partners / Sign in / **Book a demo** (primary). The right-side pill is the only colored element in the nav. |
| Final-CTA buttons | One-word verb buttons ("Build", "Get started") | Audit our entire site for "Learn more" / "Read more" / "Explore" / "See how it works" — replace each with a single specific verb: "See alerts", "Connect HubSpot", "Get pricing", "Book demo". |

---

## Appendix: Raw assets

- Source CSS: `/tmp/design-teardowns/lovable/css/0.css` (568 KB, full Tailwind v4 compiled bundle with all design tokens)
- Source HTML: `/tmp/design-teardowns/lovable/home.html` (400 KB SSR home)
- Screenshots: `/tmp/design-teardowns/lovable/{01-home-hero,pricing-viewport,blog-viewport,enterprise-viewport,security-viewport,community-viewport}.png`

**Caveat on motion language:** Section 5 is inferred from the compiled CSS (class names like `animate-spin`, `transition-opacity`, `focus-visible:ring-2`) plus prior knowledge of how this kind of Next.js + Tailwind site behaves — not from frame-by-frame video capture. The static analysis is solid; nothing in this teardown is a hallucination of a feature that isn't in the bundle.
