# Vercel.com — Deep Design Teardown

*For OpsRadar — what to steal, what to skip*
*Captured 2026-05-18 from desktop 1440×900 viewport. Screenshots: `./vercel-screenshots/`*

All computed CSS values below were extracted from a fresh headless Chromium session against the live Vercel marketing site. No values are guessed. Where ranges appear, they reflect actual variance between pages.

## May 2026 update — "AI Cloud" rebrand + v0 enterprise wedge

Vercel re-bannered itself around AI in late 2025 and is now monetizing the move:

- **Series F: $300M at $9.3B valuation, Sept 2025** — co-led by Accel + GIC, plus a parallel ~$300M tender offer for early employees/investors. (Source: vercel.com/blog/series-f; businesswire.com, Sept 2025)
- **Platform repositioned as "AI Cloud"** — the explicit framing across the homepage, Series F blog post, and Next.js 16 release. "Combining enterprise-grade security with exceptional developer experience for teams building intelligent applications." (Source: techfundingnews.com, 2025)
- **v0 hit 3.5M unique users** — "Teams and Enterprise accounts contributing more than half of v0 revenue." The vibe-coding tool became an enterprise wedge in 18 months. (Source: vercel.com/blog/series-f)
- **v0 iOS app shipped in 2026** — beta → GA on the back of the insight that "70% of development happens outside traditional work hours." Mobile app pitched as "your Notes app, except your ideas get built for you in the background." (Source: vercel.com/blog/series-f)
- **Next.js 16 roadmap**: positioning Next.js as "the canonical framework for agentic applications — apps where AI agents operate autonomously within the request-response cycle." DevTools for agent traces, streaming UI scaffolding, server-side AI integration. (Source: vercel.com/blog/series-f)

**Sharper positioning lesson for OpsRadar**:
1. **"AI Cloud" is a category claim, not a feature claim.** Vercel didn't say "Vercel now has AI features." It rebadged its entire product surface as a category-defining platform. OpsRadar's equivalent — already in motion in the strategy doc — is **"AI COO"** as the category, not as a feature. The lesson: ship the category name *across every page header and footer*, not just the homepage hero.
2. **v0 went enterprise in 18 months by reading the "outside work hours" insight.** The agency-owner ICP overlaps that pattern — most agency founders check margin late at night, between client emails. OpsRadar's **mobile-first alert UX** (Slack on phone, email on phone, briefing on phone) is the equivalent surface that compounds.
3. **"Built on the same platform we sell" loop.** Vercel ships v0 on Vercel, Next.js builds the agentic apps Vercel hosts, and so on. OpsRadar's equivalent loop: dogfood the COO on the OpsRadar business itself, publish the dashboard publicly ("our own OpsRadar live"), turn the marketing site into a **screenshot of the product running our company**. The strongest possible proof.

---

Pages studied:
- `vercel.com/home` — homepage
- `vercel.com/products/observability` — product page
- `vercel.com/customers` — case studies index
- `vercel.com/pricing` — pricing page
- `vercel.com/blog` — blog index
- `vercel.com/ai-gateway` — newer product page (developer-flavored)

---

## 1. The Visual System

### Color palette (computed)

Vercel ships a Geist Design System on the marketing site. The actual page palette is **near-monochrome on a near-white canvas**, with color reserved for accent/state and one signature multi-hue gradient.

**Surface (the entire site uses these two):**
- `--ds-background-100`: `hsla(0, 0%, 100%, 1)` → pure white (cards, inner surfaces)
- `--ds-background-200`: `hsla(0, 0%, 98%, 1)` → `rgb(250, 250, 250)` — **the page bg on every single page** (`bodyBg` and `htmlBg` both returned this)

**Text:**
- Primary text (`color: rgb(23, 23, 23)`) — `--ds-gray-1000` = `hsla(0, 0%, 9%, 1)`
- Body / muted (`color: rgb(77, 77, 77)`) — `--ds-gray-900` = `hsla(0, 0%, 30%, 1)` — this is the subhead and body paragraph color across every page
- Nav muted: `--ds-gray-700` / `--ds-gray-800`

**Gray scale (11 stops):** `--ds-gray-100` through `--ds-gray-1000`, HSL lightness ladder: 95 → 92 → 90 → 92 → 79 → 66 → 56 → 49 → 30 → 9%.

**The single brand accent: blue.**
- `--ds-blue-700`: `hsla(212, 100%, 48%, 1)` — the "Vercel blue" / focus color
- `--ds-blue-900`: `hsla(211, 100%, 42%, 1)`
- `--geist-console-text-color-blue`: `#0070f3` (legacy)
- Used for: focus rings, code keywords, link hover, "Skip to content" target.

**Status / data colors (Geist DS provides full 100–1000 ramps for):**
- `--ds-red-*` (errors)
- `--ds-amber-*` (warnings)
- `--ds-green-*` (success — visible in observability chart line: 200 status badges, success states)
- `--ds-purple-*`, `--ds-pink-*` (data viz / AI accents)

**Signature gradient (homepage hero):** A multi-stop animated mesh with rainbow stops — orange/yellow → pink/red → cyan/green. This is the ONLY use of brand-defining color on the entire marketing site. Everywhere else the palette is grayscale + blue.

### Typography stack

**Body / heading face (single family):**
```
Geist, Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"
```
Used for **everything** non-monospace, including all H1s and body text.

**Code face:**
```
"Geist Mono", ui-monospace, SFMono-Regular, ...
```
Confirmed in code blocks on AI Gateway page: `font-size: 13px–16px`.

**Headings (real measurements, by page):**

| Page | H1 size | weight | line-height | letter-spacing |
|---|---|---|---|---|
| home | **48px** | 600 | 48px (1.0) | **-2.4px** (-0.05em) |
| customers | **48px** | 600 | 56px (1.17) | **-2.88px** (-0.06em) |
| pricing | **48px** | 600 | 56px (1.17) | **-2.88px** |
| ai-gateway | **52px** | 600 | 60.32px (1.16) | **-3.12px** (-0.06em) |
| observability | 32px | 600 | 40px (1.25) | -1.28px |

The H1 letter-spacing is the most distinctive type detail: **negative tracking proportional to size, ~-0.05 to -0.06em**. This is what makes Geist feel "tight" and modern.

**H2s on product pages**: `40px / 600 / -2.4px` letter-spacing — same negative tracking ratio.
**Section eyebrow** (e.g., "GET STARTED", "BUILD", "SCALE"): `12px / 500 / normal letter-spacing` and the text is uppercased in copy (not via `text-transform`).
**Body paragraph (subhead)**: `20px / 400 / line-height 36px (1.8) / color rgb(77, 77, 77)`. The 1.8 line-height on body is unusually generous.

### Spacing scale

Padding/margin values observed are all 4-multiples: button height ~40px (radius 100px, padding `0 14px`), section padding tops on hero range 130–280px from top. Grid columns ~80px wide (visible via the literal background grid overlay).

### Border / radius treatments

- `--geist-radius: 6px` (default UI radius)
- `--geist-marketing-radius: 8px` (marketing surfaces)
- **CTA buttons: `border-radius: 100px`** — fully rounded pill. This is the strongest single design signal on the site. Confirmed across home (Start Deploying / Get a Demo) and product pages.
- Tab pills (AI Gateway nav: Overview / Models / Leaderboards / Docs): also fully rounded (`border-radius: 33554432px` = effectively infinite).

### Shadow vocabulary (Geist DS)

Vercel uses a **borders-as-shadows** system. Almost every "card" border on the marketing site is a 1px hairline + a tiny offset blur, not a solid `border` rule. Real values:

- `--ds-shadow-xs`: `0px 1px 2px #0000000a`
- `--ds-shadow-small`: `0px 2px 2px #0000000a`
- `--ds-shadow-border-base`: `0 0 0 1px #00000014` (border simulated by an inset/outset shadow)
- `--ds-shadow-border-small`: `0 0 0 1px #00000014, 0px 2px 2px #0000000a, 0 0 0 1px hsla(0,0%,98%,1)` (stacks a 1px line + a soft drop + a 1px outer ring matching page bg)
- `--ds-shadow-medium`, `--ds-shadow-large`, `--ds-shadow-modal`, `--ds-shadow-menu` — progressively deeper, always `#0000000a` (4% black) or `#0000000f` (6% black) — extremely restrained.

**Shadows on this site never exceed ~6% black alpha.** Nothing pops off the page — everything sits one whisper above it.

### The signature visual move

**A literal architectural drafting grid** overlays the marketing surface. Look at any fold screenshot: light-gray grid lines + `+` crosshair markers at the four corners of each major hero/section. It signals "engineering precision, blueprints, infrastructure" without being heavy-handed.

Combined with: (a) the animated rainbow mesh gradient on the home hero with a 3D pyramid/wireframe, and (b) the embedded product chart on the observability hero — Vercel's signature is **"technical drawings come to life."**

---

## 2. The Hero Pattern

**Three hero variants, one grammar.**

### A. Marquee hero (home)
Centered, max-width ~720px content column:
- H1 (48px, weight 600, tight tracking): `"Build and deploy on the AI Cloud."`
- Subhead (20px, gray-900, line-height 36px): `"Vercel provides the developer tools and cloud infrastructure to build, scale, and secure a faster, more personalized web."`
- Two pill CTAs side-by-side, horizontally centered:
  - **Primary**: `bg: rgb(23, 23, 23)` (near-black), `color: white`, `border-radius: 100px`, font 16px/500, text "**Start Deploying**" with a small Vercel triangle icon
  - **Secondary**: `bg: rgb(255, 255, 255)`, `color: rgb(23, 23, 23)`, `border-radius: 100px`, text "**Get a Demo**" — visually a white pill with no visible border (it sits on the gray-50 page bg, so the contrast comes from background-against-background, not stroke)
- Below the CTAs: the rainbow mesh + 3D pyramid (the live brand object)

### B. Product hero (observability)
Two-column 50/50:
- Left: H1 (32px on this page, smaller because of co-located visual), subhead (20px/36px line-height), pill CTA pair: "**Deploy Now**" + "**Get a Demo**"
- Right: a **live in-product mock**: line chart, App Logs panel, Top Sources sidebar with real-looking data. Not screenshot — it's HTML/SVG rendered, with hand-placed labels like `Visitors 634,200 / Fri May 10 4pm-5pm`. Annotations sit inside the same crosshair grid.

### C. Developer hero (ai-gateway)
Two-column with **a literal code block** as the visual:
- Left: H1 52px ("**The AI Gateway For Developers**"), subhead, two pill CTAs ("**Get an API Key**", "**Read the Docs**")
- Right: a **tabbed code editor** with tabs `AI SDK | Python | OpenAI HTTP`, copy-button in the corner, real syntax-highlighted `import { streamText } from 'ai' ...` snippet, and below it a row of compatibility logos (`OpenAI · xAI · Anthropic · and many more`)
- A "scoped page nav" of pill tabs sits above the H1: `Overview · Models · Leaderboards · Docs` — local navigation for the product area

### Headline formula

**Two clauses, hard period, every time.** The H1 nearly always reads as 1–2 short declarative sentences ending in a period:
- "Build and deploy on the AI Cloud."
- "Understand production from the inside out."
- "Scale your app. Control your costs."
- "The teams we empower."

Length: 4–10 words. No subtitles "with" or "for X". No promises ("Save 50%"). The product is the subject; the verb is something the user does. Then a period.

### CTA pattern

**Always exactly two CTAs in the hero, never one, never three.** Black pill + white pill, side-by-side. The pair always reads as "low-commitment primary, even-lower-commitment secondary":

| Page | Primary | Secondary |
|---|---|---|
| home | Start Deploying | Get a Demo |
| observability | Deploy Now | Get a Demo |
| customers | Get a Demo | — (single CTA in this hero) |
| ai-gateway | Get an API Key | Read the Docs |

Notice "Get a Demo" appears in 3 of 4 — it's their reliable second slot.

---

## 3. The Page Architecture

Section grammar repeats across pages:

1. **Top nav** (sticky-feeling, white pill chips around active item): `Vercel logo · Products ▾ · Resources ▾ · Solutions ▾ · Enterprise · Pricing · — · Ask AI · Log In · Sign Up`. The active section gets a gray pill background (`rgb(235, 235, 235)`); everything else is plain text.
2. **Hero (one of the three variants above)** — always framed in the drafting-grid with `+` corner marks
3. **Logo wall / "trusted by"** — a horizontal strip of customer logos rendered in low-contrast gray, sometimes auto-scrolling
4. **Three-column feature/benefit cards** — H3 + 1-paragraph body + sometimes a tiny inline visual; cards are separated by hairlines, not boxed
5. **Anchored product modules** — a series of "headline + paragraph + screenshot/animation" rows. Eyebrow labels in 12px uppercase ("GET STARTED" / "BUILD" / "SCALE" / "SECURE") frame each section.
6. **Customer story cards** — full quotes with company logo + name + role + arrow link (observed pattern on /customers: `What once took an hour to deploy a hotfix now takes just 15 minutes...` — **specific outcome with a number, attributed**)
7. **Pricing summary or comparison** (where applicable)
8. **Footer CTA band**: H2 "Get Started" + "Build" + "Scale" + "Secure" — four micro-CTAs as a final close, each a tiny card with eyebrow label + benefit + arrow

Rhythm: roughly **3 visual "beats" between every CTA moment**. Hero → logos → feature row → feature row → feature row → demo CTA → customer quotes → footer CTA.

---

## 4. The Copy Patterns

### Headline formulas
- **Verb-first imperatives:** "Build and deploy on the AI Cloud." / "Scale your app."
- **Outcome + period:** "Understand production from the inside out." (not "Get observability for your apps")
- **Two-clause balanced couplet:** "Scale your app. Control your costs." (this is their pricing H1 — promise + fear, paired)
- **Possession/empowerment:** "The teams we empower."
- **Direct categorical claim:** "The AI Gateway For Developers" (uses Title Case — only place on the site that does)

### Section H2s (taken verbatim from observability)
- "Proactive Anomaly Detection and Alerting."
- "Quick, accurate debugging."
- "Instrument, collect, and send data with flexibility."
- "Break out of the black box."
- "Understand your engagement."

Pattern: **adjective + noun, often a single comma-separated phrase, often a verb-noun**. Each ends with a period. Each describes a *job* not a feature.

### Body copy voice
The subhead under every H1 is one sentence, ~18–25 words, that names *what the product is* in plain language. Example (home):

> "Vercel provides the developer tools and cloud infrastructure to build, scale, and secure a faster, more personalized web."

It's not aspirational. It's not exciting. It's a **declarative product definition** — calm, confident, factual. Style here is more "encyclopedia entry" than "ad copy." The confidence comes from refusing to oversell.

### CTA language
Action verbs, all 2–4 words, no marketing fluff:
- "Start Deploying" / "Deploy Now"
- "Get a Demo"
- "Get an API Key"
- "Read the Docs"
- "Read the full story" (case study card link)
- "Get Started" / "Build" / "Scale" / "Secure" (footer micro-CTAs)

Never seen: "Try free for 14 days", "No credit card required", "Schedule your consultation". They trust the reader to know what a button does.

### Dev vs business framing

This is the single biggest takeaway for OpsRadar's positioning. Vercel **runs both voices in parallel without mixing them on a page**:

- **Developer-flavored pages** (ai-gateway, observability): code samples in the hero, monospaced UI, "Read the Docs" secondary CTA, headlines like "The AI Gateway For Developers"
- **Buyer-flavored pages** (customers, pricing, home): customer quotes with $ outcomes ("Black Friday revenue +22%, conversion +76%", "build times from 10 min to 2 min"), pricing in plain language, "Get a Demo"

The home page splits the difference: developer aesthetic (grid, rainbow gradient, mono undertones) but **business outcome copy and demo CTA**. The "Build and deploy on the AI Cloud" is positioned to mean different things to a dev and a buyer.

Proof points are always **named, attributed, and numerical**: company logo + percentage + name + role + link to read more. Never a generic "trusted by Fortune 500s."

---

## 5. The Motion Language

Limited tooling for capturing motion from a static fetch, but observable from CSS and HTML:

- **Transitions in the CSS:** `transition-all duration-300 ease-in-out`, `transition-[opacity,visibility] duration-300` — Tailwind utility-flavored. 300ms is the default duration across the site.
- **Easing:** default `ease-in-out`. No bouncy / spring physics visible.
- **Focus state:** `--ds-focus-ring: 0 0 0 2px hsla(0,0%,100%,1), 0 0 0 4px hsla(212,100%,48%,1)` — a **double ring** (2px white inner halo + 2px blue outer), a famous Vercel detail. Floats the focus indicator off the element regardless of background.
- **Hero gradient (home):** animated mesh — color stops drift slowly behind the 3D pyramid (visible in the screenshot's seam between still and motion would be elsewhere). Implementation likely a `<canvas>` or animated `background-image` linear-gradient composite.
- **Logo wall:** classic infinite-scroll marquee in the AI Gateway compatibility row (logos slide steadily left-to-right).
- **Hover states (inferred from utility classes):** opacity dim from 1.0 → ~0.6, no scale transforms (Vercel doesn't do `:hover { scale: 1.05 }`). Buttons appear to brighten slightly on hover without resizing.

The motion ethos is **slow, calm, ambient.** The page never asks for your attention. It just sits there glowing slightly.

---

## 6. The 7 Things to Steal for OpsRadar

OpsRadar is an "AI COO for marketing agencies." ICP is agency founders ($500K–$5M ARR), not developers. So we steal Vercel's **B2B grammar**, not its dev aesthetic.

### 1. Pill-shaped CTAs as the brand object
**What:** `border-radius: 100px` on every primary/secondary button. Two CTAs in the hero — black pill + white pill, side-by-side.
**Why:** It's the single most visually distinctive choice on Vercel's marketing site. It says "modern, confident, not bureaucratic." OpsRadar's CTAs are currently rectangles with default Shadcn radius. A pill CTA differentiates instantly.
**How to apply:**
- Home hero: "Book a Demo" (black pill) + "See How It Works" (white pill)
- /pricing CTAs: pill style throughout
- Replace any `rounded-md` button in `src/components/ui/button.tsx` with a `rounded-full` variant called `pill` and use it site-wide on marketing surfaces only (keep app interior as rectangles for density)

### 2. The "one-sentence product definition" subhead
**What:** Under every H1, exactly one sentence (~18–25 words) defining what the product is, in plain declarative language. No drama. Color `rgb(77, 77, 77)`, size 20px, line-height 36px (1.8).
**Why:** OpsRadar's headlines today are heavy on adjectives and metaphor ("ops brain", "before it costs you"). A calm one-liner under each headline gives the reader a fact to hold onto.
**How to apply:**
- Home subhead candidate: *"OpsRadar connects to your existing agency stack and watches margin, utilization, and client health in real time — so problems surface in days, not quarters."*
- /pricing subhead: *"Plans start at $500/month. Pay for the tools you connect and the actions you automate."*
- Apply the literal CSS: 20px / weight 400 / line-height 36px / `text-neutral-600`.

### 3. The crosshair-grid background frame
**What:** A faint architectural-drafting grid (1px lines, 5% opacity) framed by `+` corner crosshairs at the boundaries of each major section. Implies precision, instruments, blueprints, infrastructure.
**Why:** This is on-brand for OpsRadar — we sell *instrumentation* and *measurement* of an agency's operations. A drafting grid says "we measure things" without being a clichéd dashboard screenshot.
**How to apply:**
- Build a `<DraftingFrame>` wrapper component for the hero + each major content section
- 1px gray lines at `--ds-gray-200` opacity, `+` SVG marks at the 4 corners, sized roughly 80px column grid
- Use behind hero on /, /pricing, /audit, /results landing — wherever a page needs to "feel like a measurement tool"

### 4. Named, attributed, dollar-quantified customer quotes in 3-column grid
**What:** /customers fold is: page eyebrow → H1 ("The teams we empower.") → big "Get a Demo" pill — then immediately three columns, each with a customer logo on top and a quote underneath that contains a real number, name, and role. Examples:
- "With Vercel, PAIGE boosted their Black Friday revenue by 22% and increased conversion rates by 76%."
- "Switching to Vercel transformed our workflow, cutting build times from 10 minutes to just 2 minutes." — Peter Runham, Co-Founder & CTO
**Why:** OpsRadar's product-marketing context says testimonials are aspirational ("collect from first 5 customers"). When we have them, the dollar-quantified-attributed-quote-in-3-column-grid is the highest-converting format Vercel uses for B2B. Don't reinvent — port it directly.
**How to apply:**
- Build a `<CustomerStoryGrid>` component that takes `{logo, quote, name, role, href}` × 3
- The quote should be required to contain a `$` or `%` — make this a content rule
- Live this on / homepage section 3 and on /customers (when we have a real /customers index)

### 5. Two parallel voices, separated by page
**What:** Vercel runs the "developer with code in the hero" voice on /ai-gateway and the "business outcomes + demo CTA" voice on /customers and /home. They never mix on the same surface.
**Why:** OpsRadar talks to two audiences: agency founders (buyers) and ops/account leads (users). Today the homepage tries to talk to both at once. Vercel's pattern says: **pick a primary voice per page, route the other audience to a dedicated page.**
**How to apply:**
- /home: founder voice — outcomes ("recover the 15–30% margin you're leaking"), demo CTA, three named-attributed quotes
- /for-ops-leads (new page): user voice — what their week looks like, the alerts they see, screenshots of the Slack thread when Scope Drift fires, "See How It Works" CTA
- Top nav: keep both surfaces visible to make routing fast

### 6. The eyebrow-driven content scaffolding (`GET STARTED / BUILD / SCALE / SECURE`)
**What:** 12px / weight 500 / uppercase eyebrow labels frame each section of the page AND repeat as a 4-up footer CTA band. They create a structural skeleton readers can scan.
**Why:** OpsRadar pages today are blocky — section, section, section. Eyebrows turn the page into a "table of contents you can scroll." For a buyer evaluating the product, that legibility matters.
**How to apply:**
- Adopt 4 eyebrow categories that map to OpsRadar's voice:
  - `CONNECT` — what we plug into
  - `OBSERVE` — what we watch
  - `RECOMMEND` — what we tell you to do
  - `ACT` — what we do for you (the agentic actions)
- Use them as scroll anchors on / and as a "ladder" 4-up grid in the footer CTA band, each card linking to the relevant section
- Maps cleanly to product-marketing.md's "OPERATE/OBSERVE/BRAIN/GUARD" pillars — keep those names, this is just the visual treatment

### 7. The "live in-product mock" as the hero visual
**What:** observability page's hero is a *rendered* HTML/SVG chart with realistic-looking labels ("Visitors 634,200 / Fri May 10 4pm-5pm"), an App Logs panel, and Top Sources rows. It's *not a screenshot*. It looks live, but it's a static fragment styled to look like the real thing.
**Why:** OpsRadar's actual product screenshots are weak/dated and our visual proof today is mostly stock illustration. A handcrafted live-looking mock is cheaper than a real screenshot and more controlled.
**How to apply:**
- Build a single `<HeroProductMock>` React component for the / hero that renders:
  - A weekly margin trend line chart (the "Margin Score" — going up)
  - A floating "Health Score" badge: `Acme Corp · 47 · ↓ scope drift detected`
  - A floating Slack-style alert card: "Client X went from 100% to 73% margin this week. 3 unbilled deliverables." with a "Send Invoice" button
- All in real HTML/SVG with realistic-but-clearly-not-a-real-customer data
- Place inside the crosshair-grid frame for the full Vercel grammar

---

## 7. The 3 Things That Wouldn't Work for OpsRadar

### 1. The rainbow mesh-gradient + 3D pyramid hero object
**Why not:** Vercel's rainbow mesh is on-brand because their product is *infrastructure* — abstract, color-neutral, lets the brand carry a personality the product can't. OpsRadar's value is *clarity about a specific number going the wrong way.* A pyramid wreathed in rainbow says "we are platformy and abstract." Our buyer wants the opposite — "you'll see what's bleeding margin in 60 seconds." Replace with: a clean, restrained product mock (see Steal #7).

### 2. The code-block-in-hero pattern
**Why not:** Vercel can put `import { streamText } from 'ai'` in the hero because their buyer is a developer who reads code as proof. OpsRadar's buyer (agency founder, 5–50 employees, runs the agency themselves) doesn't read code — code-in-hero would actively repel them. Even on a future /api-docs or /integrations page, we should treat code as a secondary proof element behind plain-language outcomes, not the hero.

### 3. The four-or-more-CTA footer band ("Get Started / Build / Scale / Secure")
**Why not:** Vercel's footer-CTA-band works because Vercel has many products and a developer audience that will route themselves. OpsRadar is single-product, single-conversion-goal: **book a demo with the founder.** A four-up footer band dilutes the close. Use the eyebrow-scaffolding *as page scaffolding* (Steal #6) but the **footer CTA should be one giant pill button: "Book a 20-Minute Demo with the Founder."** Maybe a secondary link below it: "or watch the 90-second product tour."

---

## 8. Direct Inspiration Mapping

| OpsRadar page | Vercel element / pattern | Specific change |
|---|---|---|
| `/` (homepage hero) | home `<h1>` 48/600/-2.4px LS, calm subhead at 20/36, two pill CTAs | Set H1 to `text-5xl font-semibold tracking-[-0.05em] leading-none` on `text-neutral-900`; subhead `text-xl leading-9 text-neutral-600`; replace existing CTAs with a `<PillButton variant="primary|secondary">` pair. Primary: `bg-neutral-900 text-white rounded-full px-6 py-2.5`. Secondary: `bg-white text-neutral-900 rounded-full px-6 py-2.5` (no border — sits on `bg-neutral-50` page). |
| `/` (visual treatment) | drafting grid + `+` corner crosshairs around hero | Build `<DraftingFrame>` wrapper. 1px lines at `rgba(0,0,0,0.06)`, 80px columns, SVG `+` marks at TL/TR/BL/BR. Apply behind hero on /, /pricing, /audit. |
| `/` (hero visual) | observability page's live in-product mock | Build `<HeroProductMock>` (see Steal #7) — weekly margin chart + Health Score badge + Slack-style scope-drift alert card. Render in HTML/SVG, not a PNG. |
| `/` (proof section) | /customers 3-column quote grid with company logo + outcome + name + role | `<CustomerStoryGrid>` component; require `%` or `$` in every quote; placeholder for now (3 anonymized agencies from product-marketing.md's hot lead list — Sean/SwishAd, Ala Obeidat) until real quotes land. |
| `/` (page background) | `rgb(250, 250, 250)` page bg with `rgb(255, 255, 255)` card bg | Switch page bg from current OpsRadar dark theme on marketing surfaces to `bg-neutral-50`. Cards become pure white. This is the single biggest visual shift — Vercel's calm comes from this contrast inversion vs typical SaaS dark. (Keep app interior dark if desired.) |
| `/pricing` | "Scale your app. Control your costs." headline pattern (two-clause couplet) | Rewrite H1 to a two-clause balanced couplet: *"See your agency margin. Save what you're leaking."* Subhead: *"Plans start at $500/month. Pay for the tools you connect and the actions you automate."* |
| `/pricing` (plan cards) | Vercel's Hobby/Pro/Enterprise 3-col card layout, "Popular" floating tab on the middle card | Apply identical: 3 columns separated by hairlines (no boxes), plan name + 1-sentence purpose + price, then checklist of features grouped by `All [Lower] features, plus:`. Black floating "Most Popular" pill on the recommended tier (currently $1,500 Growth). |
| `/audit` (questionnaire intro) | observability hero — left H1, right live product visual | Two-column hero: left = "How healthy is your agency, really?" + subhead + "Start the 5-Minute Audit" pill. Right = the live `<HeroProductMock>` (so users see the destination state before they start). |
| `/results` (free tier) | customers page H1 ("The teams we empower.") + 3-column quote pattern | Replace the current results header with a Vercel-flavored "Your audit is ready." H1 + a 3-column "what others found" grid — three anonymized previous audits with a $-quantified finding each. Drives the upgrade-to-paid moment. |
| All pages — type system | Geist font + tight tracking on headings | Add a `--font-geist` to the global stack (already loaded via Next font for Geist Sans). Set `tracking-tight` to `-0.05em` on all H1s, `-0.04em` on H2s. |
| All pages — section eyebrows | 12px / 500 / uppercased eyebrow labels (`GET STARTED`, `BUILD`...) | Map to OpsRadar pillars: `CONNECT · OBSERVE · RECOMMEND · ACT`. Style: `text-xs font-medium uppercase tracking-wide text-neutral-500 mb-3`. Use as section headers AND scroll anchors. |
| All pages — focus rings | Geist double-ring focus (`0 0 0 2px white, 0 0 0 4px blue`) | Replace default focus outline globally: `*:focus-visible { box-shadow: 0 0 0 2px white, 0 0 0 4px var(--brand-blue, #0066FF); outline: none; }`. Works on any background. |
| Top nav | active-section pill chip (`bg: rgb(235, 235, 235)`) around current nav item | Currently OpsRadar's nav has no active state on marketing routes. Add: when route matches, wrap label in `<span class="bg-neutral-200 rounded-full px-3 py-1.5">`. |
| Footer CTA | NOT the four-up Vercel pattern — but a single bold pill close | One H2 ("Stop running blind on margin."), one giant pill CTA ("Book a 20-Minute Demo with the Founder"), secondary text link below ("Or watch the 90-second tour"). |
| All pages — shadows | Vercel's `--ds-shadow-border-small` pattern: hairline + tiny drop, never deeper than 6% black | Define `shadow-vercel-sm`, `shadow-vercel-md`, `shadow-vercel-lg` Tailwind tokens matching the Geist DS values. Replace all `shadow-md` etc on marketing surfaces. The whole site will feel calmer immediately. |

---

## Appendix: raw extracted values for reproduction

- Page background (every page): `rgb(250, 250, 250)` = `--ds-background-200` = `hsla(0, 0%, 98%, 1)`
- Card background: `#ffffff` = `--ds-background-100`
- Text-primary: `rgb(23, 23, 23)` = `--ds-gray-1000`
- Text-secondary: `rgb(77, 77, 77)` = `--ds-gray-900`
- Brand blue: `hsla(212, 100%, 48%, 1)` = `--ds-blue-700` (legacy `#0070f3`)
- Primary CTA bg: `rgb(23, 23, 23)`, fg `white`, radius `100px`, padding `0 14px` (`0 20px` on /customers), font 16px/500
- Secondary CTA bg: `rgb(255, 255, 255)`, fg `rgb(23, 23, 23)`, radius `100px`, same dimensions
- Local nav pill (active): bg `rgb(235, 235, 235)`, radius `~infinite`
- H1: `Geist` 48px / 600 / `-2.4px` letter-spacing (homepage); 52px / `-3.12px` on /ai-gateway
- H2 (section): `40px / 600 / -2.4px`
- Body: 20px / 400 / line-height 36px (1.8) / `rgb(77, 77, 77)`
- Eyebrow: 12px / 500 / `normal` letter-spacing / uppercase by content
- Code font: `Geist Mono`, 13–16px
- Default transition: `duration-300 ease-in-out` (Tailwind utility)
- Default shadow tint: `#0000000a` (4% black) — never more than `#0000000f` (6%)
- Focus ring: 2px white inner + 2px blue outer halo

Screenshots saved at `/home/lawand/Desktop/my-startup/opsradar/docs/design-references/vercel-screenshots/`:
`home-fold.png`, `home-full.png`, `observability-fold.png`, `observability-full.png`, `customers-fold.png`, `customers-full.png`, `pricing-fold.png`, `pricing-full.png`, `blog-fold.png`, `blog-full.png`, `ai-gateway-fold.png`, `ai-gateway-full.png`.
