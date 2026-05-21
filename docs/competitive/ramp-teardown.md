# Ramp — Deep Design Teardown

*Studied: 2026-05-18. Pages: homepage, /intelligence, /pricing, /customers, /expense-management, /blog. Methodology: Playwright at 1440×900 + computed CSS extraction, with WebFetch fallback for body copy when session hijacking interfered. Screenshots: `./ramp-screenshots/`.*

Ramp is a $13B+ spend-management company that runs the most polished, opinionated, finance-flavored marketing site in B2B SaaS. OpsRadar already cites them as a design reference — this teardown is about what to actually steal and what to leave behind.

The single most important thing to internalize: **Ramp does not look like a SaaS site. It looks like an editorial finance publication that happens to sell software.** Every signal in the page — typography, photography of receipts and ledgers, copy cadence, the way numbers are featured — is dressed up to feel like *Bloomberg* or the *Financial Times*, not *Twilio* or *Segment*. That's the move.

---

## May 2026 update — now a $40B AI-finance company

The "$13B+" framing above is now stale. Ramp's 2026 numbers reframe what this design reference actually represents:

- **In talks to raise $750M at $40B+ valuation (May 2026)** — 6 months after a $300M round at $32B (Nov 2025), itself 5 months after $500M at $22.5B (July 2025). **Valuation went $16B → $22.5B → $32B → $40B in under 12 months.** (Source: techcrunch.com, May 2026; whalesbook.com, 2026)
- **$1B annualized revenue (Nov 2025)** — doubled in a year per CEO Eric Glyman. (Source: techcrunch.com, May 2026)
- **#5 on CNBC Disruptor 50, 2026.** (Source: cnbc.com, May 2026)
- **Three sequential agent launches in 10 months**:
  1. **Agents for Controllers** — July 2025
  2. **Agents for AP** — October 2025
  3. **Agents for Procurement (April 2026)** — a *fleet* of AI agents that triage employee requests, source vendors, review contract terms, run compliance checks. Customers averaging **16% annual savings on vendor costs + 46 hours/month saved on manual purchasing.** (Source: prnewswire.com, April 2026; pymnts.com, April 2026)

**Sharper positioning lesson for OpsRadar**:
1. **Agent fleets, not chatbots.** Ramp doesn't ship "Ramp AI." It ships *named agents per finance role* (Controllers, AP, Procurement). OpsRadar's equivalent should be **named agents per agency role**: "Margin Agent," "Scope Agent," "Cash Agent," "Capacity Agent," "Briefing Agent." Each is a discoverable product on the site with its own page, ROI proof, and demo. Resist the urge to put it all under "OpsRadar AI."
2. **Hard ROI per agent.** "16% vendor savings + 46 hours/month back" is the *exact* claim format. OpsRadar's per-agent ROI claims should mirror: "Margin Agent: recovers $X/mo in unbilled scope across average client." Not feature bullets — outcome math.
3. **The editorial-finance design lesson now load-bearing.** At $40B and shipping agent fleets, Ramp's restrained editorial brand is what makes "AI fleet of agents" sound *adult* instead of toy-like. OpsRadar handling agency P&L data needs the same adult dress code — restrained palette, serif accents, dense data tables in screenshots, no neon AI glow.

---

## 1. The Visual System

### Color palette (hex, extracted from computed CSS)

| Role | Hex | Notes |
|---|---|---|
| **Primary CTA** | `#e4f222` | Electric lime-yellow. NOT orange. (Most people mis-remember Ramp as orange — they're not; the lime CTA is unmistakable.) Used on every primary button across every page. |
| **Ink (text + dark sections)** | `#0c0a08` | Warm near-black, not pure `#000`. Reads as "ink on paper" — a finance trade-publication tonality. |
| **Surface white** | `#ffffff` | Default body bg on most pages (home, pricing, customers, expense-management, blog). |
| **Warm card / band** | `#f4f2f0` | The off-white for product cards and section bands. Reads as "newsprint." 12px radius, no shadow, no border. |
| **Intelligence pale slate** | `#d2dff3` | A muted blue-gray, used as body bg on `/intelligence` to signal "this section is the AI brain." Subtle, not neon. |

There is **no second accent**. Ramp does not use cyan + magenta + green. The CTA yellow is the only color that pops, and it pops *because* everything else is monochrome ink-on-paper.

### Typography stack

- `font-family: lausanne, "lausanne Fallback"` everywhere — body, headlines, nav, buttons, customer quotes.
- **Lausanne is a Swiss-grotesque sans by 36 Days of Type / Nizar Kazan**, custom-licensed. It has the *narrow, slightly mechanical, neutral-but-warm* quality of *Inter* mixed with *Söhne*. It is **not a serif**. The "Ramp serif" some people misremember is actually Lausanne at large sizes with tight tracking, which reads serif-like because of how confidently it sits on the page.
- **No serif on the site at all** (verified by querying every element with a serif font-family — zero matches).
- **One typeface, many weights & sizes.** That's the discipline.

### Type scale (measured)

| Element | Size / line-height / weight | Source |
|---|---|---|
| Homepage H1 | `48px / 50px / 400` | "Cards, expenses, bill payments, and banking - in the blink of AI." Letter-spacing: `-0.01px` (essentially zero — Lausanne already runs tight). |
| Inner-page H1 (pricing, customers, expense-management, blog) | `64px / 64px / 400` | E.g., "Start for free. Scale with Intelligence." Tight 1:1 line-height. |
| Customer quote | `28px / 400` | Body-paragraph quote, no italic, no quote-bar. Just the text. |
| Body / nav / buttons | `16px / 24px / 400` | The whole page uses 16/24 as the floor. |
| CTA label | `14–16px / 400` | Same weight as body — the yellow is what makes it pop, not weight. |

**Critical:** Ramp's headlines use **font-weight 400** (regular), not bold. The size + tight line-height + the typeface itself does the work. Most B2B sites push 600/700 — Ramp is restrained.

### Spacing & containers

- Card padding observed: `40px 40px 0px` (40 top/sides, content meets the image at bottom).
- Card radius: `12px`. **No box-shadow. No border.** Flat color blocks differentiate.
- CTA padding: `12px 16px` (medium buttons) or `0px 20px` with fixed height (hero buttons).
- CTA radius: `6px` (notably *less* round than 8px shadcn defaults; reads as a credit card corner).

### The signature visual moves

1. **Receipt-and-ledger photography.** The hero on home features a literal animation of paper receipts being filed through automated steps — the page sells "no more receipt chasing" by *showing receipts being neutralized*.
2. **Number callouts as design.** "27.5M+ hours saved," "75% faster month-end close," "3x more efficient intake-to-pay" — these aren't side stats, they are typography-as-art at 64px+ in case-study cards.
3. **The lime-yellow CTA, nothing else.** Every primary action across the site uses `#e4f222`. The yellow IS the brand asset.
4. **The "lausanne wall."** Long paragraphs of body text rendered in the same typeface as the headline create a feeling of an editorial column, not a SaaS landing page.

---

## 2. The Hero Pattern

### Above-the-fold construction (homepage)

1. **Eyebrow / superscript stat** — `US CORPORATE PAYMENTS PROCESSED BY RAMP:` (small caps, sets the scale). The eyebrow is positioned *above* the H1 and sells social proof before the headline lands.
2. **H1** — `Cards, expenses, bill payments, and banking - in the blink of AI.` (48px, weight 400, tight `-0.01px` letter-spacing.) Note the comma-listed product noun, then a witty pivot ("in the blink of AI"). Not "AI-powered." Not "agentic." A *phrase*.
3. **Email capture field, inline.** No subhead paragraph — straight from H1 to "Email" input.
4. **Primary CTA: "Get started for free"** on `#e4f222` with `6px` radius, dark ink text.
5. **Background visual:** a graphic / motion piece of receipts and ledger lines.

The hero *does not* lead with a value-prop paragraph. It leads with a categorical noun list and a category-creating phrase. That's a confidence move — Ramp assumes you already know what spend management is.

### Inner-page hero (pricing, customers, expense-management)

- H1 ramps up to **64px / 64px**, single line or two-line.
- Headlines are **declarative + parallel**: "Start for free. Scale with Intelligence." / "Reimagine expense management without the busywork." / "Customer Stories."
- All inner heroes drop the eyebrow stat. The H1 *is* the hero.

### Headline formula

> `[Imperative or Categorical noun phrase]. [Aspirational parallel clause].`

Examples:
- "Cards, expenses, bill payments, and banking - in the blink of AI." (categorical list → AI clause)
- "Start for free. Scale with Intelligence." (imperative pair, parallel)
- "Reimagine expense management without the busywork." (imperative + benefit clause)
- "Meet your next million hires." (provocation as standalone hero)

Notice: **no question marks. No "you." No "we."** Pure declarative. Reads like a Bloomberg lede.

---

## 3. The Page Architecture

Across Ramp's product pages, the rhythm is shockingly consistent:

1. **Hero** — H1 + CTA, no subhead paragraph.
2. **Social-proof band** — small logo strip + "Join 50,000+ businesses" stat (sometimes implicit in the hero eyebrow).
3. **The Problem Section** — single H2 framing the pain ("Systems that never spoke" / "This is what five separate systems to reimburse a flight looks like").
4. **The Big Promise** — single H2 setting up the shift ("Keep your finance team focused on strategy. Let agents handle the busywork.").
5. **Product feature blocks (3–8)** — each is an H3 + 1-sentence body + product screenshot inside a `#f4f2f0` rounded card. Examples from `/expense-management`: "Let Ramp capture receipts, fill memos, and approve in real time" → "Control spend before it happens" → "Stay compliant with built-in guardrails" → "Automate spend setup at scale."
6. **Customer evidence section** — quote at 28px, customer name + role + company, often paired with a 64px stat ("75% reduction in reconciliation time — Webflow").
7. **Integration / breadth band** — "200+ integrations to the tools you already use."
8. **Closing pairing CTA** — H2 "Time is money. Save both." + yellow CTA + sometimes "Limited time: Get $150 when you take a Ramp demo."
9. **Footer** — Docs, Help Center, Integrations, Pricing, Trust Center.

Section heading **cadence** is the key insight: each H2 is a *complete sentence* with a period. They don't use noun-phrase headings like "Smart automation" — they use full sentences: "Let Ramp review and reconcile your expenses." This makes the page read like a manifesto rather than a feature list.

---

## 4. The Copy Patterns

### Headline formulas

**(A) The compound imperative:** Two imperative clauses joined by a period. Often parallel grammar.
- "Scale the team. Shrink the paperwork."
- "Start for free. Scale with Intelligence."
- "Time is money. Save both."

**(B) The categorical-noun-list + AI twist:**
- "Cards, expenses, bill payments, and banking - in the blink of AI."

**(C) The provocation:**
- "Meet your next million hires."
- "We've got the receipts." (double meaning — receipts as evidence, receipts as the literal thing Ramp ingests.)

**(D) The before/after:**
- "Reimagine expense management without the busywork."
- "Routine tasks, handled for you."
- "Approves when it's safe. Escalates when it's not."

**(E) The named-and-shamed enemy:**
- "Systems that never spoke" (subtle dig at SAP / Coupa / Concur stack)
- "Eliminate manual expense reporting."
- "Month-end madness"

### Body voice

- **Active, present-tense, second-person rare.** Most sentences omit "you" — "Reclaim hours lost each month on expense reports. Ramp automates each step, from collecting receipts to drafting memos."
- **Specifics over abstractions.** Hours, percentages, dollar amounts, FTEs, days. Counted in WebFetch: 20+ distinct quantified outcomes featured across the site (e.g., "$250K savings identified," "325 hours saved/month," "75% reduction," "1 day card issuance vs. days," "90% auto-coded," "5x faster review time," "27.5M+ hours saved collectively").
- **No hedging.** No "helps you to," no "can potentially," no "designed to." It's "Ramp's agent knows every code." Period.
- **Dry wit slipped in.** "We've got the receipts." "In the blink of AI." "Month-end madness." These would feel try-hard from a startup; Ramp earns them because the surrounding copy is so restrained.

### CTA language

- Primary across the entire site: **"Get started for free"** (homepage, pricing free tier, all product pages).
- Secondary: **"See a demo"** (used as the dark-text-on-yellow alternate in nav, for the "talk to sales" path on every page).
- Enterprise: **"Contact sales"** (only on the pricing Enterprise tier).
- Closing CTA band: **"Make the switch"** (homepage closer, more conversion-y).
- Interactive product preview: **"Explore interactive demo"** (on /expense-management).

**There are only ~5 distinct CTA strings on the entire site.** Discipline.

### Customer story treatment

Customer stories are *titled as quantified outcomes*, not as company names. From `/customers`:

- "Boys & Girls Clubs of San Francisco earns more from finance than it spends on it"
- "How a 17-person nonprofit reclaimed 11 work weeks"
- "Perplexity's finance team of 10 scales one of the fastest-growing AI startups"
- "Brandt grew 3x with zero added accounting headcount"
- "Ketchum saves 100+ hours to make every taxpayer dollar count"
- "ABB Optical cuts compliance audits from 2 months to 2 days"

Every title is **company name + quantified action verb + measurable outcome.** Not "How [Customer] uses Ramp" — that's the SaaS default and Ramp refuses it.

Quote treatment is minimal: just text at 28px, then name + title + company. No portrait. No company logo crowding the quote. The quote *is* the design element.

---

## 5. The Motion Language

(Inferred from the homepage — full motion analysis would require a side-by-side video capture, which playwright struggled with under the session-hijacking conditions.)

- **Receipt-falling / ledger-filling hero animation.** Items animate as if being processed through a pipeline.
- **Hover on cards:** subtle scale (1.0 → 1.01–1.02), no shadow appearing. Pure flat hover.
- **CTA hover:** the yellow shifts to a slightly desaturated yellow or fades to a dark-on-light inverse on hover (visible in the network panel of one capture; not pinned to a precise value).
- **Scroll-triggered reveal:** sections fade-in from below with a ~150–200ms ease. Not parallax-heavy. The page does not lurch.
- **Number / counter animations:** large stats like "27.5M+ hours saved" and "$X savings identified" appear to count up on scroll-in (consistent with WebFetch context describing animated counters). The animation is *the* signature visual flourish — it visually reinforces "Ramp adds up."
- **Tight, restrained, fast.** Nothing pulses, glows, or rotates. There are no Three.js blobs and no shader backgrounds. The motion serves the data, not the brand.

Compared to OpsRadar's current shader + beams + glow-card stack (per `opsradar/src/components/ui/`), Ramp's motion language is two notches more conservative — and that conservatism is *part of the trust signal* for a finance audience.

---

## 6. The 7 Things to Steal for OpsRadar

OpsRadar's voice rules (per `.agents/product-marketing.md`) explicitly want: "Specific over abstract. Dollar amounts over adjectives. Active voice. Short sentences. Names a real number wherever possible." That's the Ramp voice almost word-for-word. The site can absorb a lot of Ramp without losing identity.

### 6.1 — The lime-yellow CTA as the only accent color

**What Ramp does:** `#e4f222` is the single accent across the entire site. Everything else is ink-on-paper.
**How to apply:** OpsRadar currently uses electric blue (`#0066FF`) + cyan (`#00D4FF`) as a dual accent. **Pick one.** Use the electric blue as the only CTA color across landing, pricing, /services, /audit, /results. Drop the cyan from buttons entirely — keep it only as a single hover or data-viz accent. The discipline is what reads as expensive.
**Where:** `src/components/ui/button.tsx` primary variant, `src/app/page.tsx` hero CTA, `src/app/pricing/page.tsx` pricing CTAs.

### 6.2 — Customer story titles as quantified outcome sentences

**What Ramp does:** "Brandt grew 3x with zero added accounting headcount." Title = company + verb + measurable outcome.
**How to apply:** When OpsRadar lands its first 3–5 case studies (priority per `.agents/product-marketing.md`), title them this way. Examples for OpsRadar's eventual customers:
- "SwishAd cut detection lag from 47 days to under 24 hours"
- "Ala Obeidat caught $18K in scope creep in week one"
- "[Agency] replaced their $9K/month fractional COO in 60 days"
**Where:** `/customers` page (new), homepage social-proof band, sales deck.

### 6.3 — Headlines at weight 400, not bold

**What Ramp does:** All H1s and H2s render at `font-weight: 400`. Size and tracking do the work.
**How to apply:** OpsRadar's NotoSerifDisplay (per CLAUDE.md design system) probably renders bold-ish by default. Audit headline weights — drop them one notch. Confidence reads as restraint, not shout.
**Where:** Global typography tokens, `tailwind.config.ts` or `globals.css` heading defaults.

### 6.4 — Section headlines as complete sentences with periods

**What Ramp does:** "Let Ramp review and reconcile your expenses." not "Reviews and reconciliation." Sentence-fragment headings are *banned* across product pages.
**How to apply:** OpsRadar's section headers should be:
- "Catch overserviced clients in week two, not quarter three."
- "Watch your utilization in real time."
- "The COO that doesn't take vacation."
- "Replace the $10K/month fractional COO."

Sentences with periods. Not "Catch overservicing." or "Live utilization."
**Where:** `/audit`, `/results`, `/services`, `/pricing` section headers throughout.

### 6.5 — The compound imperative headline formula

**What Ramp does:** "Scale the team. Shrink the paperwork." / "Start for free. Scale with Intelligence." Two short imperatives, joined by period, parallel grammar.
**How to apply:** OpsRadar hero options to test:
- "See the leak. Stop the bleed."
- "Watch your margin. Sleep at night."
- "Catch it early. Fix it cheap."

These map exactly to OpsRadar's voice rules (specific, short, named numbers nearby).
**Where:** Homepage hero H1, `/audit` hero, `/results` paid-tier paywall headline.

### 6.6 — Stat-as-typography in the body

**What Ramp does:** Numbers like "27.5M+ hours saved" or "75% reduction" appear at 48–64px in dedicated panels — they are visual objects, not in-paragraph footnotes.
**How to apply:** OpsRadar should pull the proof points already in `.agents/product-marketing.md` ("21.5% of agencies now losing money," "$30K/year reporting waste for a 15-client agency," "56 hours/week wasted on manual reporting," "$10K fractional COO vs $500 OpsRadar") and render them as **standalone 64px typographic blocks**, each in its own warm-off-white card with `#f4f2f0` bg, `12px` radius, no shadow.
**Where:** Homepage "the leak" section, `/services` proof band, `/pricing` justification band.

### 6.7 — One typeface, many sizes (the Lausanne move)

**What Ramp does:** Lausanne for everything — H1, body, CTA, footer, nav. The discipline of one typeface across an editorial page is what gives it the trade-publication feel.
**How to apply:** OpsRadar currently splits NotoSerifDisplay (headings) + NotoSansDisplay (body). That's a defensible choice, but it does push toward "tech startup that read a Stripe teardown." If you want the *Ramp / FT-meets-finance* feel rather than the *Mercury / Vercel* feel, **consider dropping the serif and running NotoSansDisplay (or a tighter grotesque like Söhne, Aeonik, or Lausanne itself if licensable) at all sizes.** Heresy, but it's what makes Ramp look like a finance publication.
**Where:** Font loader in `src/app/layout.tsx`. Test on a single landing route first.

---

## 7. The 3 Things That Wouldn't Work for OpsRadar

### 7.1 — The lime-yellow CTA itself

Ramp's `#e4f222` is **a 13-year-old fintech that processes US corporate payments at multi-billion scale.** They can land a wildly bold neon color because they've earned the right to be confident. For OpsRadar, an agency owner doing a $500–3K/month decision off a cold email, neon lime reads as "experimental startup" — exactly the wrong signal. OpsRadar wants to look *more* trustworthy than Productive, not *less.* Keep electric blue or push to a deeper navy/charcoal-on-white CTA. Save the bright accent for one place (e.g., the live "ALERT" indicator on the dashboard mock).

### 7.2 — The cool, headline-only hero (no subhead paragraph)

Ramp can ship "Cards, expenses, bill payments, and banking - in the blink of AI." with no explanatory subhead because their category is *understood*. Spend management is a known noun. OpsRadar is *creating the category* ("AI COO") — a headline-only hero leaves the agency owner asking "what is this?" and bouncing. **OpsRadar needs the 1–2 sentence subhead under the H1** to anchor the category, especially for cold traffic. Use the formula from `product-marketing.md`: *"OpsRadar is the AI COO for marketing agencies — the AI-native operations brain that monitors your agency in real time, surfaces what's going wrong before it costs you, and tells you what to do next."*

### 7.3 — The receipt/ledger photography aesthetic

Ramp's heroes feature literal scans of receipts, expense forms, paper ledgers — physical-world objects from the world of finance, photographed beautifully. This works because **the objects exist** and the audience (CFOs, controllers) feels them in their gut. OpsRadar's world is *agency operations* — there is no equivalent physical object. Trying to find "an agency receipt" would feel forced. **Instead, use product UI as the hero visual** — a screenshot of the alert feed, a screenshot of the multi-client dashboard, a screenshot of a Slack message from OpsRadar saying "Client X is now 23% over scope this month." That's the OpsRadar equivalent: the alert *is* the artifact.

---

## 8. Direct Inspiration Mapping

| OpsRadar page / surface | Ramp element to steal | Specific change |
|---|---|---|
| **Homepage hero** (`/`) | Ramp's compound-imperative headline formula | Replace current H1 with "See the leak. Stop the bleed." (or A/B test 3 imperatives — owner brain on "leak/bleed/margin/utilization"). Keep the existing subhead paragraph (OpsRadar needs it; Ramp doesn't). Use electric-blue CTA at `6px` border-radius, `12px 16px` padding, weight 400. |
| **Homepage social-proof band** | Ramp eyebrow stat above H1 ("US CORPORATE PAYMENTS PROCESSED BY RAMP:") | Add an eyebrow micro-stat in small caps above the H1 — "Watching $XXM in agency operations in real time" as soon as we have aggregated data. Until then: "Built for $500K–$5M agencies." |
| **`/services` page** | Ramp's H3-card pattern from `/expense-management` (warm off-white `#f4f2f0`, `12px` radius, no shadow, no border, `40px` padding, image meeting the bottom) | Replace any current shadowed/bordered service cards with flat warm cards. Each card = full-sentence H3 ("Detect overserviced clients before they cost you $5K.") + 1-sentence body + product screenshot bleeding to the card bottom. |
| **`/audit` results page** (`/results`) | Ramp's customer-story title formula | Title each completed audit's "Customer X result" the same way: "Agency [Name] uncovered $14K in monthly margin leak in 18 minutes." Quantified verb + outcome — no "How X used OpsRadar." |
| **`/pricing` page** | Ramp's three-tier card layout + per-tier CTA discipline | Pricing H1 should be 64px, 1:1 line height, weight 400 — directly steal the spec. Use exactly 3 tiers ($500 / $1,500 / $3,000) labeled with imperatives: "Start." / "Scale." / "Operate." Per-tier CTA must be **"Get started"** on the lower two and **"Talk to founder"** on the top tier — only 2 CTA strings across the page. |
| **`/about` page** | Ramp's restrained type-only hero | Make the about page a typographic essay — H1 at 64px, paragraphs at 16/24, no hero image. Pure editorial. Currently most B2B about pages are over-designed; an editorial page reads *more* trustworthy for a founder-led sale. |
| **Customer logos** | Ramp's logo strip pattern (single row, grayscale or dark ink, no card around them) | When OpsRadar has 5+ logos, render them as a single greyscale row directly on the body bg — no card, no border, no "Trusted by" label. The row itself signals trust. Until then, skip the band entirely (Ramp does not fake logos). |
| **Closing CTA band** (every page) | Ramp's "Time is money. Save both." pattern | Standardize on a single closing-CTA band across all pages: H2 at 64px (compound imperative), single primary button, optional one-line incentive ("Book a 20-min demo this week, we'll send the audit before the call."). |
| **Blog / resources** | Ramp's restrained blog landing | Headline = "The OpsRadar Field Guide." (or equivalent named publication — *editorial* framing). Single typeface. Sentence-case article titles. No card shadows. |
| **Email capture (chat widget alt)** | Ramp's inline-in-hero email field with adjacent yellow CTA | The current chat-widget bubble could be supplemented (or replaced on the homepage) with an inline email input + "Get the audit" yellow-on-ink button, sitting directly under the H1. Lower-friction, more legible than a chat hover. |

---

## Closing observation

The thing that's hardest to clone — and worth the most — is Ramp's **confidence cadence**. Headlines end in periods. Sentences are 4–9 words. Numbers do the persuading. No exclamation points appear anywhere on the site. No "✨" or "🚀". No "AI-powered" — they say "Powered by 50,000 others that came before you" (which is just *better*).

OpsRadar's voice rules already say this. The site doesn't yet *look* like the voice. Ramp is the existence proof that the look is possible.

— Studied 2026-05-18 against ramp.com production build.
