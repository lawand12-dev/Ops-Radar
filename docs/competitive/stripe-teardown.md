# Stripe — Deep Design Teardown

*Captured 2026-05-18 from desktop 1440×900 against stripe.com, /payments, /atlas, /customers, /pricing, /sessions. All CSS values are computed-style readings — not memory.*

Screenshots saved at repo root (move them to `docs/design-references/stripe-screenshots/` when convenient):
- `stripe-01-homepage-hero.png` (viewport)
- `stripe-01b-homepage-full.png` (full scroll)
- `stripe-02-payments.png`
- `stripe-03-atlas.png`
- `stripe-04-customers.png`
- `stripe-05-pricing.png`
- `stripe-06-sessions.png`

---

## 1. The Visual System

### Typography
Stripe's single biggest typographic decision is using **Söhne Variable** (Klim Type Foundry) as a custom variable font, loaded as `sohne-var`. Computed font-family across every page:

```
sohne-var, "Helvetica Neue", Arial, sans-serif          // /payments, /atlas, /customers, /pricing, /sessions
sohne-var, "SF Pro Display", sans-serif                  // / (homepage)
```

Söhne has a humanist warmth + grotesque clarity that reads as both "fintech serious" and "design-forward". The fallback choice (SF Pro Display on homepage vs Helvetica Neue elsewhere) suggests two slightly different CSS pipelines coexist.

**Computed type scale (real readings):**

| Role | Page | font-size | font-weight | line-height | letter-spacing | color |
|---|---|---|---|---|---|---|
| Hero H1 (homepage) | `/` | 48px | 300 | 55.2px | -0.96px | animated (sampled `rgb(129, 184, 26)`) |
| Hero H1 (product) | `/payments` | 56px | 500 | 68px | -1.12px | `rgb(10, 37, 64)` |
| Hero H1 (Atlas) | `/atlas` | 38px | 500 | 48px | normal | `rgb(10, 37, 64)` |
| Hero H1 (Sessions) | `/sessions` | **76px** | 500 | 76px | -2.28px | `rgb(10, 37, 64)` |
| Section H2 (large) | `/` | 56px | 300 | 57.68px | -1.4px | `rgb(6, 27, 49)` |
| Section H2 (default) | `/` | 32px | 300 | 35.2px | -0.64px | `rgb(6, 27, 49)` |
| Product section H2 | `/payments` | 18px | 500 | – | – | `rgb(153, 102, 255)` *(eyebrow-style)* |
| Lead paragraph | `/` | 32px | 300 | 35.2px | – | `rgb(100, 116, 141)` |
| Body | all | 16px | 400 | – | – | `rgb(66, 84, 102)` |
| Sub-feature title | `/sessions` | 38px | 425 | 41.8px | -0.2px | `rgb(10, 37, 64)` |

Patterns you can extract:
- **Display weight is light** (300 on homepage, 500 on product pages). The Stripe hero feels airy precisely because the 48–76px headings are weight 300/500, never the 700 most marketing sites default to.
- **Negative letter-spacing scales with size.** Tiny at 32px (-0.64px), aggressive at 76px (-2.28px). The ratio is roughly `-2% × font-size`.
- **font-weight: 425** appears repeatedly (Sessions sub-headings, all product CTAs) — a Söhne-variable specific weight halfway between regular (400) and medium (500). This is invisible to almost everyone but it's how Stripe gets its CTAs to look "slightly more confident than body" without looking bold.

### Color palette (extracted from computed styles)

**Brand neutrals (consistent across all pages):**
- `#0A2540` `rgb(10, 37, 64)` — Stripe's signature deep navy. Default heading + dark CTA color.
- `#061B31` `rgb(6, 27, 49)` — even darker navy, used for the homepage H2.
- `#425466` `rgb(66, 84, 102)` — secondary text / body default.
- `#3C4F69` `rgb(60, 79, 105)` — eyebrow text.
- `#64748D` `rgb(100, 116, 141)` — large hero lead paragraph.
- `#F6F9FC` `rgb(246, 249, 252)` — Atlas page background (off-white, the famous "Stripe blue-white").
- `#031323` `rgb(3, 19, 35)` — almost-black, used for secondary "Start now" CTA.
- `#0D1738` `rgb(13, 23, 56)` — homepage's dark-section navy.

**Brand actions — one signature purple expressed three ways:**
- `#533AFD` `rgb(83, 58, 253)` — homepage "Start now" / "Contact sales" (most saturated).
- `#635BFF` `rgb(99, 91, 255)` — /pricing, /sessions, /customers (the canonical Stripe purple from their public brand kit).
- `#9966FF` `rgb(153, 102, 255)` — /payments primary CTA + eyebrow color (lighter, more lavender for fintech approachability).
- `#FF7600` `rgb(255, 118, 0)` — /atlas hero CTA (orange identity for the startup-incorporation product).
- `#00D4FF` `rgb(0, 212, 255)` — cyan accent for secondary CTAs on /pricing (matches Stripe's three-color brand).
- `#0DE4E4` `rgb(13, 228, 228)` — teal used as an eyebrow on /payments.

The three-color brand identity (purple → magenta/pink → cyan/teal) shows up most explicitly in the *bento card border gradient*:

```css
radial-gradient(circle,
  rgb(127, 125, 252),     /* periwinkle */
  rgb(244, 75, 204) 33%,  /* hot pink */
  rgb(229, 237, 245) 66%  /* near-white */
)
```

And in the homepage "billing plan" stacked gradient layers (extracted, real computed values):

```css
/* Layer 1: purple core */
radial-gradient(50% 50%, rgba(83, 58, 253, 0.8) 62.5%, rgba(83, 58, 253, 0) 100%)

/* Layer 2: magenta on top */
radial-gradient(50% 50%, rgba(243, 99, 243, 0.8) 53.85%, rgba(243, 99, 243, 0) 100%)

/* Layer 3: warm yellow */
radial-gradient(50% 50%, rgb(255, 207, 94) 41.35%, rgba(255, 207, 94, 0) 100%)

/* Layer 4: white fade */
linear-gradient(rgb(255, 255, 255) 41.35%, rgba(255, 255, 255, 0))
```

That's the signature "stacked radial soft-blob" Stripe uses to give marketing imagery depth without using photography.

**The famous animated stats gradient (the one that fades from dawn → daytime as you scroll):**

```css
/* "pre-dawn" */
radial-gradient(103.24% 102.63% at 50% 102.63%,
  rgb(72, 111, 253)   0px,    /* electric blue */
  rgb(127, 129, 243)  9.84%,  /* periwinkle */
  rgb(196, 137, 255)  20.83%, /* lavender */
  rgb(218, 192, 255)  34.13%,
  rgb(234, 220, 255)  44.86%,
  rgb(249, 246, 255)  58.59%,
  rgb(248, 250, 253)  100%
);

/* "sunrise" */
radial-gradient(102.68% 99.11% at 50% 104.6%,
  rgb(203, 131, 255) 0px,
  rgb(255, 144, 185) 15.77%,  /* pink */
  rgb(255, 201, 119) 30.62%,  /* peach */
  rgb(255, 215, 155) 38.04%,
  rgb(255, 241, 220) 50.11%,
  rgb(255, 255, 255) 63.1%
);

/* "daytime" */
radial-gradient(102.84% 104.98% at 50% 104.98%,
  rgb(0, 113, 193) 1.33%,     /* deep cyan */
  rgb(96, 168, 226) 15.71%,
  rgb(180, 216, 255) 33.15%,
  rgb(217, 235, 255) 45%
);
```

Three CSS layers stacked, cross-faded by opacity as the user scrolls past the stat block. There's no library — it's stacked divs with `radial-gradient()` and CSS transitions.

### The signature visual move: the animated hero canvas

Every Stripe top-of-page on a major product is a **`<canvas>` element** running a hand-coded WebGL/2D shader, not a video, not an SVG. Detected canvases:

| Page | Canvas size | Parent class |
|---|---|---|
| `/` | 1392×761 | `hero-wave-animation__contents hero-wave-animation--drawn` |
| `/payments` | 1848×600 | `HeroSection__gradient Gradient isLoaded` |
| `/atlas` | 1848×600 | `HeroSection__gradient Gradient isLoaded` |
| `/sessions` | 1833×886 | `Sessions26Wave` |

This is the *single most-imitated thing on the internet from a fintech*. The wave/mesh runs continuously, is rendered client-side, and is the entire visual hook. The page's H1 sits in front of it; no photography is required.

### Spacing scale

Section padding consistently `0px 16px` (gutter only); cards use `padding: 16px` for compact, `padding: 32px` for hero/pricing cards. CTA padding `15.5px 24px 16.5px` (note the asymmetric top/bottom — Söhne baseline tweak). Section vertical rhythm shows tops at 76, 761, 2957, 3517, 4494, 6337, 7523, 9104 — i.e. sections range from ~600px to ~2200px tall. **Stripe pages are LONG.** The homepage scrolls past 14,000px.

### Border / radius / shadow

- CTA border-radius: **4px** on homepage; **16.5px (pill)** on /payments, /atlas, /pricing, /sessions. The pill is the new house style.
- Card border-radius: **8px** (`HeroCard`), **4px** (`CustomersCaseStudyCard`).
- The legendary **two-layer Stripe shadow** (used on hero pricing cards and customer cards):

```css
box-shadow:
  rgba(50, 50, 93, 0.25)  0px 13px 27px -5px,
  rgba(0, 0, 0, 0.3)      0px 8px 16px -8px;
```

This is the most-copied shadow recipe in B2B SaaS. It's a cool-tinted ambient layer (50,50,93 = soft indigo) plus a tighter black for contact. Steal it.

---

## 2. The Hero Pattern

Construction (verified across all 6 pages):

1. **Animated canvas** absolutely positioned behind everything, ~600–900px tall.
2. A **section overlay** `linear-gradient(rgba(0,0,0,0), rgba(236, 239, 241, 0.8))` fading top-to-bottom to make text legible.
3. **Eyebrow** (optional): small lowercase running text or a stat like `Global GDP running on Stripe: 1.64895282%` — Stripe famously animates this number live.
4. **H1**: 48–76px, weight 300–500, navy `#0A2540` (or animated color on homepage), tight tracking. Long sentence — NOT a 3-word slogan.
5. **Lead paragraph**: 18–32px, weight 300, slate `#64748D` — also a full sentence (often two clauses).
6. **CTA pair**: primary (purple/orange/dark fill, white text, pill or 4px radius) + secondary (text-only with arrow or transparent ghost).
7. **No screenshot, no photograph in the hero.** Just type + gradient.

Stripe's homepage H1 verbatim:
> "Financial infrastructure to grow your revenue. Accept payments, offer financial services, and implement custom revenue models—from your first transaction to your billionth."

Stripe's /payments H1 verbatim:
> "Unified, global payments to grow your revenue"

Stripe's /atlas H1 verbatim:
> "Fast, trusted, automated"

Headline formula reverse-engineered:

> **[Abstract noun describing infrastructure category] + to [outcome verb] + [your concrete metric]**

Or for product pages: **[Adjective×3] for [thing the customer cares about]** ("Unified, global payments…").

---

## 3. The Page Architecture

Stripe's homepage in order, from the actual section outline pulled from the DOM (`top` is pixel-position of section start):

| # | top (px) | height | Heading |
|---|---|---|---|
| 1 | 0 | – | Header (sticky, `rgba(255,255,255,0.8)` + radial-gradient overlay) |
| 2 | 76 | 685 | **H1 hero** ("Financial infrastructure to grow your revenue…") |
| 3 | 761 | 2196 | **H2** "Flexible solutions for every business model." (the modular bento) |
| 4 | 2957 | 560 | Customer logo grid (no heading) |
| 5 | 3517 | 977 | **H2** "The backbone of global commerce" (stats with the dawn→daytime gradient) |
| 6 | 4494 | 4610 | **H2** "Powering businesses of all sizes." (enterprise/startup/SaaS three-up) |
| 11 | 9104 | 2341 | **H2** "Reliable, extensible infrastructure for every stack." — *the only dark-bg section, `rgb(13, 23, 56)`* |

Section rhythm rules Stripe follows:
- **Heading rotation:** big abstract ("Financial infrastructure…") → modular features → logos → stats → segment-specific → infrastructure/dev → enterprise CTA → footer.
- Almost the entire page is **white background**. The dark navy infrastructure section near the bottom (`#0D1738`) provides the only contrast break — and it's where the "for developers" pitch lives.
- **No traditional 3-up feature row.** Stripe replaced "3 features in cards" with bento layouts where each card has its own gradient border and animated graphic.
- The page **does NOT use code blocks in the hero.** Stripe used to (the famous 2014–2020 hero with a Ruby snippet). It has moved away from this — the homepage now has *zero* `<pre>` or `<code>` elements above the fold.

Density: Stripe's homepage is **~14,600px tall**. That's roughly 16 vertical screens at 1440×900. The information density per section is low (lots of breathing room around each thought), but the page itself is long.

---

## 4. The Copy Patterns

**Headline formulas observed:**
- *Outcome + your-scale*: "Financial infrastructure to grow your revenue… from your first transaction to your billionth."
- *Three-adjective seal*: "Fast, trusted, automated."
- *Category-claim*: "The backbone of global commerce."
- *Promise + scope*: "Powering businesses of all sizes."
- *Restraint*: "Sessions 2026" (when the brand is the message).

**CTA microcopy:**
- `Start now` (primary, ubiquitous) — *not* "Get started for free" or "Sign up free"
- `Contact sales` (secondary, ubiquitous)
- `Watch now` (for content)
- `Read the story` (for case studies)
- `Sign up with Google` (only social signup offered; nothing else)
- `View talk`, `Register now` (Sessions)

Two-word CTAs dominate. No CTA on any page contains `→` arrows or exclamation points or words like "fast," "instant," "magic." The button text itself is plain — the *gradient and shadow* carry the persuasion.

**Body voice:** technical-precise, never breathless. Examples from /:
- "Grow your business with a comprehensive set of payments and financial tools⁠—⁠designed to work individually or together."
- "Transform your enterprise with agile financial infrastructure" (H3, enterprise section)
- "Make your SaaS platform a complete financial operating system" (H3, platforms section)

Note the precise verbs: **transform, build, make, power, accept, offer, implement.** No "leverage," no "supercharge," no "unlock."

**Eyebrow microcopy:** Stripe uses eyebrows as *live numbers*, not as section labels:
- Homepage: `Global GDP running on Stripe: 1.64895282%` (a live-ticking percentage)
- /payments H2 eyebrows: `Online payments`, `Global payments`, `In-person payments` (one-word, lowercase product surface labels, set in the brand purple `#9966FF`)

**Developer-vs-business framing.** The page is segmented bottom-half by audience: enterprise / startup / platforms / SaaS — each gets its own H3 + 1–2 paragraph block. Stripe never says "we serve everyone." It says "we serve [enterprise]" then on the next scroll "we serve [startup]" — explicitly segmented copy on one page.

---

## 5. The Motion Language

1. **The animated hero canvas.** Continuous, low-amplitude flow — a noisy gradient mesh that drifts. Built as a `<canvas>` not a video (verified: `<canvas width="1392" height="761">` element, not `<video>`).
2. **The "dawn → daytime" scrolljack.** Three full-bleed radial-gradient layers cross-fade on scroll. CSS-only — the three gradient divs are stacked and their `opacity` transitions on scroll position.
3. **Live counter on the eyebrow.** The "Global GDP running on Stripe" percentage ticks up by one digit (sampled at 1.64895282% then 1.64895283% on subsequent ticks). Tiny detail, massive credibility signal.
4. **Hover states on CTAs.** Subtle — the purple `#635BFF` darkens slightly and the shadow tightens. No bounce, no shimmer, no shake.
5. **Bento card gradient border.** Each card has a `radial-gradient(circle, ...)` blob behind it whose center subtly shifts on hover (transform: translate).
6. **No page transitions.** Stripe uses native browser navigation; the brand identity is so strong that page-to-page transitions would feel gratuitous.
7. **No autoplay video.** Despite being the most-visited fintech homepage on the internet, Stripe has zero `<video>` elements on the homepage hero.

The motion philosophy: **one big always-on visual (the canvas) + tiny event-driven tells (the ticking counter, the CTA hover) — and nothing in between**. No "animate-on-scroll fades into view." No parallax cards. The discipline is what makes it feel premium.

---

## 6. The 7 Things to Steal for OpsRadar

### Steal 1 — The two-layer "Stripe shadow" on every elevated card.
Apply to: dashboard preview screenshots on `/`, pricing cards on `/pricing`, "agency health score" cards in any product-marketing surface.
```css
box-shadow:
  rgba(50, 50, 93, 0.25) 0px 13px 27px -5px,
  rgba(0, 0, 0, 0.3)     0px 8px 16px -8px;
```
This signals "premium B2B" instantly. We currently use a single flat shadow — that reads as $50 SaaS.

### Steal 2 — Tight negative letter-spacing on display headings.
Apply to: hero H1 on `/`, `/audit`, `/pricing`. Use `letter-spacing: -0.02em` for 48px, `-0.03em` for 64px+. This is the difference between "Tailwind starter" and "Stripe." Right now OpsRadar headings sit at default tracking, which is why they feel generic at large sizes.

### Steal 3 — A signature animated hero canvas.
Apply to: `/` hero only. Build a small WebGL or 2D-canvas wave/mesh in OpsRadar's electric blue → cyan range (`#0066FF → #00D4FF`). NOT a Three.js fiber globe. Stripe's hero is famous because **the canvas only does one thing** — a slow drift, no interaction, no parallax. OpsRadar already has Three.js installed; budget 1 small canvas component, 200 lines, that runs in the upper 600px of the homepage.

### Steal 4 — Live ticking number as the eyebrow.
Stripe ticks "Global GDP running on Stripe: 1.64895282%". OpsRadar's equivalent:
> `Agency margin recovered by OpsRadar customers this month: $1,247,830 (+$47 every second)`

This is dramatic for a tool whose value prop is "money you're leaking." It also gives a believable proof-point even with a small customer base — anchor on aggregate not customer count.

### Steal 5 — Steal the section rhythm: abstract claim → modular features → logos → stats → segmented use cases → developer-color dark band → enterprise CTA → footer.
Apply to: redesign of `/`. Current OpsRadar homepage uses a generic feature-grid rhythm. Adopt Stripe's: (1) abstract infrastructure claim, (2) modular bento (4 cards: Margin, Utilization, Scope, Cash flow), (3) "agencies powered by OpsRadar" logos, (4) stats section with dawn-gradient ("$1.2M margin recovered, 47 agencies, 30-day avg payback"), (5) by-segment (Owner / Head of Ops / Fractional COO), (6) the only dark section is the "How OpsRadar connects to your stack" technical section (deep navy `#0D1738`), (7) "Book your demo" closer.

### Steal 6 — One pill-shape CTA, two-word microcopy, font-weight 425.
Replace OpsRadar's current "Get my free audit →" CTAs with **two-word pill CTAs**: `Book demo` (primary, electric blue fill) and `See dashboard` (secondary, ghost). `border-radius: 9999px` (full pill), `padding: 12px 20px`, `font-weight: 425` if the chosen font supports variable weights (Inter does), otherwise 500. No arrow icons. The pill silhouette is identifiable from a thumbnail — a major share-card / OG-image asset.

### Steal 7 — Restraint about photography. Use type + gradient only above the fold.
Apply to: `/` hero, `/audit` hero, `/pricing` hero. Stripe homepage has zero product screenshots, zero stock photos, zero illustrated characters above the fold. The hero is type on canvas, period. The dashboard preview comes *below* the fold in the bento. This is counterintuitive but Stripe earned 1.64% of global GDP with this discipline. OpsRadar should reserve product imagery for sections 2+ and let the hero be type + animated gradient + CTA — nothing else.

---

## 7. The 3 Things That Wouldn't Work for OpsRadar

### Don't steal 1 — Multi-brand color identity per product page.
Stripe runs purple on `/`, lavender on `/payments`, orange on `/atlas`, cyan on `/pricing`. They can do this because each "product" is a separable line-of-business in the same parent brand. **OpsRadar is one product.** Adopting per-page colors would dilute the electric-blue identity. Use Stripe's color *discipline* (one primary, one accent, one neutral system), not its multi-brand approach. OpsRadar's electric blue `#0066FF` and cyan `#00D4FF` already mirror Stripe's purple/cyan range; just deepen and standardize.

### Don't steal 2 — Page length and bento density.
Stripe's homepage is ~14,600px (16 screens). They can afford this because the visitor's intent is high (already searching "stripe pricing") and the sales motion is self-serve. **OpsRadar's homepage visitor is colder** — an agency owner who clicked a cold-email link. They will not scroll 14 screens. OpsRadar's homepage should be 4,000–6,000px max, 4–5 sections, with the demo CTA appearing 3 times max. The Stripe bento-grid pattern (gradient-bordered cards 3-up or 4-up) is fine; the depth is not.

### Don't steal 3 — Vague-abstract headline category claims ("Financial infrastructure to grow your revenue").
Stripe has earned the right to be abstract because *everyone in the world knows Stripe = payments*. OpsRadar has not. The product-marketing context explicitly says **specific over abstract, dollar amounts over adjectives, name a real number wherever possible**. A Stripe-style abstract headline ("Operational intelligence for agencies that run on growth") will fail with our ICP. Keep OpsRadar headlines concrete: dollars, percentages, named outcomes ("Catch the $40K leak before quarter-end. Without the $10K/mo fractional COO."). Borrow Stripe's *typography* for the headline; do not borrow Stripe's *level of abstraction* for the words inside it.

---

## 8. Direct Inspiration Mapping

| OpsRadar page | Stripe element / pattern | Specific change |
|---|---|---|
| `/` hero | Animated `<canvas>` hero (1392×761) on stripe.com — `hero-wave-animation` | Replace current hero shader background with a single-purpose flowing canvas mesh in `#0066FF → #00D4FF → #061B31` (electric blue → cyan → deep navy). Drop competing animations. |
| `/` hero H1 | 48px / weight 300 / letter-spacing -0.96px / Söhne | Drop H1 weight from default to 400–500. Add `letter-spacing: -0.02em` for any H1 ≥ 40px. Use NotoSansDisplay (already loaded) — verify it has a variable weight 400/500. |
| `/` hero eyebrow | Live ticking "Global GDP running on Stripe: 1.64895282%" | Add: `Agency margin recovered this quarter: $X,XXX,XXX` ticking eyebrow above H1. Pull from Supabase aggregate. |
| `/` hero CTAs | Two-word pill CTAs, weight 425, `border-radius: 9999px` | Replace "Get my free audit →" with two CTAs: `Book demo` (filled electric blue) + `See dashboard` (ghost). Drop arrows. |
| `/` section rhythm | Abstract → bento → logos → stats → segmented → dark dev band → CTA | Restructure /: bento of 4 ops surfaces (Margin / Utilization / Scope / Cash), agency logo strip, "$1.2M recovered" stats with cross-fading radial gradient, three audience cards (Owner / Ops Lead / Fractional COO), one dark `#0D1738` section for "Connects to HubSpot, ClickUp, Harvest, Stripe + 6 more". |
| `/` "stats" section | Three stacked radial-gradients cross-fading on scroll (`pre-dawn → sunrise → daytime`) | Build the same three-layer cross-fading radial-gradient backdrop for the OpsRadar stats block. Stay within brand: stops `#0066FF → #00D4FF → #FFFFFF`. CSS-only, no JS lib. |
| `/audit` form | The pricing card box-shadow + 8px radius + 32px padding (`HeroCard`) | Wrap the multi-step audit card in a Stripe-style elevated card. `background: #fff; border-radius: 8px; padding: 32px; box-shadow: rgba(50,50,93,0.25) 0 13px 27px -5px, rgba(0,0,0,0.3) 0 8px 16px -8px`. Today the audit lives on a flat surface — it doesn't feel like a "thing." |
| `/pricing` cards | `Card--shadowMedium` + `HeroCard` pattern (8px radius, 32px padding, two-layer shadow) | Match exactly. Three pricing cards ($500/$1500/$3000), middle one slightly elevated (e.g. `transform: translateY(-8px)` + bigger shadow) — this is the "Growth" recommended tier. |
| `/pricing` CTAs | Cyan secondary `rgb(0, 212, 255)` on dark text | Adopt for "Talk to founder" link — cyan fill on `#0A2540` text, instead of an underline link. |
| `/customers` page (not yet built) | `CustomersCaseStudyCard__theme--Dark` — dark card with white-on-dark blockquote, footer with role | When OpsRadar ships customer stories, use Stripe's exact card pattern: full-bleed dark gradient card, white blockquote in weight 300, attribution footer in 15px / weight 300. |
| `/sessions` (future event/webinar page) | 76px H1 / weight 500 / letter-spacing -2.28px on white | When OpsRadar runs a webinar or community day, name it and use a "Sessions"-scale display headline. Restraint becomes the brand. |
| Body / typography globally | `font-family: sohne-var, ...` everywhere; `color: #425466` for body, `#0A2540` for headings | Standardize OpsRadar to two text colors: `#0A2540` for headings, `#425466` for body (override Tailwind defaults). Currently the body uses too-light grays that lose contrast on white. |
| Buttons globally | `padding: 15.5px 24px 16.5px` (asymmetric for Söhne baseline) on rectangular CTAs; `3px 12px 6px 16px` on pills | Apply asymmetric vertical padding to buttons (top 12px / bottom 14px) — it makes CTAs feel anchored without anyone consciously noticing. |
| Dev / API section (if any) | The deep-navy `#0D1738` section near footer | When OpsRadar talks about "Connects to your stack" (integrations) — use a single full-bleed `#0D1738` band to switch context, the way Stripe does for "for developers." |

---

## Appendix — raw stops for the homepage's dawn-to-day gradient (verbatim from getComputedStyle)

```css
.stats-animation-gradient__gradient--pre-dawn {
  background-image: radial-gradient(103.24% 102.63% at 50% 102.63%,
    rgb(72,111,253) 0px,
    rgb(127,129,243) 9.84%,
    rgb(196,137,255) 20.83%,
    rgb(218,192,255) 34.13%,
    rgb(234,220,255) 44.86%,
    rgb(249,246,255) 58.59%,
    rgb(248,250,253) 100%
  );
}
.stats-animation-gradient__gradient--sunrise {
  background-image: radial-gradient(102.68% 99.11% at 50% 104.6%,
    rgb(203,131,255) 0px,
    rgb(255,144,185) 15.77%,
    rgb(255,201,119) 30.62%,
    rgb(255,215,155) 38.04%,
    rgb(255,241,220) 50.11%,
    rgb(255,255,255) 63.1%,
    rgb(252,253,254) 77.95%,
    rgb(248,250,253) 98.81%
  );
}
.stats-animation-gradient__gradient--daytime {
  background-image: radial-gradient(102.84% 104.98% at 50% 104.98%,
    rgb(0,113,193) 1.33%,
    rgb(96,168,226) 15.71%,
    rgb(180,216,255) 33.15%,
    rgb(217,235,255) 45%,
    rgb(248,250,253) 60%
  );
}
```
