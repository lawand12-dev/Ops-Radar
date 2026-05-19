# Mercury.com — Design Teardown

*Captured 2026-05-18 at desktop 1440×900. All CSS values below are **computed styles** pulled live via Playwright from `mercury.com`, `mercury.com/business-banking`, `mercury.com/credit`, `mercury.com/agencies-and-consultants`, `mercury.com/pricing`, `mercury.com/insights`. Screenshots: `/tmp/design-teardowns/mercury/*.png`. Raw style dump: `/tmp/design-teardowns/mercury/styles.json`.*

*Note on URL drift: Mercury has retired `/product/banking`, `/product/credit-cards`, `/customers`, and `/raise` since they were last documented. Current equivalents are `/business-banking`, `/credit`, `/agencies-and-consultants` (ICP page directly relevant to OpsRadar), `/pricing`, and `/insights` (the data-as-product showcase that replaces `/customers`-style social proof).*

---

## 1. The Visual System

### 1a. Color palette (exact rgb from computed styles)

| Role | Token (computed) | Where it shows up |
|---|---|---|
| Primary accent — indigo | `rgb(82, 102, 235)` (`#5266EB`) | Every primary CTA pill; "Mercury Plus", "Mercury Pro" inline accents; checkmark ticks on pricing; toggle "on" state |
| Indigo wash (10%) | `rgba(82, 102, 235, 0.1)` | Secondary CTA fill ("Contact sales"), tag chips, hover surfaces |
| Indigo-tinted lavender (sample) | `rgba(156, 180, 232, 0.2)` | Hero gradient stops, soft section dividers |
| Near-black ink (default heading) | `rgb(39, 39, 53)` (`#272735`) | All headings and primary body copy on light backgrounds |
| Plum-ink (alt heading) | `rgb(40, 37, 59)` (`#28253B`) | `/business-banking` H1 — slightly warmer than default |
| Body gray (sub-copy) | `rgb(83, 84, 97)` (`#535461`) | Hero subheads, paragraph text on light surfaces |
| Off-white BG | `rgb(251, 252, 253)` (`#FBFCFD`) | Light page background — *not* pure white; faint cool tint |
| Pure white | `rgb(255, 255, 255)` | Card surfaces inside off-white sections |
| Dark hero ink-on-cream alt | `rgb(237, 237, 243)` (`#EDEDF3`) | Headlines on dark/photographic hero (homepage, `/credit`) |
| Dark surface (sample from home dark band) | `rgb(23, 23, 33)` (`#171721`) | Homepage dark scroll-jacked sections |
| Mid-violet (sample) | `rgb(39, 39, 53)` → `rgb(85, 78, 123)` | Gradient sweeps between cream and ink |

**Signature visual move:** Mercury does *not* lean on the old indigo-on-cream editorial palette anymore. The 2026 system is a **photographic/cinematic hero** (homepage uses a misty mountain photo with a desk-and-chair scene) flowing into **near-white sections** (`#FBFCFD`) populated by **product UI screenshots inside softly drop-shadowed white cards**. The accent indigo `#5266EB` appears almost exclusively in the CTA pill and the inline "Plus"/"Pro" wordmarks on pricing — used sparingly so it punches.

### 1b. Typography — the famous Mercury pairing, exactly as loaded

Mercury self-hosts **three custom font families**, confirmed via `document.fonts`:

```
arcadia          — variable, weight range 360–500, normal style       (body sans)
arcadiaDisplay   — variable, weight range 320–480, normal style       (display sans)
tiemposHeadline  — static, weights 300/400/500, normal + italic       (editorial serif accent)
```

Plus matching `Fallback` families for FOUT-free swap.

**Computed type scale (1440px viewport):**

| Element | Page | Family | Size | Weight | Line-height | Letter-spacing |
|---|---|---|---|---|---|---|
| H1 (homepage hero) | `/` | `arcadiaDisplay` | **49.35px** | 480 | 54.28px | normal |
| H1 (subpage hero) | `/business-banking`, `/credit`, `/agencies-and-consultants`, `/pricing` | `arcadiaDisplay` | **57.01px** | 480 | 62.72px | normal |
| H2 (section header) | all | `arcadiaDisplay` | **42px** | 480 | 48.3px | **0.42px** |
| H2 (utility/small section) | `/pricing` | `arcadia` | 18px | 480 | 24.3px | normal |
| Hero sub-paragraph | all | `arcadiaDisplay` | **21px** | (default ~400) | 25.21px | normal |
| Body paragraph | all | `arcadia` | 16px | 400 | 24px | normal |
| CTA button label | all | `arcadia` | 16px | 420 | — | normal |
| Pull-quote / testimonial | `/business-banking`, `/agencies-and-consultants`, `/pricing` | `arcadiaDisplay` | **28px** | 480 | 33.6px | normal |

Key insight: there is **no traditional serif headline** on the marketing pages — the editorial feel comes entirely from **Arcadia Display, a low-contrast contemporary sans** with weight 480 (between regular and semibold). The variable weight at 480 is what gives every headline that "soft confident" feel without ever looking bold. `tiemposHeadline` (the famous Mercury serif) is loaded but reserved for in-product moments and legal/editorial content.

### 1c. Spacing & section rhythm

- Section content is constrained to a **672px text column** centered in a 1440 viewport (observed via `getBoundingClientRect` on H2s: `x:384, w:672`) — that's a `~24%` left gutter on each side. This gives the editorial column feel.
- Pricing card column width: **~232–292px**, gap visible at ~32px, card internal padding **24px** (only place card padding was non-zero in the dataset).
- Vertical rhythm: H2 sits at scroll positions roughly every **~1200–1400px** apart on subpages — long breathing room between blocks, no dense stacking.

### 1d. Border treatments

- **No card borders.** The only "card" with measurable padding (pricing) uses pure white fill on off-white BG, no border, no visible shadow in the screenshot — the contrast between `#FFF` and `#FBFCFD` *is* the boundary.
- **CTA pill radius: `32px`** on every primary CTA across all 6 pages — fully rounded pill.
- **Input radius (email field next to CTA): also pill** — matched height to CTA.
- **Image cards / dashboard mockups: subtle 8–12px radius** with very light drop shadow (visible in screenshots but `box-shadow: none` on the computed sample — shadow is on an inner wrapper).

### 1e. The signature visual move

It is **not** "indigo on cream" (that was Mercury circa 2021–2023). The 2026 signature is:

> **Cinematic photographic hero (or a single hero product screenshot inside a soft floating "browser frame") → vast cool-white scroll canvas (`#FBFCFD`) → editorial centered text columns interspersed with product-UI mockups → near-zero chrome (no borders, no shadows you can name, no card outlines).**

The indigo pill is the only piece of saturated color in any given viewport. Everything else is grayscale-with-a-trace-of-violet.

---

## 2. The Hero Pattern

### 2a. Construction (subpage hero — most reusable for OpsRadar)

Observed on `/agencies-and-consultants`, `/business-banking`, `/credit`, `/pricing` — same machine:

1. **Sticky top nav:** transparent over hero, logo left, 5 nav items center (`Products`, `Solutions`, `Resources`, `About`, `Pricing`), `Log in` + primary pill `Open account` on the right. Nav text 16px, color flips between black (light hero) and white (dark hero).
2. **H1 centered** — `arcadiaDisplay` 57px / weight 480, color `#272735`. Always 2 lines on desktop. Examples observed:
   - "Banking for agencies, / consultants, and firms"
   - "Business banking for / building great things"
   - "The business credit card / that scales with you"
3. **Sub-paragraph centered, ~480–540px max-width**, 21px / line-height 25.21px / weight ~400, color `#535461`. One sentence, two clauses, ends with a confidence beat:
   - *"Streamlined banking that combines checking, savings, invoicing, and cards in one. Apply in 10 minutes or less."*
   - *"Apply online in 10 minutes to experience banking unlike anything that's come before."*
4. **Triple-CTA row** (this is non-obvious and unusual):
   - **Email input pill** (`Enter your email`) — left side of group
   - **Primary CTA pill** `Open account` — indigo `#5266EB`, white text, **32px radius**, 16px/weight 420, padding `0px 20px`
   - **Secondary CTA pill** `Contact sales` — `rgba(82, 102, 235, 0.1)` indigo wash, indigo text, same 32px radius
5. **Hero product visual** — a single hero asset directly below, full-width inside the centered column: either a photographic scene (homepage) or a faux-browser mockup of the Mercury dashboard with a credit card and an invoice composited on top (`/agencies-and-consultants`, `/business-banking`).
6. **Compliance footnote pill** floats at the bottom of the hero — dark pill, very small text: *"Mercury is a fintech company, not an FDIC-insured bank. Banking services provided through Choice Financial Group and Column N.A., Members FDIC."*

### 2b. The headline formula

Mercury's 2026 headline pattern (observed across all 6 pages):

> **`[Category] for [aspirational user / job-to-be-done]`** *(no verb, no claim, no number)*

- "Banking for agencies, consultants, and firms"
- "Business banking for building great things"
- "The business credit card that scales with you"
- "Pricing that fits your business"
- "Radically different banking" *(homepage — the only one that breaks the pattern; uses an adjective + category)*
- "Real-time financial insights right in your account" *(insights page — closer to functional headline)*

It is **deliberately category-led** — Mercury never headlines a benefit number, a feature, or a comparison. The headline names what they are; the subhead names the proof.

### 2c. The CTA

- **Primary label across all pages: "Open account"** — never "Sign up", never "Get started", never "Try free", never "Book a demo".
- The product *is* the trial. Same single CTA on home, product pages, pricing, even insights.
- Secondary CTA exists only on hero: **"Contact sales"** (and only on hero, not repeated in body).

### 2d. The visual element

- Photographic, cinematic, painterly — not the diagrammatic isometric illustrations Mercury used in 2022.
- When it *is* a product screenshot, it's a single composed scene: dashboard + a Mercury IO credit card + an invoice — three artifacts representing three product lines, arranged like a still life. No annotations, no "Watch demo" overlay, no callouts pointing at features.

---

## 3. The Page Architecture

Section ordering observed on `/business-banking` and `/agencies-and-consultants` (the cleanest templates):

| # | Section | Pattern |
|---|---|---|
| 1 | Hero (above) | H1 + sub + email+CTA+CTA + hero composite |
| 2 | Headline-only "thesis" band | One 42px H2 spanning the column. Examples: *"Everything you need for smooth banking"*, *"$0 monthly fees. $0 minimums. $0 USD wires. So your business can do more."* No body copy, no visual. Pure declarative billboard. |
| 3 | Customer love wall | "Businesses like yours love Mercury" / "Loved by 300K+ of the most ambitious entrepreneurs" — grid of 3–4 testimonial cards, each with a 28px serif-feeling Arcadia pull-quote in `#272735`, attribution below in body 16px |
| 4 | Product-feature triptych | "One powerful, intuitive account" — feature cards with product UI screenshots, no shadows, alternating image-left / image-right |
| 5 | "Modern banking has its perks" | A perks grid (cashback, yield, partner discounts) — same Arcadia treatment, no decoration |
| 6 | Press / accolade row | "Mercury lands $300M Series C / Fast Company's Most Innovative / $650M ARR and profitable" — *uses publication brand names as visual anchors* |
| 7 | FAQ accordion | "Frequently asked questions" — 7–10 H3 questions, plain accordion, no icons |
| 8 | Footer band | Dark `#171721`, dense link grid (banking / platform / resources / finance ops / solutions / account / about / follow us), ~50 links. Compliance text below the link grid, sets at 11–13px in muted gray. |

**Rhythm signature:** every section is **a single column 672px wide, centered, with massive vertical breathing room (~120–160px between H2s)**. No two-column layouts above the FAQ. No alternating "image left / image right" zigzag that's typical of SaaS; instead, the product image *sits underneath the column*, full-bleed of the column, then the column resumes.

**Editorial flow:** thesis → proof (testimonials) → mechanism (product) → expansion (perks) → authority (press) → reassurance (FAQ). Mercury earns the right to ask for the open-account before showing the form again.

---

## 4. The Copy Patterns

### 4a. Headline formulas (with real Mercury copy)

- **Category claim:** "Banking for agencies, consultants, and firms"
- **Aspiration possessive:** "Business banking for building great things"
- **Personification of product:** "The business credit card that scales with you"
- **Fit promise:** "Pricing that fits your business"
- **Thesis billboard (H2 used as section divider):** "$0 monthly fees. $0 minimums. $0 USD wires. So your business can do more." — triple-anchored repetition, then a `So [outcome]` clause.

### 4b. Body voice

- **Lists of three** appear constantly: *"checking, savings, invoicing, and cards in one"*, *"$0 monthly fees. $0 minimums. $0 USD wires"*, *"checking + savings, virtual cards, and more"*.
- **Specific timebound proof points:** *"Apply in 10 minutes or less"* (used on hero across multiple pages). *"Get a credit card instantly."* *"Tackle banking tasks in seconds."*
- **No adjective stacking:** body never says "powerful, modern, AI-native banking". It says "Mercury is built on software".
- **Customer-quote voice is plain-spoken:** Karri Saarinen (Linear): *"Unlike most financial institutions, Mercury is built on software. Everything can be done within the app in 1-2 minutes."* — no marketing varnish. The numbers in quotes ("1-2 minutes") do the work.

### 4c. CTA language

| Spot | Label |
|---|---|
| Nav button (primary) | `Open account` |
| Hero primary CTA | `Open account` |
| Hero secondary CTA | `Contact sales` |
| Pricing card CTA | `Open Account` (capital A — only place it varies) |
| Compliance/learn | `Learn more` (inline link) |

That's the whole vocabulary. Five labels across an entire marketing site. No "Get started today", no "Start your free trial", no "Talk to an expert".

### 4d. Customer-story treatment

- No dedicated `/customers` page — they've **dissolved customer stories *into* the product pages**. Each product page has its own testimonial band specific to *that product's* benefit.
- Quotes are **28px Arcadia Display weight 480 in `#272735`** — the same treatment as section H2s, two sizes down. Quotes feel like content, not pull-quotes-as-decoration.
- Attribution is plain: Name, Title, Company. No logo wall. The wordmarks appear in the press row at the bottom (WSJ, Fast Company) — companies are name-checked in copy, not logo-mined.
- **The data IS the story:** `/insights` page is a customer-story page where the "customers" are *Mercury's own product metrics* surfaced as a feature. *"$650M in annual revenue and profitable"* sits as a section H2 — Mercury makes itself the case study.

---

## 5. The Motion Language

Computed `transition` on the primary CTA (verbatim from `getComputedStyle`):

```
color 0.3s cubic-bezier(0, 0, 0.2, 1),
background-color 0.3s cubic-bezier(0, 0, 0.2, 1),
border-color 0.3s cubic-bezier(0, 0, 0.2, 1),
outline-color 0.3s cubic-bezier(0, 0, 0.2, 1),
text-decoration-color 0.3s cubic-bezier(0, 0, 0.2, 1),
fill 0.3s cubic-bezier(0, 0, 0.2, 1),
stroke 0.3s cubic-bezier(0, 0, 0.2, 1),
--tw-gradient-from 0.3s cubic-bezier(0, 0, 0.2, 1),
--tw-gradient-via 0.3s cubic-bezier(0, 0, 0.2, 1),
--tw-gradient-to 0.3s cubic-bezier(0, 0, 0.2, 1)
```

Decoded:
- **Duration:** 300ms — universal across hover/state changes.
- **Easing:** `cubic-bezier(0, 0, 0.2, 1)` — this is `ease-out`. Inputs/CTAs decelerate into final state, never bounce, never overshoot.
- **What's transitioned:** colors only — no `transform`, no `scale`, no `translate` on interactive states. The button doesn't grow on hover; it darkens. That's the entire motion budget for interactive elements.

**Scroll behavior:**
- The homepage uses **scroll-jacked sticky sections** — the photographic hero pins, swaps the imagery as you scroll (the cinematic mountain-desk scene then transitions to other compositions). This produced the huge "blank" middle in the full-page screenshot — the screenshot tool can't capture sticky-pinned content. Observed on `/` only; subpages are conventional scroll.
- Subpages have **no scroll-trigger entrance animations** at desktop — sections appear instantly. No fade-in-on-view, no number countups, no parallax. The composition does the work.

**Hover states (inferred from CSS class names + screenshot diff):**
- Primary CTA: indigo `#5266EB` → slightly darker indigo on hover (no shadow change).
- Nav items: color shift from `#000` to indigo accent.
- Links in body: underline appears on hover; text color stays.

The overall motion philosophy is **stillness as confidence**. Nothing twitches, nothing pulses, nothing demands you look at it.

---

## 6. The 7 Things to Steal for OpsRadar

Each item maps to a current OpsRadar page; specifics in section 8.

### 1. The single-CTA hero with email pre-capture, *flanked by a secondary "Contact sales" pill*
**What:** Primary indigo pill + email input + secondary translucent pill, all 32px radius, all at hero. Mercury reuses this row identically on every product page.
**Why steal:** OpsRadar needs both flows — "Book a demo with founder" (primary; the conversion goal) and a low-commitment "See sample audit" or "Email me the agency benchmark" capture. Currently OpsRadar funnels everyone to a single audit form. Steal the pattern of *two equally-prominent commitment levels* shown in the same triple-element row.
**How to apply (with OpsRadar tokens):** Make the demo-booking pill use OpsRadar electric blue `#0066FF` at radius `32px`, padding `0 20px`, height ~48px, 300ms ease-out transition on bg only. Secondary "Email me a sample audit" pill: `rgba(0, 102, 255, 0.1)` fill, electric-blue text, same 32px radius.

### 2. The thesis billboard (`H2 alone in a section`)
**What:** Mercury uses single 42px Arcadia headlines as standalone sections with zero body copy: *"$0 monthly fees. $0 minimums. $0 USD wires. So your business can do more."* No image, no description, no list.
**Why steal:** OpsRadar's value props ("Recover 15–30% leaked margin", "$500 not $10K", "Catches problems in days not quarters") deserve standalone billboard treatment between product sections — currently they're buried inside paragraphs.
**How to apply:** Insert a single-line H2 section between the hero and the proof block: *"15–30% margin leaks. 30–90 day detection lag. One AI COO that costs less than two hours of your fractional."* — three anchors, then a `So [outcome]` clause.

### 3. The "Loved by 300K+ of the most ambitious" social-proof H2 (numeric + identity)
**What:** Mercury's social-proof H2 is *"Loved by 300K+ of the most ambitious entrepreneurs on the planet"* — a single number, a single identity-defining noun. Not "Trusted by these companies" with a logo wall.
**Why steal:** OpsRadar has no public customers yet (per product-marketing.md: "None public yet"). But the user has *category-level* numbers to anchor on: *21.5% of agencies now losing money. 95% of AI pilots failing. 87% of agencies still pace ad budgets manually.* Lead with one of those as an identity-defining H2 instead of a non-existent logo wall.
**How to apply:** On `/`, after the hero, run: *"Built for the 60% of sub-$5M agencies running ops in their head."* That's the Mercury-style identity-defining number-H2 OpsRadar can ship today.

### 4. The 32px pill input *adjacent* to the 32px pill CTA
**What:** Mercury renders the email field and the primary CTA as *visually adjacent pills of identical height and radius*. They read as a single composite "act now" UI even though they're two elements.
**Why steal:** OpsRadar's current audit-form CTA is detached from any input — the moment of commitment requires a separate click then a page transition. Mercury collapses the gap between intent and form to zero.
**How to apply:** On `/` and `/audit` and `/services`, render an inline `<input placeholder="Your work email" />` immediately to the left of the "Book a 20-minute demo" pill. Same height (48px), same 32px radius. Submitting the email pre-populates the Calendly invitee.

### 5. Photographic/painterly hero in place of dashboard-screenshot hero
**What:** Mercury's homepage hero in 2026 is a *photographed scene* (misty mountain ridge, wooden desk and chair, working outdoors) — not a dashboard. The product appears below in section 2.
**Why steal:** OpsRadar's current hero is dashboard-heavy (per shader-background / hero-banner components). For an *agency-owner* audience the emotional pull of "the founder working alone with a view, finally able to step back" is exactly the JTBD ("free myself from being the bottleneck on every operational decision"). A painterly photo of *an agency-owner-at-a-window* will out-pull a dashboard screenshot for first impression. Move the dashboard to section 2.
**How to apply:** Replace the shader/3D hero on `/` with a single editorial photo (or AI-generated painterly composition) of an agency owner looking at a city skyline at dusk, laptop closed. Keep dashboard mockup for section 2 ("This is what they see").

### 6. The retired-from-feature-tour copy voice
**What:** Mercury never says "powerful", never says "modern", never says "intuitive UI". The voice is *plain-fact + number*: *"Apply online in 10 minutes."* *"Get a credit card instantly."* *"$650M in annual revenue and profitable."*
**Why steal:** OpsRadar's brand voice doc explicitly bans hype filler ("holistic", "platform", "AI assistant"). The vocabulary discipline is already there in `.agents/product-marketing.md`. Mercury proves you can run a whole 8-section page using only **numbers + verbs + categories** with zero adjectives. Sweep adjectives from `/`, `/services`, `/pricing`.
**How to apply:** Audit every heading on OpsRadar for adjectives. Replace each with either (a) a specific number, (b) a JTBD verb, or (c) a category claim. Example: "Powerful operations intelligence" → "$500 not $10K. 24/7 not quarterly."

### 7. Pricing card without comparison-anxiety
**What:** Mercury's pricing page has 3 cards (Mercury $0, Mercury Plus $29.90, Mercury Pro $299) inside a single white surface with **no card borders, no shadows, no "most popular" ribbon**. The price is in the same Arcadia Display 42-ish size as the section H2 — pricing is treated as continuous editorial content, not a separate "card comparison" module. The accent color (`Plus`, `Pro` indigo) is the *only* differentiator between cards.
**Why steal:** OpsRadar has a 3-tier $500/$1.5K/$3K structure (Essentials/Growth/Scale presumably). The instinct is to put a "Most popular" ring on Growth and call it done. Mercury proves a quieter, denser, no-decoration pricing page reads as more confident — and lets the *plan-name color accent* do the highlighting work.
**How to apply:** On `/pricing`, render three white cards on `#FBFCFD` background, no borders, no shadows, no ribbons. Price as a 42–48px headline. The middle tier's name (e.g. "OpsRadar **Growth**") uses electric-blue inline color on the word "Growth" — that single color shift is the entire visual hierarchy.

---

## 7. The 3 Things That Wouldn't Work for OpsRadar

### 1. The full-bleed photographic/cinematic hero with scroll-jacking
**Why not:** Mercury's homepage hero is a 100vh cinematic photo with scroll-pinned imagery that swaps as you scroll. It's beautiful — but it works for Mercury because:
- They're a banking brand and the photo evokes "ambitious, wealthy, free" — an emotional sell.
- They've already won the category (300K customers, $650M ARR). They can afford slow, atmospheric reveals.
- Their user is *deciding which bank to switch to* — already mid-funnel, willing to scroll.

OpsRadar's agency-owner ICP is **bottom-funnel, time-poor, skeptical**, and the category ("AI COO for agencies") is unowned. They will not scroll through a cinematic reveal. They want to see *"is this real, is the dashboard real, does it talk to my stack"* in ≤4 seconds. Steal the *photographic emotional pull* (section 6 above), but **not** the scroll-jacked 100vh treatment. Keep the actual product mockup visible above the fold.

### 2. The single-word identity headline ("Radically different banking")
**Why not:** Mercury can headline with a 3-word category claim because the *category* (banking) is universally understood. Their adjective ("Radically different") is enough to differentiate.

OpsRadar can't do this — *nobody knows what an "AI COO" is yet*. Headlining `/` with "Radically different operations" would land as "what is that?" rather than "tell me more". OpsRadar headlines need to do two jobs Mercury's headlines no longer do: (1) **name a known pain** (margin leak, scope creep, $10K fractional COO), and (2) **name the new mechanism** (vertical AI watching your stack). Mercury's elegance is a *post-category-recognition luxury* OpsRadar hasn't earned yet. Use Mercury's *subpage* headline formula (Category for Aspirational User) rather than the homepage's bare adjective+category.

### 3. The 5-CTA-label vocabulary monoculture
**Why not:** Mercury can ship a marketing site with five total CTA labels ("Open account", "Contact sales", "Open Account", "Learn more", "Log in") because every visitor *already wants to open a business bank account* by the time they hit the page. The CTA's job is to be friction-free, not persuasive.

OpsRadar visitors do **not** already know they want an AI COO. The CTA needs to do persuasion work specific to the section the visitor is reading:
- After leak stats → "See how much your agency is leaking" (audit CTA)
- After integrations list → "Connect HubSpot, see your margin in 5 minutes" (product CTA)
- After pricing → "Book a 20-min demo with the founder" (sales CTA)
- After fractional-COO comparison → "Replace your fractional COO calculator" (tool CTA)

OpsRadar should keep its **3–4-label vocabulary** ("Book a demo", "See sample audit", "Get the agency benchmark", "Connect your stack") and *vary the label by section context*. Don't collapse to a single "Get started" the way Mercury collapses to "Open account".

---

## 8. Direct Inspiration Mapping

| OpsRadar page | Mercury element / pattern | Specific change |
|---|---|---|
| **`/` (landing)** — current hero | `/business-banking` hero triple-CTA row | Replace single CTA with: `<input placeholder="Your work email">` + `Book a 20-min demo` (electric-blue `#0066FF`, 32px radius pill, 16px text weight 420, 300ms ease-out on bg only) + `See a sample audit` (`rgba(0,102,255,0.1)` fill, electric-blue text, same 32px radius). All three elements ~48px tall, sit on one row, max-width ~520px centered. |
| **`/` (landing)** — section 2 | `/` Mercury thesis billboard ("$650M in annual revenue and profitable") | Insert a section after hero containing only one 42px Arcadia-equivalent H2: *"15–30% margin leaks. 30–90 day detection lag. One AI COO at 1/20th the cost."* Triple-anchor + outcome clause. No body copy, no image. ~160px vertical padding above and below. |
| **`/` (landing)** — social proof section | `/` "Loved by 300K+ of the most ambitious entrepreneurs" H2 | Until real testimonials exist, run: *"Built for the 60% of sub-$5M agencies running ops in their head."* Single H2, no logo wall, no avatars. When first 3 customers ship, replace with 3-up testimonial card using Mercury's 28px Arcadia-display quote treatment on `#272735` (or OpsRadar dark-mode equivalent). |
| **`/services`** — services list | `/business-banking` "Everything you need for smooth banking" feature triptych | Convert the services list from cards-in-a-grid to **a single 672px column with feature-image-below-text blocks alternating**. Drop card borders/shadows. Each block: 42px H2 (the service category) → 21px sub (one sentence) → full-width-of-column product UI screenshot underneath. ~120px vertical gap between blocks. |
| **`/pricing`** | `/pricing` 3-card module | Three tiers ($500 / $1,500 / $3,000) as **borderless white cards on `#FBFCFD` background**. Price renders as 42px Arcadia-display-equivalent. The middle tier's name (e.g. "**Growth**") has its key word inline-colored electric-blue — that's the entire highlight. Drop the "Most popular" ribbon. CTA on each card: same 32px indigo→electric-blue pill, white text, "Book a demo for [Tier]" (single CTA label, varied parametrically). |
| **`/results`** (audit results) | `/insights` "Banking with built-in intelligence" page | The Mercury `/insights` page treats *the product's own analytics output* as marketing. OpsRadar's audit-results page can do the inverse: treat the user's *actual numbers* (utilization gap, margin leak estimate, scope creep $) as marketing for the paid tier. Render the dollar amounts at 42px Arcadia-display-equivalent in `#272735` (dark mode: `#EDEDF3`). Sub-line in 21px body color. Mercury's lesson: *let the number be the headline*. |
| **`/about`** | `/` press-row band ("Mercury lands $300M Series C / Fast Company's Most Innovative / $650M ARR and profitable") | Replace generic "About" hero with a 3-up authority row: a number, a milestone, a proof point. Examples for OpsRadar: *"10 agency-stack integrations shipped"* / *"First AI COO purpose-built for agencies"* / *"Founded by an agency operator"*. 42px Arcadia-display-equivalent H2s side by side. |
| **Nav (global)** | Mercury nav | Five items max: `Product` · `Pricing` · `For agencies` · `About` · `Log in` + primary pill `Book a demo`. Drop any item that doesn't fit (currently `/workflows`, `/services`, `/about` likely overstuffs the bar). Pill CTA in nav: indigo `#0066FF`, 32px radius, 14–16px label "Book a demo". |
| **Buttons (system-wide)** | Mercury CTA pill | Adopt a **single button shape system**: 32px radius pill, two variants — solid (electric-blue fill, white text) and ghost (`rgba(0,102,255,0.1)` fill, electric-blue text). All other shapes (12px-radius rectangles, sharp-corner buttons) retired. Transition: 300ms ease-out (`cubic-bezier(0, 0, 0.2, 1)`) on `color, background-color, border-color` only — never `transform`. |
| **Typography (system-wide)** | Mercury Arcadia / Arcadia Display pairing | OpsRadar already loads NotoSansDisplay + NotoSerifDisplay. The Mercury lesson is: **use one display family at one weight (480-equivalent) for all H1/H2, and let size + weight inside that range be the entire hierarchy**. Don't introduce a third font. Don't oscillate between 400 and 700; pick a single mid-weight and stay there. |
| **Color (system-wide)** | Mercury `#5266EB` indigo discipline | OpsRadar's electric-blue `#0066FF` should be **reserved exclusively for CTA pills, hover/active states, and inline accent words** (the "Growth" in "OpsRadar Growth"). Strip electric-blue from icons, backgrounds, dividers, gradients. Every other surface drops to neutrals. Mercury's `#5266EB` appears in fewer than 5% of pixels on any given viewport — that's the discipline to replicate. |

---

## Sources

- Live computed-style scrape: `/tmp/design-teardowns/mercury/styles.json` (92KB JSON, 6 pages)
- Screenshots (viewport + full-page): `/tmp/design-teardowns/mercury/*.png`
- Raw HTML: `/tmp/design-teardowns/mercury/home.html`, `agencies.html`, `pricing.html`
- Scrape script: `/tmp/mercury-teardown.mjs` (re-runnable)
- Quotes verified against Mercury's rendered HTML on 2026-05-18.
