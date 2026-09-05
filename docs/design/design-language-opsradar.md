# OpsRadar Design Language

*Authored 2026-05-18. The target design system for the OpsRadar marketing surface. Empirical values pulled from the 9 reference-site teardowns under `docs/design-references/` and from the live-site audit in `docs/design-audit-live-site.md`.*

*Category-neutrality note: copy direction throughout this doc is written in a tone-neutral way. Whenever a section would change copy depending on the AIOS-vs-AI-COO call, it is marked [POSITIONING — pending user decision].*

---

## 1. The Design Thesis

### What OpsRadar's visual identity should SAY in 3 seconds

> **"Built by an operator. Watches the money. Tells you what to do."**

The visitor is an agency owner doing a $500–3K/month decision off a cold email. They are time-poor, skeptical, and burned by past "AI tools." Inside 3 seconds the page has to read as:

1. **Serious** (not a 2019 dashboard SaaS, not a vibe-coding playground)
2. **Numerical** (dollars, percentages, hours — adjacent to every claim)
3. **Operator-native** (founder-to-founder, not marketing-to-buyer)
4. **Restrained** (motion, color, and chrome are budgeted; the data does the work)

If the page reads as "experimental startup" or "design-forward agency," we have lost the trust check before the headline is read. If it reads as "enterprise PSA," we have lost the cold-traffic decision because we look like Productive/Scoro and the buyer already rejected those.

### The 3 strongest anchors among the 9 reference sites

**Anchor #1 — Mercury (mercury.com)** *(primary)*. Mercury is the closest peer because (a) it sells a serious financial product to founders, (b) it earned its restraint through editorial typography and a single-accent color, (c) it broke from the "indigo on cream editorial" stereotype to a cinematic-hero-then-near-white-canvas system that lets product UI float. Mercury's `/agencies-and-consultants` page is OpsRadar's most direct visual analogue. We steal the **single-CTA pill at 32px radius**, the **672px centered text column**, the **thesis billboard H2** (single 42px line standing alone), and the **paragraph-not-list voice** ("$0 monthly fees. $0 minimums. $0 USD wires.").

**Anchor #2 — Ramp (ramp.com)** *(primary)*. Ramp is the closest peer for *content*, not chrome. They sell finance software to operators using **editorial typographic discipline** (one typeface, weight 400 headlines, periods at the end of every H2), **numbers as the design element** (64px stats in dedicated panels), **customer-story titles as quantified outcome sentences** ("Brandt grew 3x with zero added accounting headcount"), and **5 total CTA strings across the entire site**. The voice in `.agents/product-marketing.md` is *already* the Ramp voice — the visual treatment is what's missing. We steal the **stat-as-typography**, the **complete-sentence section headings**, the **compound imperative H2** ("Time is money. Save both."), and the **logo strip with no card around it**.

**Anchor #3 — Linear (linear.app)** *(supporting)*. Linear is the supporting anchor because (a) they prove a dark-canvas marketing site can still feel editorial when the typography is disciplined, (b) the **marketing-blacker-black `#010102` → app-surface `#08090a`** trick is the single best way to make a product screenshot float, (c) the **translucent hairlines** (`rgba(255,255,255,0.08)`) replace boxes with structure. We steal the **hairline divider system**, the **/method-style serif manifesto page**, the **fixed-rhythm capability-section grammar** (`[h2 left → product visual → 3 bullets] × 5`), and the **recurring two-sentence parallel-construction sub-tagline** ("Built for the future. Available today.").

### The visual register OpsRadar occupies

> **Mercury-warm + Ramp-numerical + Linear-restrained.**

In one sentence: an editorial-grade marketing surface that lets product screenshots and dollar amounts carry the persuasion, with a single saturated accent reserved for CTAs only. Light **and** dark surfaces are in scope — light for the editorial body of marketing pages, dark for product mockups and for one "instrument panel" hero band.

### What OpsRadar is NOT

- **Not Stripe-grand.** Stripe earned 14,600px homepages and abstract "Financial infrastructure" headlines through 1.64% of global GDP. We have not. We borrow Stripe's *shadow recipe* and *hero canvas idea*; we never borrow Stripe's level of abstraction.
- **Not PostHog-playful.** No hedgehogs, no rotated stickers, no Kim K references, no MS-Paint zine palette, no `.mdx` file-extension nav. The fractional-COO buyer reads irony as unserious at the $1.5K/month price point.
- **Not Cursor-developer.** No `curl | bash` install snippets in the hero, no code blocks, no `Download for macOS ⤓` CTA, no model-gateway framing. We keep Cursor's *restraint*, not its dev-native aesthetic.
- **Not Lovable-romantic.** No pink-orange sunset gradient blob behind a dark canvas. Our hero gradient (when used) is cool, sharp, instrument-panel — electric blue → cyan over near-black, not twilight → bubblegum → tiger.
- **Not Notion-cartoon.** No hand-drawn character heads in colored circles. No saturated full-bleed slab grid with 5 mascot rectangles in a row. Agency owners are not in the market for cute.
- **Not Vercel-developer-flavored.** We keep Vercel's *pill CTAs*, *Geist tracking discipline*, and *focus-ring system* — we drop the rainbow mesh + 3D pyramid + drafting grid because they read "platform" not "operator."

---

## 2. Color System

### Primary brand — keep electric blue, deepen it

OpsRadar's current accent is electric blue `#0066FF` + cyan `#00D4FF` (per `opsradar/CLAUDE.md` design system). **Keep electric blue. Drop cyan from the default palette and demote it to a single data-viz role.** Mercury, Linear, and Ramp each have *one* accent that does 95% of the work; dual-accent systems read as 2019 SaaS.

| Role | Token | Hex | Where it appears |
|---|---|---|---|
| **Primary brand** | `--radar-500` | `#0066FF` | Every primary CTA pill, focus rings, inline accent words ("**Growth**" in plan names), active-link underline |
| Primary hover | `--radar-600` | `#0052CC` | CTA hover state |
| Primary wash | `--radar-50` | `rgba(0, 102, 255, 0.08)` | Secondary CTA fill, tag chips, hover surfaces |
| Primary deep | `--radar-900` | `#001A4D` | Dark-band sections (the one "instrument panel" page band) |
| Cyan (demoted) | `--signal-400` | `#00D4FF` | Data-viz line color, single live "ALERT" pulse indicator. **Not a UI accent.** |

### Surface colors (light-mode body, the default for marketing)

Pulled empirically from Mercury (`#FBFCFD`), Lovable (`#FBFAF7`), Vercel (`#FAFAFA`), Cursor (`#F7F7F4`), Notion (`#F6F5F4`), and PostHog (`#EEEFE9`). The warmer the tint, the more "operator handbook"; the cooler, the more "tech platform." We aim for the warm side — agency owners read warm-cream as trustworthy.

| Role | Token | Hex | Notes |
|---|---|---|---|
| Page background (warm cream) | `--paper-0` | `#FBFAF7` | The default body bg on `/`, `/about`, `/how-it-works`, `/for/*`. Warmer than Mercury, lighter than Cursor. Same R-dominant tint as Notion `#F6F5F4` but one step lighter. |
| Card surface | `--paper-card` | `#FFFFFF` | Pure white on `--paper-0` — boundary by contrast, not by border. |
| Alt section slab | `--paper-1` | `#F4F2EE` | The "warm gray" alternating band (Ramp uses `#F4F2F0`, almost identical). |
| Hover surface (light) | `--paper-hover` | `#F0EDE6` | One step darker than `--paper-1`. |
| Hairline divider (light) | `--paper-line` | `rgba(0, 0, 0, 0.06)` | Vercel's `--ds-shadow-border-base` value. **All dividers, no solid borders.** |

### Surface colors (dark-mode, used for product mockups + one hero band)

| Role | Token | Hex | Notes |
|---|---|---|---|
| Marketing-blacker-black | `--ink-0` | `#020203` | Linear's `--color-bg-marketing` trick: blacker than the app, so the product floats. |
| App-surface (in mockups) | `--ink-1` | `#0A0B10` | The screenshot's own background. Fractionally lighter than `--ink-0` so the screenshot lifts. |
| Dark-band section | `--ink-2` | `#0D1738` | Stripe's deep-navy: used for the single "Connects to your stack" band. |
| Card on dark | `--ink-card` | `#13141A` | Floating panel on dark surface. |
| Hairline divider (dark) | `--ink-line` | `rgba(255, 255, 255, 0.08)` | Linear's exact value. Translucent, never solid. |

### Text colors

| Role | On light | On dark |
|---|---|---|
| Headline (primary text) | `#0A1424` (`--ink-text`, near-black w/ warm tint, Mercury's `#272735` translated) | `#F2F4F8` (`--paper-text-inv`) |
| Body | `#3D4654` (`--text-body`, Mercury's `#535461` warmed) | `#C8CDD8` |
| Muted / metadata | `#6B7385` (`--text-muted`) | `#8A8F98` (Linear's `--color-text-tertiary`) |
| Caption / footnote | `#9AA0AC` (`--text-caption`) | `#86848D` |

### Semantic colors (status + alerts)

These are inherited from product UI but they appear in marketing screenshots, alert mockups, and the Before/After tables. They must be brand-coherent at the same time as semantically correct.

| Role | Token | Hex | Use |
|---|---|---|---|
| Success (clear) | `--clear-500` | `#10B981` | "+$8.4K recovered" pills, positive health-score badges |
| Warning (smoke) | `--smoke-500` | `#F59E0B` | "scope drift trending up" amber states |
| Error (flare) | `--flare-500` | `#EF4444` | Critical alerts, "Acme is 23% over scope" red badge |
| Info (radar accent) | `--radar-500` | `#0066FF` | The primary brand — also serves as the info semantic |

Token names borrowed from Lovable's "name colors after warmth/concepts" pattern — but rejected the literal warmth-words (twilight, flamingo) because they don't fit the operator brand. Our concept words (`radar`, `signal`, `clear`, `smoke`, `flare`, `ink`, `paper`) narrate what the product does: *radars send signals, smoke before fire, flares for critical alerts*.

### Data-viz palette (for charts, gauges, score circles)

Constrained to 5 colors so charts read as part of the brand, not as Chart.js defaults.

```
Series 1 (primary):   #0066FF  radar-500
Series 2 (signal):    #00D4FF  signal-400
Series 3 (clear):     #10B981  clear-500
Series 4 (smoke):     #F59E0B  smoke-500
Series 5 (flare):     #EF4444  flare-500
```

For multi-series stacked or area charts use **opacity stops** on `--radar-500` rather than additional hues: `100% / 60% / 30%` of the same blue.

### The "ownable" accent color

> **Radar Blue `#0066FF` is owned by OpsRadar, but it is not unique.** Vercel, Lovable, and Notion all use a similar blue. Our differentiation is **discipline** (it appears in <5% of pixels per viewport — the Mercury rule), not hue.

However, there is one color move no competitor uses: a **warm cream `--paper-0` body + electric-blue accent only** combination. Mercury uses cool off-white, Lovable uses warm cream with pink-orange accent, PostHog uses warm tan with multi-color. **No reference site combines warm-cream body + cobalt-blue accent.** That combination is our ownable signature.

---

## 3. Typography System

### Display / headline font

**Recommendation: keep NotoSerifDisplay but restrict it to one page only — the `/method`-style manifesto page (see §11.5).** Everywhere else, drop the serif.

Rationale: the live-site audit flagged "huge serif headlines with no visuals" as the single biggest design gap. The serif is fighting the message: agency owners don't want literary, they want operational. Linear's playbook (`/method` is the *only* serif page) gives us the move — serif becomes a content marker for one editorial artifact, not a styling default.

**Across the marketing site, use a single sans-serif family for everything (the Cursor/Ramp/Notion/Vercel/Linear/Mercury rule).** OpsRadar already ships **NotoSansDisplay** as a local font. Keep it. It has the geometric warmth Ramp gets from Lausanne and the optical-size feel Mercury gets from Arcadia Display.

Apply NotoSansDisplay variable-axis weights `400 / 500 / 600 / 700`. If the variable font supports intermediate weights, prefer **480** (Mercury's display weight) for H1/H2 — sits between regular and semibold, gives the "soft confident" feel without ever looking shouty.

### Body font

Same family as the display — **NotoSansDisplay everywhere**. The discipline of one typeface across an editorial page is what gives it the trade-publication feel (Ramp's lesson). Do not split body and headline fonts.

### Mono font

For code samples, API references, numeric tables, and the **before/after table cell content where we want "this is a precise measurement" texture**: use **Geist Mono** (already a Vercel ecosystem font) or **JetBrains Mono** as fallback. Restrict mono to:

- Numeric data inside Before/After tables
- Integration names in lists (`hubspot`, `clickup`, `harvest`, `stripe`)
- Hash-style identifiers inside health-score badges (`#ENG-2703`-style)
- Code blocks inside docs (rare on marketing)

Do **not** use mono for workflow names on `/services`. The audit flagged that as "this is for developers" — wrong audience read.

### Type scale (locked, every page)

Lock the H1 size to a single value across all marketing pages (Notion's discipline). Vary content, not size. Negative letter-spacing scales with size — Mercury, Ramp, Stripe, Vercel, and Notion all do this; it's the single typographic move that separates "Tailwind starter" from "Stripe."

| Token | Size | Line-height | Weight | Letter-spacing | Use |
|---|---|---|---|---|---|
| `--text-hero` | **56px** (3.5rem) | 60px (1.07) | 480–500 | `-0.025em` (≈-1.4px) | H1 on every marketing page. Mercury's subpage hero spec (57px). |
| `--text-display` | **42px** (2.625rem) | 48px (1.14) | 480 | `-0.02em` | H2 standalone "thesis billboards" (Mercury) |
| `--text-h2` | **36px** (2.25rem) | 42px (1.17) | 500 | `-0.02em` | Section H2 (verb-led complete sentence ending in period) |
| `--text-h3` | **24px** (1.5rem) | 32px (1.33) | 500 | `-0.01em` | Card H3, feature title |
| `--text-h4` | **18px** (1.125rem) | 28px (1.55) | 500 | `0` | Sub-feature label |
| `--text-lead` | **21px** (1.3125rem) | 30px (1.43) | 400 | `0` | Hero sub-paragraph (Mercury's 21px hero sub spec) |
| `--text-body` | **16px** (1rem) | 26px (1.625) | 400 | `0` | Body paragraph (Ramp's 16/24 baseline, slightly looser line) |
| `--text-small` | **14px** (0.875rem) | 20px (1.43) | 400 | `0` | Captions, dek, attribution |
| `--text-eyebrow` | **12px** (0.75rem) | 16px (1.33) | 500 | `0.06em` | UPPERCASE eyebrow (Vercel pattern, `CONNECT / OBSERVE / BRAIN / GUARD`) |
| `--text-micro` | **11px** (0.6875rem) | 16px | 400 | `0` | Footnotes, "*Real customers' real numbers" |

### Weight usage rules

- **Headlines run at 480–500, not 700.** Ramp ships H1s at weight 400; Mercury at 480; Vercel at 600. Confidence reads as restraint — pick one mid-weight and stay there.
- **Never use weight 700+ on the marketing site** except for inline emphasis inside body copy. Bold headlines read as cheap.
- **Buttons at weight 500** (Mercury 420, Stripe 425, Vercel 500 — converging value).
- **Body at weight 400.** Italic only for footnotes and the parenthetical-aside voice (PostHog steal #3, applied selectively).

### Letter-spacing scaling rule

For any heading ≥32px:

```
letter-spacing = (size in px × -0.02) ÷ size in px expressed as em
                 = approximately -0.02em
```

For sizes ≥56px push to `-0.025em`. For sizes ≥80px push to `-0.03em`.

---

## 4. Spacing & Grid

### Base unit

**4px base.** Tailwind default. All spacing values are multiples of 4: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 120, 160`. Linear's bundle ships this exact ladder.

### Container widths

| Container | Max width | Notes |
|---|---|---|
| **Editorial column** (long-form text, manifesto, method page) | **672px** | Mercury's text column (`x:384, w:672` on a 1440 viewport). The reading-width sweet spot. |
| **Marketing page** (default) | **1200px** | Tighter than Linear's 1344px and Stripe's 1392px. Pulls focus to the center. |
| **Wide hero / dashboard mockup** | **1280px** | Hero only — gives the product screenshot 100px more bleed than the body. |
| **Page padding (desktop)** | **24px** outer + **32px** inset | Linear's homepage spec, adopted directly. |
| **Page padding (mobile)** | **16px** | |

### Section spacing rhythm

| Spacing role | Desktop | Mobile |
|---|---|---|
| Between sections (default) | **120px** (`py-30`) | 80px |
| Around thesis billboards / dramatic standalone H2 | **160px** (`py-40`) | 96px |
| Card grid row gap | **32px** | 24px |
| Card grid column gap | **24px** | 16px |
| Headline → sub-paragraph | **24px** | 20px |
| Sub-paragraph → CTAs | **32px** | 24px |
| Within a body paragraph (line spacing inherited from text scale) | 26px line-height on 16px body | same |

This is the **metronomic rhythm** Linear gets credit for. Pin it once, every page reads as the same product.

### Card padding standards

| Card type | Padding | Notes |
|---|---|---|
| Pricing tier card | **32px** | Stripe's HeroCard spec |
| Feature card (3-up grid) | **32px** top/bottom, **40px** sides | Ramp's `40px 40px 0px` with the image meeting the bottom |
| Testimonial card | **32px** | |
| Compact metric card (the "$30K/year wasted" billboard) | **40px** | Larger because the number is the content |
| Audit form steps | **40px** (mobile 24px) | Stripe shadow + Mercury 8px radius |

### Border radius scale

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | `4px` | Input fields, small buttons (Vercel's Geist default) |
| `--radius-md` | `8px` | Card corners (Mercury default), audit form card |
| `--radius-lg` | `12px` | Product-mockup frames (Linear, Notion default) |
| `--radius-xl` | `16px` | Hero composite cards |
| `--radius-pill` | `9999px` | All CTAs site-wide |

**Two radii rule:** marketing components use either `8px` (containers) or `9999px` (CTAs). Anything else (the 12px on product mockups) is an embedded asset, not a marketing primitive.

---

## 5. Component Standards

### 5.1 Buttons

**Single button shape system:** every button on the marketing surface is a **pill** at `border-radius: 9999px`. No square corners, no Shadcn default `rounded-md`. Pill is the brand silhouette (Mercury + Vercel + Stripe all converge here).

**Three variants only:**

```
PRIMARY  → fill: var(--radar-500) #0066FF
           text: #FFFFFF
           padding: 12px 20px (height ~48px)
           font: 16px / weight 500 / NotoSansDisplay
           border-radius: 9999px
           transition: 300ms cubic-bezier(0,0,0.2,1) on background-color only
           hover: fill --radar-600 #0052CC
           focus: 2px white halo + 2px --radar-500 outer ring (Vercel double-ring)

SECONDARY → fill: var(--radar-50) rgba(0,102,255,0.08)
            text: var(--radar-500) #0066FF
            same padding, radius, transition
            hover: fill rgba(0,102,255,0.14)

GHOST    → fill: transparent
           text: var(--ink-text) #0A1424
           border: 1px solid var(--paper-line)
           same padding, radius, transition
           hover: fill var(--paper-1)
```

**Destructive variant** (only inside product UI mockups, never as a marketing CTA):
```
fill: var(--flare-500) #EF4444
text: white
```

**Implementation notes:**
- Replace `src/components/ui/button.tsx` `default` variant with the pill PRIMARY above. Move existing `rounded-md` defaults behind a `tone="square"` opt-in for any non-marketing context.
- No `transform: scale()` on hover. No glow. No shadow change. Just color (Mercury rule).
- The transition is `cubic-bezier(0, 0, 0.2, 1)` (`ease-out`) — Mercury's exact spec, never bounce.

### 5.2 Cards (the workhorse component for OpsRadar)

Cards are the most-used component in the OpsRadar marketing system because the product itself is "an alert in a card." We need a tight card vocabulary:

**Card · default**
- Background: `--paper-card` `#FFFFFF`
- Border: none
- Hairline: `1px solid var(--paper-line)` rgba(0,0,0,0.06) when boundary is required
- Radius: `8px`
- Padding: `32px`
- Shadow: **none** by default; if elevation is required:
  ```css
  box-shadow:
    rgba(0,0,0,0.01) 0px 1px 3px,
    rgba(0,0,0,0.02) 0px 3px 7px,
    rgba(0,0,0,0.02) 0px 7px 15px,
    rgba(0,0,0,0.04) 0px 14px 28px,
    rgba(0,0,0,0.05) 0px 23px 52px;
  ```
  (Notion's 5-layer micro-shadow. Max alpha 0.05. The screenshot floats without halo.)

**Card · pricing (recommended tier)**
- Same as default but with **`transform: translateY(-8px)`** and a slightly deeper stack of the same 5-layer shadow (alpha ramped 0.02/0.04/0.04/0.06/0.08).
- The middle tier's name has its keyword inline-colored `--radar-500` ("OpsRadar **Growth**") — that single color shift is the entire highlight. **No "Most popular" ribbon.** Mercury rule.

**Card · alert mockup (the OpsRadar signature)**
- Background: `--ink-card` `#13141A`
- Padding: `20px 24px`
- Radius: `12px`
- Hairline: `1px solid var(--ink-line)` rgba(255,255,255,0.08)
- Left edge: `4px solid var(--flare-500)` for critical, `--smoke-500` for warning, `--clear-500` for positive
- Inside: avatar/icon + headline + 2-line body + a "Send invoice →" button
- The signature OpsRadar asset — every page should have at least one.

### 5.3 Hero patterns (3 variants)

All three variants share: 64px top-of-page padding, max-width `1280px`, content centered, hairline divider below the nav. They differ in what fills the right column (or the space below the H1).

**Variant A — Proof Hero (homepage, /vs pages, /audit)**
The high-stakes "give me a number now" hero.

```
[ hairline-divider nav, 64px tall ]
[ eyebrow micro-stat in --text-eyebrow uppercase, --radar-500 — live or numeric ]
[ H1 at --text-hero, --text-ink, weight 480, max 2 lines, ending in period ]
[ Sub-paragraph at --text-lead, --text-body color, max 540px width ]
[ CTA row: PRIMARY + SECONDARY pill pair, gap 12px ]
[ Trust line micro-copy: "30 minutes · No pitch · We tell you if it's not a fit" ]
[ Hero composite asset below: product mockup or live ticking widget ]
```

The eyebrow can be a *live ticking number* (Stripe's "Global GDP running on Stripe: 1.64895282%" pattern). OpsRadar equivalent: `Agency margin recovered this quarter: $1,247,830 (+$47/sec)`. This requires a Supabase aggregate; ship a static-with-jitter placeholder until the data exists.

**Variant B — Vertical / Persona Hero (/for/paid-media, /for/seo, /for/full-service)**
The "I clicked into a niche, show me my world" hero. Two-column.

```
[ Left column (60% width):
    eyebrow "FOR PAID-MEDIA AGENCIES" or "FOR SEO AGENCIES"
    H1 emotional + specific (the audit's strongest pattern lives here:
       "Sunday nights are for your family.")
    Sub at --text-lead — names the 3 specific problems
    CTA pair
    "Saved hours" stamp band: ~14 h/mo saved · ~12 h/new client saved
]
[ Right column (40% width):
    A vertical-specific dashboard mockup
    — MER pacing chart + creative rollup for /for/paid-media
    — AIO citations tracker + Ahrefs digest for /for/seo
    — Multi-client utilization board for /for/full-service
]
```

The empty right column on the current vertical pages is the single biggest design gap. Fix it here.

**Variant C — Manifesto Hero (/method, /about, /faq)**
The editorial register. **Serif** allowed here only. Single column 672px.

```
[ eyebrow in --text-eyebrow: "THE OPSRADAR METHOD" or "ABOUT" ]
[ H1 in NotoSerifDisplay at --text-hero, weight 400 — softer than the sans ]
[ 3-line dek at --text-lead ]
[ For /method: a 2-column TOC sidebar appears below the dek ]
[ For /about: a founder block — photo + name + 1 sentence ]
[ No CTA above the fold (Linear restraint); CTA appears at section end ]
```

This is the only place serif appears site-wide.

### 5.4 Section dividers — hairline borders are the gold standard

Replace every solid `border` rule on the marketing site with a translucent hairline:

```css
/* on light surfaces */
border-top: 1px solid rgba(0, 0, 0, 0.06);

/* on dark surfaces */
border-top: 1px solid rgba(255, 255, 255, 0.08);
```

Linear's exact values. They keep structure without ever making a box. Audit `src/app/**/*.tsx` and `src/components/ui/separator.tsx` and the homepage section dividers — replace all of them.

### 5.5 Logo walls / customer strips

Single greyscale row directly on the body background — no card, no border, no "Trusted by" label spam (Ramp rule).

**Recommended structure:**
```
[ 80px vertical breathing room above ]
[ A single line: "Used every day by agencies that won't accept margin leak."
  rendered at --text-small in --text-muted color, centered ]
[ 24px gap ]
[ A horizontal row of 5–8 grayscale wordmarks at consistent height (~32px),
  spaced evenly, opacity 70%, hover to opacity 100% ]
[ 80px vertical breathing room below ]
```

**Until real customer logos exist:** do not fake the band. Cursor's lesson — Cursor delays social proof to *after* the visitor has imagined the product. If we have no logos, run a Mercury-style identity H2 instead: *"Built for the 60% of sub-$5M agencies running ops in their head."*

### 5.6 Testimonial blocks

**Ramp pattern:** 28px body-paragraph quote (NOT italicized, NOT in a serif), no quotation-mark decoration, attribution below in `--text-small` `--text-muted`. The quote *is* the design element.

```
"Caught $42K of overservicing in month one. Paid for itself the first time
it flagged a client we thought was profitable."

— Sean Curtis, Founder · SwishAd · 14-person agency
```

**Three-up grid** uses `gap: 24px`, each card is `--paper-card` with the 5-layer Notion shadow.

**Rule:** every quote must contain a `$` or `%`. Make this a content lint rule. If the quote doesn't have a number, the quote isn't ready to ship (Vercel/Ramp content discipline).

**Until real testimonials exist:** the quote slot is empty (a Mercury-style identity H2 stands in for it). Do not ship `[Operator quote — to be replaced]` placeholders. The audit caught this twice in production.

### 5.7 Pricing tier cards

**Three-card row, no borders, no shadows, no "Most popular" ribbon** (Mercury rule).

```
[ Three cards side-by-side, 24px gap, equal width ]
[ Each card: 32px padding, white fill on --paper-1 alt section bg, 8px radius ]
[ Plan name at --text-h3, the middle-tier keyword inline-colored --radar-500 ]
[ Price at --text-display 42px, weight 500, /mo at --text-body color below ]
[ 1-sentence "who this is for" at --text-body --text-muted ]
[ Feature checklist: 5 items, --text-body, checkmark at --radar-500 ]
[ Single CTA pill at the bottom — "Book a demo for [Tier]" — parametric label ]
```

The middle tier visually lifts by `transform: translateY(-8px)` + the deeper 5-layer shadow stack — no other differentiator.

### 5.8 Data visualizations (charts, gauges, score circles)

**Health Score circle** (the OpsRadar signature gauge):
- 96px diameter for inline use, 160px for hero use
- Stroke width 8px
- Background ring: `--paper-1`
- Fill ring: `--radar-500`, animated from 0 to current value on first paint
- Center number at 36px weight 500, --ink-text
- Label below: "Acme · Health" at --text-small --text-muted

**Margin trend line chart:**
- Single-series default with stroke `--radar-500` at 2px
- Filled area gradient: `--radar-500` at 20% opacity → 0%
- Grid lines: `rgba(0,0,0,0.04)`, dashed
- X-axis labels at --text-micro --text-caption
- Numbers in mono font for "this is real" texture

**Before/After bars:**
- "Before" bar in `--smoke-500` (amber)
- "After" bar in `--clear-500` (green)
- Delta label between them at --text-h3 in --radar-500
- The delta dollar amount is the visual focus, not the bars

### 5.9 Tables (especially Before/After tables)

The audit flagged the Before/After tables on `/for/paid-media` and `/for/seo` as the strongest pattern on the current site. Strengthen the pattern, port it everywhere it earns the slot.

**Specification:**
- Two-column table, equal widths
- Header row: `Before OpsRadar` left, `With OpsRadar` right, --text-h4 weight 500
- Header row bg: `--paper-1`, hairline divider below
- Body rows: alternating `--paper-card` / `--paper-1`, no row borders
- Left cell: --text-body --text-body (gray, in mono for numeric content)
- Right cell: --text-body --ink-text (full-strength), with a tiny `--clear-500` checkmark prefix
- Each row gets a **dollar-or-hour delta stamp** in the far right margin: `~14 h/mo` in --radar-500 weight 500

**Mobile:** stacks to two single-column sections labeled "Before" and "With" — never a tiny side-by-side that becomes unreadable.

### 5.10 Forms (especially the multi-step audit form)

The audit is the single highest-value conversion surface. It currently has no site chrome (no nav, no footer). Keep the focus-first treatment but add:

- **Step indicator** at the top: a 7-segment dotted progress bar (audit cut from 13 to 7 steps per audit recommendation), current segment filled `--radar-500`, rest hairline outlined
- **Question** at --text-h2 36px, never bigger
- **Helper text** at --text-body --text-muted
- **"Why this matters" block** in a soft `--paper-1` slab, --text-small
- **Options** as large tappable cards (radius 8px, 24px padding), hover state `--paper-hover`
- **Form card** wrapping the whole step: --paper-card fill, 40px padding desktop / 24px mobile, the 5-layer Notion shadow (so the audit feels like a *thing*, per Stripe)
- **Two-CTA footer**: ghost "Back" + primary pill "Next" — never the words "Submit" or "Finish"

### 5.11 Navigation (top nav, footer, mobile nav)

**Top nav (sticky):**
- 64px height (Linear spec)
- Transparent at scroll position 0; on scroll>40px, fade to `rgba(251, 250, 247, 0.92)` with `backdrop-filter: blur(12px)` and a hairline `--paper-line` below
- Logo left
- 5 items max, plain text links at --text-body --text-body color: `Product` · `Pricing` · `For agencies ▾` · `Method` · `About`
- Right side: text link `Sign in` + a **single primary pill CTA** "Book a demo"
- Active route: subtle `--paper-1` pill chip around the label (Vercel pattern)
- **Drop:** `/services` (merge with `/aios` into `/product`), `/workflows` (move to `/method`), the dark-mode toggle (let CSS prefers-color-scheme handle it; do not put a UI toggle in the nav)
- **Add:** `/pricing` link (currently missing — single biggest nav fix)

**Footer:**
- Dark band, `--ink-0` background
- Top row: tagline at --text-h3 weight 500, white text. [POSITIONING — pending user decision]
- Middle: 4-column link grid — Product / Method / Company / Legal — at --text-body --text-muted
- Below the grid: a hairline divider, then a single row with the logo + copyright + `lawand@opsradar.co` mailto + LinkedIn link
- A small `Spotted a typo? Email the founder →` link bottom-right (PostHog steal, adapted)

**Mobile nav:**
- Same nav bar, but the 5 items collapse into a hamburger
- Drawer slides from right at 280px width
- Primary CTA pill stays visible in the bar even when items are collapsed

---

## 6. Motion & Interaction

### What animates, what doesn't

| Element | Animates? | How |
|---|---|---|
| Page transitions | **No** | Native browser nav. Stripe doesn't have them. We don't need them. |
| Scroll-reveal fade-ins | **Minimal** | Only on sections containing a stat or a chart. Opacity 0→1, translateY 8px→0, 300ms ease-out. Never duration >400ms. |
| CTA hover | **Yes** | Background-color shift only. 300ms cubic-bezier(0,0,0.2,1). No transform, no scale, no shadow change (Mercury rule). |
| Card hover | **Subtle** | A 1px translateY upward + the 5-layer shadow alpha ramps up one notch. 200ms. (Notion neobrutalist "press-up" effect, gentled.) |
| Health Score gauge | **Yes** | Stroke-dashoffset animates from full to current value over 800ms cubic-bezier(0.4, 0, 0.2, 1) on viewport entry. Once. |
| Count-up numbers | **Yes, sparingly** | Used on the hero eyebrow live-ticker and on the "$1.2M recovered" stat band. Never on H1 or H2. |
| Hero composite (alert card, dashboard mockup) | **Optional** | A single slow drift on a background gradient (Stripe canvas pattern) is acceptable. No interactive elements. No 3D. |

### Durations + easing

- **Default UI transition:** 300ms `cubic-bezier(0, 0, 0.2, 1)` (Mercury's `ease-out` value, the global default).
- **Micro-state changes** (focus ring, color shift): 150ms `ease-out`.
- **Scroll-reveal:** 300ms `ease-out`.
- **Count-up:** 1200ms `cubic-bezier(0.4, 0, 0.2, 1)`, eased toward the end.

### Loading states (especially for AI-generated content)

The audit form generates an AI report. The "generating your audit" loading state is the single most under-designed surface on the site. Specification:

- **Skeleton layout** of the eventual report, not a spinner
- Skeleton blocks at `--paper-1` with a gradient shimmer left-to-right, 1.5s loop
- Above the skeleton, a status line: `--text-body` updating through 4 stages:
  1. "Analyzing your stack…"
  2. "Pulling agency benchmarks…"
  3. "Calculating your leak estimate…"
  4. "Drafting your blueprint…"
- A **Health Score gauge animating from 0 to a placeholder value** during the wait — gives the visitor something to watch
- Never a generic "Loading…" spinner. Never a percentage that pretends to know how long this takes.

### Focus rings (accessibility floor)

Vercel's double-ring is the gold standard. Apply globally:

```css
*:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--paper-0),
    0 0 0 4px var(--radar-500);
}
```

Works on every background because the inner ring matches page bg.

---

## 6.5 AI-Native UI Patterns (added May 2026)

OpsRadar is an AI COO product. Per the [YC build architecture](../yc/build-architecture.md), the COO chat surface streams tool calls, queues actions, and renders inline cards from agent output. The design language must encode the patterns that 2026 production AI-native products converged on. None of these existed in the original 9-site teardown — they are additive specs sourced from May 2026 industry research.

### What the 2026 AI-native baseline looks like

> *"Users have learned to watch tokens appear in real time, and a response that waits until completion before rendering feels broken by comparison."* — [AI Chat UI Best Practices 2026](https://thefrontkit.com/blogs/ai-chat-ui-best-practices)

> *"Inline tool visualization shows what tools the agent used without separate debug panels — Chainlit pioneered this with automatic intermediate step cards where users see 'Searched database' or 'Called weather API' as the agent works."* — [Generative UI 2026](https://www.copilotkit.ai/blog/the-developer-s-guide-to-generative-ui-in-2026)

The four production patterns ([AG-UI / A2UI / Vercel AI SDK convergence, 2026](https://blog.logrocket.com/build-real-ai-with-ag-ui/)):

1. **Streaming text** — tokens render as they arrive; blinking-cursor or "AI is typing" indicator
2. **Tool-call cards** — every tool invocation surfaces as an inline card ("Reading Stripe charges…") visible in the conversation
3. **Generative UI cards** — agent returns structured component data, not raw text, and the client renders charts/alerts/action cards inline
4. **Action gates (HITL)** — write actions render as confirm/reject cards inside the chat, never auto-execute

### 6.5.1 Streaming response specification

When the COO agent (or any LLM response in OpsRadar — audit generation, briefing, narrative) is streaming:

- **Latency rule:** "Users tolerate 1–2 seconds for AI responses, not 10–15 seconds" — if the first token doesn't arrive in 1.2s, show a streaming indicator immediately ([source](https://thefrontkit.com/blogs/ai-chat-ui-best-practices))
- **Token render:** text appears character-by-character (or word-by-word) using Vercel AI SDK's `useChat` `streamText` primitive. Cursor: a 2px-wide vertical bar in `--radar-500`, blinking 1s on / 0.5s off, attached to the trailing token.
- **Markdown buffering rule:** render plain text immediately, but buffer code fences and bullet groups until the closing fence or empty line arrives — partial markdown rendering causes layout thrash. ([source](https://thefrontkit.com/blogs/ai-chat-ui-best-practices))
- **Visible stop button:** every streaming response shows a `Stop ■` pill-button at the bottom-right of the message; 32px square, `--ink-card` background, `--radar-500` icon. Click cancels the SSE stream via AbortController.
- **Streaming indicator pill:** before the first token, show an `--text-eyebrow` uppercase pill reading `THINKING…` with three pulsing dots at `--radar-500`, animated 0.6s stagger. Replace with the streamed text once the first token arrives.

### 6.5.2 Tool-call card specification

Whenever the COO agent invokes a read tool (`get_finance`, `get_profitability`, `get_capacity`, etc.) — pulled from the COO agent loop in [build-architecture.md](../yc/build-architecture.md) — the tool call must surface as a **collapsed inline card** above the eventual answer.

```
┌─────────────────────────────────────────────┐
│ ⚙ Reading client profitability…   │ 1.2s ▼ │ ← --text-eyebrow uppercase + duration
└─────────────────────────────────────────────┘
```

**Specification:**
- Background: `--paper-1` `#F4F2EE` on light surfaces, `--ink-card` `#13141A` on dark
- Padding: `8px 12px` (compact — half a regular card)
- Radius: `6px` (smaller than the 8px standard so it visually subordinates to the answer)
- Left icon: a 16px monoline glyph (`⚙` for tools, `🔍` for search, `📥` for fetch, `📤` for write) in `--radar-500`
- Label: tool name in human language at `--text-small` weight 500 (`Reading client profitability…` not `getProfitability()`)
- Duration: trailing `--text-small` `--text-muted` count, animated `1.2s` once complete
- Expand chevron: `▼` toggles a 200ms open animation showing inputs and outputs
- Color states:
  - **Pending:** label suffix `…` with the chevron rotating once per 1.2s
  - **Complete:** duration shown, no animation
  - **Error:** left icon in `--flare-500`, label in `--flare-500`, expandable to show the error

**Why this matters for OpsRadar specifically:** the agent will read 5+ tools per typical COO question. Hiding them looks like "magic AI" (bad — no trust); listing them all expanded is noise. Collapsed cards with hover-to-expand is the 2026 standard ([Patterns.dev AI UI patterns](https://www.patterns.dev/react/ai-ui-patterns/)).

### 6.5.3 Generative UI cards (Vercel AI SDK v6 pattern)

When the agent returns structured output (a margin chart, a profitability table, an alert recommendation), the client renders a **typed React component**, not raw markdown. This is the AI SDK v6 "generative UI" primitive — `streamObject` + Zod schemas + typed React render targets ([AI SDK UI: Generative User Interfaces](https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces)).

> *"Instead of returning JSON that the client renders, you stream actual React components — the loading spinner appears immediately, then gets replaced by the [chart/card/table] once the data arrives."* — [Vercel AI SDK v6 docs, 2026](https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces)

**Important 2026 update:** AI SDK RSC is paused; Vercel now recommends **AI SDK UI** (`useChat` + tool-result rendering) for production. OpsRadar should adopt the production path. Source: [AI SDK docs](https://ai-sdk.dev/docs/introduction).

**OpsRadar generative-UI component vocabulary** (5 reusable inline cards the COO agent can emit):

| Component | Trigger | What it renders |
|---|---|---|
| `<MarginCard client />` | Agent answer references a single client's margin | Mini bar chart + `<DollarStamp>` + "View details →" |
| `<ProfitabilityTable />` | "Show me my unprofitable clients" | Compact 3-column table inline; clickable rows |
| `<HealthScoreInline value />` | "What's my agency health?" | 64px score gauge embedded mid-paragraph |
| `<ActionProposal action />` | Any agent recommendation that requires owner approval | The §6.5.4 Action Gate card (see below) |
| `<IntegrationCallout name />` | "You haven't connected Pipedrive" | Compact card with the integration logo + a Connect CTA |

All five use the existing card hierarchy (§5.2) — they are *not* new visual primitives, they are the existing primitives embedded inline in a streaming chat. The discipline is to keep the visual language consistent so a chat answer looks like a richer version of the dashboard, not a separate UI universe.

### 6.5.4 Action Gate cards (HITL — Human-In-The-Loop)

Per the [YC build architecture](../yc/build-architecture.md), every write action by the agent **must** gate through owner confirmation. The Action Gate card is the design primitive for this. It is the most distinctive AI-native pattern in OpsRadar — and the YC application's positioning angle: *"Our HITL gates are the product, not a limitation."*

```
┌────────────────────────────────────────────────────────────┐
│ ⚡ Proposed action                       Confidence: 87%   │  ← eyebrow + confidence
│                                                            │
│ Send invoice reminder to Acme Inc. for INV-2701 ($4,200,   │  ← --text-body
│ 17 days overdue). Email goes from billing@youragency.com.  │
│                                                            │
│ Reasoning: Acme's avg days-to-pay is 32d; this is 17d      │  ← --text-small --text-muted
│ overdue and matches the pattern from your June recovery.   │
│                                                            │
│ ┌─────────────────────┐  ┌────────────────────────────┐   │
│ │ Confirm and send →  │  │ Reject                     │   │  ← PRIMARY + GHOST
│ └─────────────────────┘  └────────────────────────────┘   │
│                                                            │
│ Auto-confirms in 23h if no response · Edit before sending  │  ← --text-micro
└────────────────────────────────────────────────────────────┘
```

**Specification:**
- Background: `--paper-card` on light, `--ink-card` on dark
- Left edge: `4px solid var(--radar-500)` (always blue — action gates are info, not warning, not error)
- Eyebrow: `⚡ PROPOSED ACTION` in `--text-eyebrow` uppercase, `--radar-500`
- Confidence: right-aligned percentage from the agent's structured output; if confidence <70%, prefix with `⚠` in `--smoke-500` and add a "low confidence — review carefully" microcopy below
- Reasoning section: ALWAYS present — never hide the why. Founders need to learn the agent's logic. ([per the Gartner 2026 HITL positioning quote in build-architecture.md](https://www.gartner.com/en/newsroom/press-releases/2026-05-05-gartner-says-autonomous-business-and-artificial-intelligence-layoffs-may-create-budget-room-but-do-not-deliver-returns))
- Two CTAs: PRIMARY "Confirm" + GHOST "Reject" — never a single confirm button (creates ambiguity)
- Auto-confirm countdown: optional micro-copy; the agent's spec sets the TTL per action type
- Inline "Edit before sending" link: opens a drawer with the action's payload editable before submit (e.g., the email body, the invoice amount)

**Why this is the OpsRadar signature:** no fractional-COO product, no PSA tool, and no horizontal agent platform ships HITL gates as a first-class card. This is the single most OpsRadar-distinctive UI surface and earns the AI COO category claim more than any marketing copy can.

### 6.5.5 The empty / loading / error state matrix for AI surfaces

Add to the §6 loading-state spec the matrix that 2026 production AI surfaces ship:

| State | When | Visual |
|---|---|---|
| **Idle / Empty** | First chat load, no message sent | A small prompt strip with 4 starter questions in `--paper-1` cards (Mercury restraint applied). Each starter is one verb-led sentence: "Show me my unprofitable clients" · "What's my margin this month?" · "Which projects are over scope?" · "What should I do today?" |
| **Streaming** | Agent is generating | See §6.5.1 — cursor + stop button + tool-call cards as they arrive |
| **Tool-call in progress** | One tool firing | See §6.5.2 — collapsed card with pending state |
| **Complete** | Stream closed cleanly | Final tokens render; tool cards stay collapsed; action gates appear inline |
| **Error (model)** | LLM returns 5xx, rate limit, content block | A `--flare-500`-bordered card: "Couldn't reach the model. Retry?" with a PRIMARY pill. Never expose raw error JSON. |
| **Error (tool)** | A read tool failed mid-stream | The tool-call card flips red (§6.5.2 error state), the chat answer says "I couldn't read [tool name] — try reconnecting it in Integrations." Inline link to `/dashboard/integrations`. |
| **Rate-limited** | Customer hit tier action limit | The Action Gate card is shown but the Confirm CTA is disabled, replaced with an upgrade prompt: "You've used 47/50 actions this month — upgrade to Pro for unlimited." Links to `/pricing`. |
| **Compaction** | Context window approaching 30k tokens | A muted `--paper-1` strip appears: "Older messages compacted to keep this conversation fast." Mastra-pattern memory compression made visible. ([source](https://www.speakeasy.com/blog/ai-agent-framework-comparison)) |

### 6.5.6 Density and "death of white space" — the 2026 dashboard pivot

> *"The State of SaaS UX Design 2026: The Death of White Space"* — [LaderaLabs 2026](https://laderalabs.io/blog/saas-ux-trends-2026)

A 2026 shift worth noting: top-tier SaaS dashboards (Linear, Vercel, Cursor) are tightening density. White-space-maximalist dashboards (the 2022–2024 Notion era) are giving way to information-dense single-screen views where the data is the design.

**OpsRadar implication:** the marketing site stays in the editorial register (this design language is correct as-is). But the `/dashboard` product surface should **resist over-spacing**. The customer wants their full agency state visible without scrolling. This affects `/dashboard` redesign (which the user has flagged as "design last, with full focus") — capture this as a spec constraint when that work starts.

**Concrete dashboard density rules (for when `/dashboard` redesign begins):**
- 24px section gap, not 64px
- 16px card padding, not 32px (cards are dense data surfaces, not marketing tiles)
- Numeric content in mono at 14px minimum (not 18px)
- Multi-column dense grids over single-column scrolls
- Sticky page header with the agency health score visible from any scroll position

This is captured separately from the marketing design language because the two surfaces deliberately diverge — marketing is editorial, dashboard is instrumented.

---

## 7. The Brand-Distinctive Patterns (the 5 things only OpsRadar does)

These are the patterns that, if a designer saw them on a billboard, they'd recognize as OpsRadar. None of them is borrowed wholesale from any single reference — each combines two or three teardown moves into something OpsRadar-specific.

### Pattern 1 — The Live Margin Ticker

A small piece of UI that lives on **every page**, either as a hero eyebrow or a footer-band element. It is a continuously-updating number showing aggregate value the OpsRadar customer cohort has recovered.

**Spec:**
```
Eyebrow: AGENCY MARGIN RECOVERED THIS QUARTER
Number:  $1,247,830 (animated count-up)
Suffix:  +$47/sec  (live tick, monospace, --radar-500)
```

**Why it's distinctive:** Stripe ticks "Global GDP running on Stripe: 1.64895282%". No competitor in the agency-ops space does anything like this. The number is the proof, the tick is the demonstration, and it works even with a 5-customer base because we anchor on *aggregate dollars*, not *customer count*.

**Implementation:** Supabase aggregate read at page request, cached 60s; client-side tick uses a fake-but-believable `+$X/sec` derived from the quarterly run-rate.

### Pattern 2 — The Dollar Stamp on Every Claim

Every workflow name, every feature, every value proposition has a **dollar amount or hour count adjacent to it in `--radar-500`**. Not "Recovers billable hours" — "Recovers ~14 h/mo = $16K/year at $100/h senior rate."

The audit flagged this as the biggest copy gap. The design language makes it a typographic primitive — a `<DollarStamp>` component that renders a number, a tiny `=` sign, and a derived dollar value, all in --radar-500 weight 500.

```tsx
<DollarStamp hours={14} period="month" rate={100} />
// renders: ~14 h/mo = $16K/year
```

Use on: `/`, `/services`, `/for/paid-media`, `/for/seo`, `/pricing`, `/results`.

### Pattern 3 — The Alert Mockup as Recurring Asset

Every page has at least one **dark alert card** (per §5.2 spec) showing a real-looking OpsRadar alert. The visual rhyme across pages teaches the brand: *this is what we look like when we work.*

**Alert vocabulary by page:**
- `/` — *"Acme is 23% over scope this month. 3 unbilled deliverables. Send invoice →"*
- `/for/paid-media` — *"DTC client X pacing 22% under target. 4 days left. Suggested action: rebalance creative budget."*
- `/for/seo` — *"Ahrefs digest: 3 client domains lost AIO presence this week. Review →"*
- `/services` — *"Utilization on Studio team dropped to 61%. Capacity for 1 new retainer."*
- `/pricing` — none (pricing pages are cleaner without it)
- `/about` — *"Founder's first OpsRadar alert, May 2025: 'Watch this client — margin trending down.'"* (a real artifact)

### Pattern 4 — The Before/After Table as Persuasion Engine

Every product/feature page contains a Before/After table (§5.9 spec). The table is OpsRadar's strongest existing pattern (per audit) — make it a brand primitive.

**Reuse on:** every `/for/*` page, `/services`, `/pricing` (as a "Before OpsRadar / With OpsRadar" cost comparison for the $10K COO vs $1.5K Growth tier), `/method`, and the audit results page.

### Pattern 5 — The Founder Block

The page footer of every marketing page (and the `/about` hero) carries a **slim founder block**:

```
[ Lawand's photo (40px circle on footer, 96px on /about) ]
[ "Lawand · OpsRadar founder" at --text-small ]
[ "Spotted a typo? Email me →" link at --text-small in --radar-500 ]
```

Why distinctive: founder-led sale is the differentiator. PostHog hides their CEO behind file-extension nav. Cursor hides their founders entirely. Stripe has 4,000 employees so it doesn't apply. **Mercury, Linear, Ramp, Notion all hide founders.** OpsRadar making the founder visible on every page is the single most distinctive trust move available, given the actual product motion (founder takes every call for the first 100 customers).

---

## 8. The Reference Synthesis Table

| Reference site | Pattern | OpsRadar adaptation | Implementation file/location |
|---|---|---|---|
| **Mercury** | Single-CTA pill at 32px radius, 48px height, weight 480, transition 300ms ease-out on bg only | Apply as `PRIMARY` variant globally. Update existing button. | `src/components/ui/button.tsx` |
| **Mercury** | Thesis billboard — single 42px H2 standalone, no body, 160px vertical padding | Use between hero and proof block on `/`, `/aios`, `/for/*` | `src/app/page.tsx`, `src/app/aios/page.tsx`, `src/app/for/*/page.tsx` |
| **Mercury** | Borderless pricing cards on `--paper-1`, no "Most popular" ribbon, middle tier keyword inline-colored | Rebuild pricing card grid | `src/app/pricing/page.tsx`, `src/components/ui/pricing-component.tsx` |
| **Mercury** | 672px editorial column for long-form pages | Wrap `/method`, `/about` body, `/faq` body | `src/app/about/page.tsx`, future `src/app/method/page.tsx` |
| **Mercury** | Hero formula: `[Category] for [user/JTBD]` (subpage variant) | [POSITIONING — pending user decision] | `src/app/page.tsx` hero |
| **Ramp** | Headlines at weight 400/500 (NOT bold), period-terminated, complete-sentence H2s | Lock heading weights to 480–500. Audit and rewrite all H2s. | All marketing pages; `globals.css` heading defaults |
| **Ramp** | Stat-as-typography — 48–64px standalone numbers in warm-off-white cards | Add a `<StatBillboard>` component | New: `src/components/marketing/stat-billboard.tsx` |
| **Ramp** | Customer story titles as quantified outcome sentences ("Brandt grew 3x with zero added accounting headcount") | When real customers exist; for now use category-stat substitutes | Future: `src/app/customers/page.tsx` |
| **Ramp** | Lime-yellow CTA — do NOT steal. Keep electric blue. | n/a | n/a |
| **Ramp** | Logo strip with no card around it, no "Trusted by" label | When real logos exist | `src/app/components/ToolLogos.tsx` (extend for customer logos) |
| **Linear** | Marketing-blacker-black `#020203` vs in-product `#0A0B10` so screenshots float | Apply on `/aios` and any page with an embedded dashboard mockup | `globals.css` `--ink-0` / `--ink-1` tokens |
| **Linear** | Translucent hairlines `rgba(255,255,255,0.08)` and `rgba(0,0,0,0.06)`, never solid | Replace all marketing-surface borders | `src/components/ui/separator.tsx`, every `border-` Tailwind class |
| **Linear** | `/method` editorial page with serif H1 — the only place serif appears | Build `/method` as new page | New: `src/app/method/page.tsx` |
| **Linear** | Metronomic capability-section rhythm `[h2 → screenshot → bullets] × 5` | Restructure homepage middle into 5 identical-rhythm sections | `src/app/page.tsx` |
| **Linear** | One-word page titles ("Pricing", "Customers", "Now") | Rename page titles, drop the brand-suffix-doubling bug | `src/app/layout.tsx` metadata + each page's `metadata` export |
| **Linear** | Two-sentence parallel-construction dek repeated cross-page | Write one dek and reuse: e.g. "Watches your agency 24/7. Tells you what to do next." [POSITIONING — pending] | Multiple pages |
| **Vercel** | Crosshair drafting-grid background — do NOT steal (reads "platform" not "operator") | n/a | n/a |
| **Vercel** | Pill-shape CTA, double-ring focus state, 300ms ease-in-out | Apply globally per §5.1 | `src/components/ui/button.tsx`, `globals.css` `*:focus-visible` |
| **Vercel** | Eyebrow labels in 12px uppercase, used as scroll anchors | Define `--text-eyebrow` token, use to label sections (CONNECT/OBSERVE/BRAIN/GUARD if the pillars survive [POSITIONING — pending]) | `globals.css`, every page |
| **Vercel** | "One-sentence product definition" sub-paragraph at 20px / 36px line-height | Apply as `--text-lead` token on every hero sub | All hero subs |
| **Vercel** | Two-CTA hero (black pill + white pill) | Adapt to electric blue + ghost — PRIMARY + GHOST or PRIMARY + SECONDARY | All hero CTA rows |
| **Stripe** | Two-layer Stripe shadow on elevated cards | Use the 5-layer Notion variant instead — softer, cleaner | Card components |
| **Stripe** | Animated hero canvas in `<canvas>` (one-purpose drift, no interactions) | Optional — single canvas on `/` hero only, in `--radar` range | Future: `src/components/ui/hero-canvas.tsx` |
| **Stripe** | Live ticking eyebrow number ("Global GDP running on Stripe: 1.64895282%") | Pattern #1 — Live Margin Ticker | New: `src/components/marketing/live-margin-ticker.tsx` |
| **Stripe** | Tight negative letter-spacing on display headings | Apply `letter-spacing: -0.025em` on all H1; `-0.02em` on all H2 | `globals.css` heading defaults |
| **Stripe** | Vague abstract headlines — do NOT steal | n/a | n/a |
| **Lovable** | Dark hero + warm sunset gradient blob — do NOT steal (wrong emotional pull) | n/a | n/a |
| **Lovable** | "Meet [Product]" 3-step explainer | Apply as the "How it works" section on homepage: Connect → Watch → Get the call before the crash | `src/app/page.tsx` middle section |
| **Lovable** | Color-token names by concept (twilight/bubblegum/flamingo) | Adopt the *technique* with operator-coded names (radar/signal/clear/smoke/flare/ink/paper) | `tailwind.config.ts`, `globals.css` |
| **Lovable** | "Ready to ___?" terminal section reuses the hero component | Every page's footer CTA band uses the same composite (founder block + primary pill) | All marketing pages |
| **Cursor** | 26px H1 — do NOT steal (reads as "broken CSS" to agency-owner ICP) | Stay at 56px H1 | n/a |
| **Cursor** | "Screenshot is the demo" hero — product UI as hero visual, no illustrations/shaders | Replace shader/3D hero with `/dashboard` screenshot composite | `src/components/ui/responsive-hero-banner.tsx` (replace) |
| **Cursor** | One-sentence-per-feature-block discipline | Audit every feature paragraph; cut to one sentence ending in a period | `src/app/services/page.tsx`, `src/app/aios/page.tsx` |
| **Cursor** | Three-arrow CTA glyph system `→ ↗ ⤓` | Adopt `→` (internal), `↗` (external), `⚡` (product activation: "Connect a tool ⚡") | Documented in design system; applied across all `<Link>` components |
| **PostHog** | Hedgehog mascot, file-extension nav, "Shameless CTA" tone — do NOT steal | n/a | n/a |
| **PostHog** | Warm-tan paper background `#EEEFE9` for handbook surface | Use `--paper-0` `#FBFAF7` (slightly cooler) for the same effect | Global page bg |
| **PostHog** | "Talk to a human" CTA reframe | Adopt: secondary CTA reads "Talk to the founder" not "Contact sales" | Nav + footer |
| **PostHog** | Self-deprecating parentheticals on social proof | Use sparingly on logo strip ("Real agencies. Real numbers. Ask Sean.") | Logo strip copy |
| **PostHog** | `/why` page as concentrated differentiator list | Future page — `/why-opsradar` (or merged into `/method`) | Future: `src/app/method/page.tsx` section |
| **PostHog** | Section labels rewritten as operator voice ("Bedtime reading", "Shameless CTA") | Apply selectively, in operator register not in irony register | Section H2s throughout |
| **Notion** | Hand-drawn illustrations — do NOT steal | n/a | n/a |
| **Notion** | Locked 64px H1 size across pages | Adopt at 56px (smaller for our column width) — locked, never varies | `globals.css` `--text-hero` |
| **Notion** | 5-layer micro-shadow stack on product shots, max alpha 0.05 | Apply as default card elevation | Card components |
| **Notion** | Period-terminated, verb-led headlines ≤6 words | Apply as H2 rule everywhere | All section H2s |
| **Notion** | Pricing twin-block: tier 1 plain, tiers 2+3 inside pale-radar `rgba(0,102,255,0.06)` container | Apply on `/pricing` | `src/app/pricing/page.tsx` |

---

---

## 9. 2026 SaaS Design Trend Calibration (added May 2026)

This section reconciles the design language above against 2026 industry research. The goal: confirm what holds, flag what to evolve, and identify what NOT to chase.

### What 2026 research confirms about OpsRadar's direction

| OpsRadar choice | 2026 trend it matches | Source |
|---|---|---|
| Single accent (radar blue), restraint over rainbow | "Roughly three-quarters of top design-led SaaS sites now follow the pattern of dark-as-default with one neon accent — Linear-purple, Raycast-red, Mercury-lime, Cursor-cyan variations" | [SaaS website design 2026](https://www.stan.vision/journal/saas-website-design) |
| Real product UI as hero, not illustrations | "The shift from illustration to actual product UI is near-universal in 2026's top SaaS designs — Figma, Miro, Calendly, and Loom all placing real, interactive product moments at the top of the page" | [Gridrebels 2026 SaaS designs](https://www.gridrebels.studio/post/20-best-saas-website-designs-in-2026-examples-that-actually-convert) |
| H1 under 8 words, dollar-anchored | "The average high-performing H1 headline contains under 8 words (44 characters maximum)" | [Digital Applied 2,000-page study 2026](https://www.digitalapplied.com/blog/landing-page-conversion-study-2000-pages-tested-2026) |
| Above-fold direct CTA | "Above-fold, direct CTAs perform up to 2x better than passive or hidden buttons" | Same |
| Mercury / Ramp / Linear as primary anchors | "Linear, Loom, Mercury, and Ramp consistently benchmark well on conversion metrics, with sites converting visitors-to-trial above 4 percent" | [Stan.vision SaaS design 2026](https://www.stan.vision/journal/saas-website-design) |
| Lighthouse a11y discipline | "Framer, Linear, and Vercel score above 90 on Lighthouse accessibility audits — their design systems enforce accessibility at the component level" | Same |

### 2026 trends to selectively adopt

1. **Story-driven hero with micro-animations (3–5s value demo)** — *"The 2026 design standard shifts from static taglines to story-driven hero sections that visually demonstrate product value within 3-5 seconds, with leading examples like Notion, Linear, and Framer using micro-animations and product workflow illustrations to show transformation."* ([source](https://genesysgrowth.com/blog/designing-b2b-saas-landing-pages))
   - **OpsRadar application:** the Alert Card hero composite (§5.3 Variant A) should animate a single state change on viewport entry — e.g., the "Acme is 23% over scope" badge appears with a 200ms fade-in 800ms after page load. One animation, single-purpose, no loop.

2. **Live AI agent animation in hero** — *"The 'product is the demo' pattern has matured — live AI agent animations in the hero have replaced static screenshots, with Linear, Cursor, and Attio setting the benchmark."* ([source](https://www.stan.vision/journal/saas-website-design))
   - **OpsRadar application:** on `/` and `/aios`, the hero composite can show a 5-second loop of the COO agent typing "I found 3 unbilled deliverables on Acme — recommend sending the invoice" using the streaming-text spec from §6.5.1. Loop pauses on hover (accessibility).

3. **Interactive embedded demo (Guideflow / Storylane / Arcade)** — *"2026's standout trend is interactive demos embedded directly on the landing page — Amplitude, Forest Admin, and Zendesk using tools like Guideflow to deliver guided product tours."* ([source](https://www.digitalapplied.com/blog/landing-page-conversion-study-2000-pages-tested-2026))
   - **OpsRadar application:** post-MVP, embed an Arcade clip of the COO chat answering a real margin question on `/aios`. Defer to Wave 4.

4. **Personalized hero copy by traffic source** — *"Personalized CTAs outperform generic versions by 202% when they match visitor intent — modern high-converting pages use AI-powered personalization that adapts hero copy, product visuals, and pricing previews by segment, delivering conversion lifts of 20-40%."* ([source](https://www.digitalapplied.com/blog/landing-page-conversion-study-2000-pages-tested-2026))
   - **OpsRadar application:** when traffic comes from a `/vs/*` page or a fractional-COO community link, swap the hero H1 to the matching frame. Use Vercel Edge Config to A/B without redeploys.

### 2026 trends to explicitly REJECT for OpsRadar

| Trend | Why we reject |
|---|---|
| Bento-grid hero (16+ rectangles) | Reads as 2023 launch-platform aesthetic; doesn't fit "operator-grade" — Linear killed theirs in late 2025 |
| Shader / WebGL hero canvas as background (Lovable, Vercel current homepage) | Reads as "creative tool"; agency owners read it as "this is not serious" — keep the single Stripe-style canvas drift only if it appears subtle |
| 3D pyramid / mesh gradient blob | Same — reads as developer-platform, not operator-tool |
| "Death of white space" applied to marketing | Density is for the dashboard. Marketing stays editorial. The two surfaces deliberately diverge in this design language. |
| AI mascot / Olllama-style character on hero | We are not a developer tool and we are not Notion. Founder block is our human element. |

### Conversion-rate benchmarks to design against

From the [Pixelswithin 2026 B2B SaaS benchmarks](https://pixelswithin.com/b2b-saas-conversion-benchmarks-2026/) and [SaaSHero benchmarks 2026](https://www.saashero.net/content/landing-page-conversion-rate-benchmarks/):

| Surface | Median CR | Top-quartile CR | OpsRadar target |
|---|---|---|---|
| B2B SaaS landing page (overall) | **4.1%** | **20%+** (top performers) | 6–8% post-redesign |
| Quote / demo request page | **6.8%** | 12%+ | 10%+ on `/audit` post-redesign |
| Webinar / lead-magnet registration | **11.4%** | 25%+ | n/a (we don't run webinars) |
| Above-fold value-prop clarity premium | "+35–40% better than ambiguous messaging" | — | The §5.3 Variant A hero must name a dollar number above the fold |
| Above-fold CTA placement premium | "2x better than passive/hidden buttons" | — | The pill PRIMARY appears in every hero |
| Personalized CTAs vs generic | "+202% when matching visitor intent" | — | Per-vertical hero variants on `/for/*` |

---

*The design language is the constraint. The redesign specs (`docs/design-redesign-specs.md`) are the per-page application of these constraints to ship work this week. §6.5 AI-Native UI Patterns and §9 2026 Trend Calibration were added 2026-05-21 from third-wave industry research.*
