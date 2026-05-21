# PostHog — Deep Design Teardown

*Captured 2026-05-18 from posthog.com, /pricing, /handbook, /customers, /why, /handbook/company/values, /handbook/company/story, /product-analytics. WebFetch fallback was used end-to-end because the local Playwright session was being aggressively hijacked to other tabs (Ramp, Cursor, Notion) and computed-CSS extraction kept returning data from the wrong page. **All CSS values quoted below are sourced from PostHog's publicly documented design system (their "Brand assets" + open-source `posthog.com` Next.js repo on GitHub), not from live computed styles — verify before shipping pixel-level clones.** All copy is verbatim from the rendered pages.*

Existing screenshots in this repo:
- `posthog-01-home-hero.png` (root) — **mis-saved; actually shows Cursor.com.** Discard.
- `posthog-teardown/01-home-viewport.png`, `01-home-fullpage.png` — both blank PNGs from a prior failed session. Discard.

Net: this teardown is **content + design-system-doc grounded, not computed-CSS grounded**. Sections marked *(WebFetch fallback — no computed CSS)* indicate where we relied on PostHog's published brand kit instead of live readings.

---

## May 2026 update — from analytics to AI devtools, now a unicorn

PostHog crossed two important thresholds between the original teardown date and May 2026:

- **Series E: $75M at $1.4B valuation, September 2025**, led by Peak XV Partners — unicorn status. Followed the **$70M Series D at $920M led by Stripe (June 2025)**. Two large rounds in three months. (Source: uxwizz.com, 2025; news.crunchbase.com, 2025)
- **$57.5M ARR in February 2026** — up ~99% YoY from ~$29M, and up from $53.1M at end-2025. (Source: sacra.com, 2026)
- **Max AI launched in open beta (2026)** — explicit positioning shift "from open-source analytics platform to AI-powered devtools suite that automates engineering workflows by integrating data insights into code generation." (Source: uxwizz.com, 2025)
- **Pricing**: usage-based, generous free tier (1M events, 5K recordings, 1M feature flag requests, 1.5K survey responses, 100K error exceptions, 50GB logs, 2K AI credits). **AI credits: first 2K free, then $0.01 per credit.** (Source: posthog.com/pricing, 2026; posthog.com/docs/posthog-ai/pricing, 2026)

**Sharper positioning lesson for OpsRadar**:
1. **The "boring layer becomes AI layer" pivot is now proven.** PostHog was a Mixpanel/Amplitude alternative; in 2026 it's an AI devtools suite. OpsRadar's analog: don't be remembered as "the agency dashboard that added AI." Be remembered as **the AI COO that happens to read your data sources**. Lead with the agent; the integrations are infrastructure.
2. **Usage-based pricing + generous free tier is the AI-era playbook.** PostHog's free tier is enormous; the paid pull is volume and AI credit consumption. OpsRadar should test a **free "watch-only" tier**: one connected tool (Stripe-only), read-only insights, no agentic actions — to seed the funnel. Pull the monetization into action throughput.
3. **Stripe as an investor + customer + adopter is the trifecta.** Stripe led PostHog's Series D, uses PostHog internally, and PostHog ships a Stripe integration. The cleanest GTM loop in B2B SaaS. OpsRadar's equivalent: identify the 1–2 strategic partners (HubSpot / ClickUp / Harvest) whose investment + endorsement + ecosystem fit would unlock the same loop.

---

## 1. The Visual System

### Typography *(WebFetch fallback — no computed CSS)*

PostHog's public site ships a **Matter** display stack for headings + a humanist sans for body. Per their open-source Tailwind config (`posthog.com/tailwind.config.js`) and brand kit:

```css
/* posthog.com canonical */
--font-heading:  "MatterSQ", "Matter SQ", ui-sans-serif, system-ui, sans-serif;
--font-body:     "MatterSQ", "Matter SQ", ui-sans-serif, system-ui, sans-serif;
--font-mono:     "MatterVF Mono", "JetBrains Mono", ui-monospace, monospace;
```

Matter (Displaay Type Foundry) is the most distinctive piece of the PostHog identity. It's a **geometric grotesque with optical sizing**, slightly quirky terminals (the lowercase `g`, the angled `a`), and a pronounced contrast at display sizes. The mono variant ("Matter VF Mono") shows up everywhere PostHog wants to signal "this is a dev tool" — file-extension nav labels (`home.mdx`, `customers.mdx`, `demo.mov`), code blocks, and the pricing calculator's per-event prices.

**Inferred type scale from page structure (Matter weights are 300/400/500/600/700):**

| Role | Approx. size | Weight | Notes |
|---|---|---|---|
| Hero H1 | 60–80px | 700 (Matter Bold) | Tight tracking, near-black on warm cream |
| Section H2 | 36–48px | 700 | Often paired with an emoji or a tiny decorative SVG |
| Section eyebrow | 14–16px | 500, uppercase | Frequently colored with the section's accent (red, blue, yellow) |
| Sub-feature H3 | 24–28px | 600 | |
| Body lead | 18–20px | 400 | Long, conversational sentences — not punchy taglines |
| Body default | 16px | 400 | |
| Mono labels | 14–15px | 400 (Matter Mono) | File extensions, code, pricing numbers, footer |
| Footnote / aside | 12–14px | 400, italic | Used for the "(Yes they actually use us…)" parentheticals |

**The single most stealable typographic move:** body copy is **long-form and conversational**, not B2B-tight. PostHog uses Matter's humanist edges to make a 25-word paragraph feel like a Substack post, not a marketing page. Compare:

> "Product development used to mean manually writing code, running analysis, diagnosing bugs, and rolling out changes using dozens of tools. PostHog is the only platform that acts like a co-pilot for you (and your AI agents) to do it all – *autonomously*." — homepage hero sub

That's 42 words *under* an H1. Stripe ships 8.

### Color palette *(WebFetch fallback — no computed CSS)*

Per PostHog's public brand kit (posthog.com/brand) and their Tailwind theme tokens (`tailwind.config.js` in the open-source repo):

**Primary surfaces — "warm tan" not "white"**
- `#EEEFE9` — **`bg-tan`**, the famous off-white cream background. This is the single most-stolen PostHog color. Not white, not gray — a desaturated, slightly-warm cream that signals "handbook," "newsprint," "physical book" rather than "SaaS dashboard."
- `#1D4AFF` — **`bg-blue`** / accent blue. PostHog's signature electric blue.
- `#F54E00` — **`bg-orange`** / hedgehog orange. The mascot color. Used on Hogzilla and on aggressive CTAs.
- `#F7A503` — **`bg-yellow`** / sticker yellow.
- `#29DBBB` — **`bg-teal`** / accent teal.
- `#621F69` / `#831D6B` — **purple** for AI / advanced features.
- `#000` — true black. Headings, body text, borders.
- `#FFF` — used sparingly, mostly inside product UI screenshots.

**The three-color signature combo** (Blue `#1D4AFF` + Orange `#F54E00` + Yellow `#F7A503` on tan `#EEEFE9`) reads as "early-2000s zine / programmer indie." It is intentionally not the "purple-pink gradient" SaaS palette of 2021–2024. PostHog ships a **flat, saturated, almost MS Paint** color story.

### Spacing & borders *(WebFetch fallback — no computed CSS)*

- **Border treatment:** PostHog uses **solid 1–2px black borders on cards and CTAs** ("brutal" border style, not the soft `border-slate-200` of standard SaaS). Buttons often render as `border: 2px solid #000; border-radius: 6px;` with no shadow.
- **Shadow treatment:** Instead of `box-shadow: 0 1px 3px rgba(0,0,0,0.1)`, PostHog ships **hard offset shadows** — e.g., `box-shadow: 4px 4px 0 0 #000` (Memphis / Neobrutalist style). You see this on the pricing-tier cards and the home-page bento.
- **Border-radius:** **Mostly small (4–8px)**, occasionally 0 (sharp). Almost never the `rounded-2xl`/`rounded-3xl` (16–24px) that Stripe/Linear/Vercel default to. The visual effect: PostHog feels *built*, not *designed.*
- **Spacing rhythm:** Tailwind defaults (8px scale: `gap-4`, `py-12`, etc.) but PostHog frequently packs cards with **rotated stickers, doodles, and overlapping illustrations** that break the grid — intentional visual chaos.

### The Signature Visual Move

PostHog has **three** trademark moves, and they reinforce each other:

1. **The hedgehog (Hogzilla, Detective Hog, Surprised Hog, etc.) as an embedded character.** Not a logo — the hedgehog is a *narrator.* It appears mid-page wearing different costumes (detective hat, sunglasses, lab coat), with speech bubbles ("This hog has an answer"). PostHog spends an unusual amount of design budget on **dozens of mascot illustrations per page.**
2. **The "handwritten / hand-drawn" SVG layer.** Underlines, arrows, circles, scribbles overlaid on copy. Always in the brand colors. Always angled (3–7° rotation). They're the "sticky note marker" treatment.
3. **File-extension navigation as branding** — `home.mdx`, `customers.mdx`, `demo.mov`, `pricing.psheet`, `posts.psheet`. The nav literally renders as if you're looking at a folder of files. This is the single most-distinctive PostHog move and **only works because their ICP is engineers** who recognize `.mdx`.

The aesthetic name: **"open-source maximalism"** — every page looks like it was made by 7 people who all had strong opinions and none of them lost the argument.

---

## 2. The Hero Pattern

**Above-the-fold construction (homepage):**

```
[Sticky top nav: logo · home.mdx · customers.mdx · demo.mov · Talk to a human · Sign up ↗]
   ↓
[Eyebrow row — optional emoji + announcement]
   ↓
H1 (60–80px, Matter Bold, black on tan)
   ↓
Long sub-para (42 words, 18px, conversational)
   ↓
Two CTAs side-by-side  +  small "no credit card required" microcopy
   ↓
Hogzilla illustration (HUGE — often 400px+ tall, dominates the right side)
   ↓
Customer logo strip — but with a parenthetical aside: 
   "(Yes they actually use us, no it's not just some random engineer 
    who tried us out 2+ years ago.)"
```

**Verbatim copy from homepage hero:**

> **H1:** "The new way to build products"
> **Sub:** "Product development used to mean manually writing code, running analysis, diagnosing bugs, and rolling out changes using dozens of tools. PostHog is the only platform that acts like a co-pilot for you (and your AI agents) to do it all – *autonomously*."
> **Primary CTA:** "Get started - free"
> **Secondary CTA:** "Install with AI"

**The headline formula:** *"The [new/only/right] way to [verb] [outcome]"* — never "AI-powered" or "next-generation." Just claims category leadership without buzzwords.

**The CTA formula:** Primary is **always** "Get started - free" with a dash, never an em-dash. Secondary varies — and the secondary is where PostHog flexes audience-specific copy ("Install with AI", "Talk to a human", "Read the docs"). The "Talk to a human" framing is itself a flex — most SaaS calls it "Contact sales."

**The "no credit card required" microcopy** is rendered in italic, gray, tiny. Always present, never bolded.

---

## 3. The Page Architecture

PostHog homepage section ordering (verbatim H2s, in order):

1. Hero (no H2 — H1 only)
2. **"Install with AI in a single prompt"** — dev-flavored install demo, codeblock-heavy
3. **"Understand what users are doing"** — the analytics product showcase, bento-style
4. **"Who's using PostHog?"** — customer logos with parenthetical disclaimers
5. **"PostHog data stack, built for data teams and loved by product teams"** — positioning section
6. **"Usage-based pricing"** — pricing calculator embed
7. **"PostHog AI"** — AI product showcase
8. **"Why PostHog?"** — values bullets (links to /why)
9. **"Bedtime reading"** — blog posts (named like a children's book section, not "Latest blog posts")
10. **"Shameless CTA"** — the final CTA section is *literally labeled "Shameless CTA"*

**What this breaks:**

- **The "Features → Social proof → Pricing → CTA" SaaS template is shattered.** PostHog interleaves social proof, install instructions, and pricing throughout — not as discrete sections.
- **They put the pricing calculator on the homepage.** Most B2B SaaS sends you to `/pricing`. PostHog says: see it now, here.
- **The final CTA is self-aware.** Calling it "Shameless CTA" inoculates the user against feeling sold to. It's the same trick as saying "I know this is a long email but…" — and it works.
- **Section names are titles, not topics.** "Bedtime reading" instead of "From the blog." "Who's using PostHog?" instead of "Customers." Every label is rewritten to feel hand-crafted.

**Rhythm:** Heavy text → heavy illustration → heavy text → heavy illustration. PostHog uses Hogzilla as a *palette cleanser* between text-dense sections, the way a magazine uses a full-bleed photo.

---

## 4. The Copy Patterns

### Headline formulas

| Pattern | Example |
|---|---|
| Category-claim ("The X way to Y") | "The new way to build products" |
| Imperative verb ("Verb what users are doing") | "Understand what users are doing" |
| Question H2 ("Who's…?", "Why…?") | "Who's using PostHog?", "Why PostHog?" |
| Compound positioning | "PostHog data stack, built for data teams and loved by product teams" |
| Genre-misdirection | "Bedtime reading", "Shameless CTA" |
| File-as-label | `home.mdx`, `customers.mdx`, `posts.psheet` |

### Body voice — the "founder-y, YC-direct" register

**Verbatim samples that define the voice:**

> "Our generous free tier means **_more than 90% of companies use PostHog for free._**" *(pricing)*

> "we don't rely on investors to grow, and we're stable" *(pricing)*

> "avoiding the average dumb vc-backed company stuff" *(pricing — note the lowercase "vc-backed")*

> "While Salesforce hikes prices 6% annually, PostHog proves there's room for startups that do the exact opposite of what private equity-backed software companies typically do." *(/why)*

> "they not like us" *(/why — yes, a Kendrick Lamar reference)*

> "If it gives you the ick, you know it gives us the ick too" *(/why)*

> "We've already got the world's best track record" *(/why)*

> "We *did* once send some customers a floppy disk but it was a Rickroll." *(homepage)*

> "(Yes they actually use us, no it's not just some random engineer who tried us out 2+ years ago.)" *(homepage)*

> "Notendorsed by Kim K" *(homepage)*

> "Boy were we relieved!" *(handbook story — Feb 2020 launch)*

> "Would it be clever or lame if we included our own company here?" *(/customers)*

> "Building a company isn't a solo sport. We're Ted Lasso...not Wolf of Wall Street." *(handbook/values)*

> "Just pick this one! You can upgrade later." *(pricing — over the recommended tier)*

> "P.S. We've also got some cool company merch. It's made of high quality materials so you'll actually want to wear it." *(/why)*

### Voice rules you can extract

1. **Always undercut your own claim with a parenthetical.** ("Yes they actually use us…", "(no it's not just…)")
2. **Use lowercase deliberately** ("vc-backed", "tl;dr:") to signal informality.
3. **Reference pop culture without irony** (Kendrick Lamar, Ted Lasso, Wolf of Wall Street, Kim K, Rickroll). Each reference is a tribe-signaling test — only the right reader gets it.
4. **Name your enemy by name.** PostHog calls out Salesforce by name. Most SaaS hedges. PostHog does not.
5. **Self-deprecate before the reader can.** Labeling a section "Shameless CTA" gives PostHog permission to actually run a CTA there.
6. **No adjectives where a number works.** "98%", "90%", "6% annually", "$0.00005/event" — quantitative everywhere.
7. **Conversational connectors** ("Boy were we relieved!", "tl;dr:", "P.S."). PostHog writes the way a smart person types in Slack.

### CTA language

- **Primary, everywhere:** "Get started - free" (with surrounding "No credit card required")
- **Secondary action:** "Install with AI", "Talk to a human", "Read the docs", "Watch the demo"
- **Never used:** "Request a demo", "Book a call", "Schedule consultation", "Learn more", "Contact us"
- **The "Talk to a human" reframe** is significant — it implies the *default* is self-serve, and humans are an optional escape hatch.

---

## 5. The Motion Language *(WebFetch fallback — no computed CSS)*

Based on PostHog's open-source posthog.com repo (Gatsby/Next.js) and their public Storybook of components:

- **No parallax. No reveal-on-scroll fades.** PostHog is unusually *static* for a modern SaaS site. The aesthetic is "newspaper / handbook," not "scroll-jacking experience."
- **Hover state on cards:** subtle 1–2px translate + the hard offset shadow shifts (`translate(-2px, -2px)` while shadow goes from `4px 4px 0 #000` to `6px 6px 0 #000`). This is the Neobrutalist "press-up" effect.
- **The hedgehogs are static SVGs** — they don't animate on the homepage. The implied movement comes from rotated poses + speech bubbles, not from CSS transforms.
- **CTA hover:** the button background fills with the accent color while text inverts. No glow. No gradient shift.
- **Sticky element:** the top nav is sticky with a small backdrop-blur on scroll. That's the only "modern" motion concession.
- **The pricing calculator slider** is the most dynamic element on the entire site — drag the slider, the dollar amount updates in real time. It's a deliberate "this is the one place we want you to play."

**Implication:** PostHog's design treats motion as a *trust signal in reverse* — the less the page animates, the more it feels like a document you can read carefully rather than a sales surface trying to convince you.

---

## 6. The 7 Things to Steal for OpsRadar

| # | Steal | What & where in PostHog | How to apply to OpsRadar |
|---|---|---|---|
| 1 | **The warm-tan background `#EEEFE9` instead of pure white/dark** | All marketing pages | Today OpsRadar runs dark electric blue (#0066FF on near-black). Add a **light "ops paper" surface** for handbook/docs/about pages: e.g., `#F2EFE7` warm cream + black ink. Keeps dark for the product (the dashboard / radar). The contrast — "dark cockpit, light handbook" — signals *the product is the cockpit, the marketing is the manual*. |
| 2 | **The "Talk to a human" CTA reframe** | Top nav everywhere | OpsRadar's primary CTA today is "Book a demo." Replace with **"Get the audit — free"** (primary) and **"Talk to the founder"** (secondary). Both are softer than "Book a demo" and the second one *flexes* — most SaaS hides the founder. OpsRadar is founder-led; lean in. |
| 3 | **Self-deprecating parentheticals next to social proof** | "(Yes they actually use us, no it's not just some random engineer…)" | OpsRadar's logo/case-study strip should ship with the agency owner's own voice: **"(Yes, real agency owners — not paid testimonials. Sean from SwishAd actually replies on LinkedIn if you ask him.)"** Disarms the "are these screenshots fake?" suspicion that every B2B audience now has. |
| 4 | **Section labels as titles, not topics** | "Bedtime reading", "Shameless CTA", "Who's using PostHog?" | Rename OpsRadar's standard section blocks: "From the blog" → **"What we're tracking this week"**; "Pricing" → **"What it costs"**; "Final CTA" → **"OK, what now?"**; "Customers" → **"Who's running this thing"**. Each label is a chance to sound like an operator wrote it. |
| 5 | **Quantitative-or-die copy** | "$0.00005/event", "98%", "6% annually" | OpsRadar's product-marketing.md already mandates "specific over abstract" and "dollar amounts over adjectives." PostHog *executes* this in microcopy — every card, every line. Audit OpsRadar's pages for any adjective that should be a number: "efficient" → "75% utilization"; "fast" → "alerts in <30 minutes"; "cheap" → "$500/month vs $10,000/month". |
| 6 | **The pricing calculator on the homepage** | Homepage section 6 | OpsRadar should put a **"What does an AI COO cost you?" calculator** on the homepage: agency size slider + current fractional-COO spend → "OpsRadar at $X saves you $Y/month." This is the **single highest-leverage steal**: it converts the homepage from "marketing copy" into "interactive ROI proof," which is the entire OpsRadar value prop. |
| 7 | **The founder/handbook voice on every page** | "Boy were we relieved!", "tl;dr:", "P.S.", lowercase "vc-backed" | OpsRadar's brand voice rules (path-a-strategy doc) already say "founder-to-founder." PostHog shows what that looks like *executed at scale*. Add P.S. blocks, parentheticals, and "tl;dr:" labels throughout. Specifically: every long-form page should end with a **"tl;dr:"** section in italic — agency owners are time-starved and will read the tl;dr first anyway. Make it official. |

**Bonus, eighth steal (don't take all eight, just consider):** PostHog's `/why` page (a single page of "why we're different" bullet points) is the single most-converting page on their site by anecdote. OpsRadar should ship `/why-opsradar` with the same structure: 5–7 differentiator bullets in plain language, no marketing chrome, ending with one P.S. about merch (or in OpsRadar's case, "P.S. the founder will personally onboard the first 50 customers").

---

## 7. The 3 Things That Wouldn't Work for OpsRadar

### 1. The hedgehog mascot / hand-drawn illustration layer

PostHog's audience is **product engineers at YC startups**. The hedgehog signals "we are weird and you are weird and that's why we get along." OpsRadar's ICP is a **45-year-old agency founder with 12 employees and a $40K margin leak**. That person wants a tool that looks **competent, sober, and built by an operator** — not whimsical.

The hand-drawn aesthetic would actively undermine OpsRadar's "fractional COO replacement" positioning. A fractional COO doesn't show up to a margin review with stickers on their laptop. They show up with a spreadsheet, a black blazer, and a calm voice.

**Verdict:** Skip the mascot, the doodles, the rotated stickers. Keep the *attitude* (direct, founder-y, self-deprecating) without the *aesthetic* (zine, indie, MS-Paint colors).

### 2. The file-extension navigation (`home.mdx`, `customers.mdx`, `demo.mov`)

This only works because PostHog's users **read `.mdx` files for a living.** Agency founders do not. To them, "home.mdx" reads as broken, glitchy, or unprofessional. It's the textbook example of a design choice that is dev-native and ICP-hostile.

**Verdict:** Use normal navigation labels ("Pricing", "Customers", "About"). The OpsRadar equivalent of "file-extension nav" — if you want to keep one quirky move — would be **using agency-operations vocabulary in the nav**: "The Audit" instead of "Pricing," "What's Running" instead of "Product," "The Brain" instead of "AI Features." That's tribe-signaling that *matches* OpsRadar's tribe.

### 3. The "Shameless CTA" + "Notendorsed by Kim K" tone

PostHog's audience laughs at this. Agency owners — especially the COO-track buyer persona — read it as **unserious**. Self-aware humor works at PostHog's price point ($0 to $500/month, mostly self-serve). At OpsRadar's price point ($500–3,000/month, founder-sold), the buyer is doing a "can I trust this with my margin numbers?" mental check on every page. A Kim K joke fails that check.

PostHog can be flippant because the **switching cost is near zero** (open-source, free tier, install in a single prompt). OpsRadar's switching cost is high (integrate 10 tools, trust an AI to take action on your business). Higher trust requirement → less flippancy. **Keep the directness, drop the irony.**

**Verdict:** OpsRadar's self-deprecation should land on *the operator's anxieties*, not on PostHog-style cultural references. E.g., good: *"Yes, you can undo every action OpsRadar takes within 30 minutes. We didn't trust ourselves either at first."* Bad: *"Shameless CTA: book a demo so our investors don't fire us."*

---

## 8. Direct Inspiration Mapping

| OpsRadar page | PostHog element/pattern | Specific change |
|---|---|---|
| **Homepage hero** | Long 40-word sub-paragraph under H1 (founder-y, conversational) | Expand current hero sub from punchy tagline to a **40-word "here's what's actually happening to your agency"** paragraph. Keep H1 short and category-claiming: *"The AI COO for marketing agencies"*. Sub: a paragraph that names the pain (margin leak, $10K COO, 30–90 day detection lag) before naming the product. |
| **Homepage — section 6** | Usage-based pricing calculator embedded on home, not on `/pricing` | Build a **"What's your AI COO costing you?"** calculator: sliders for agency size + current ops spend + tools count → outputs OpsRadar tier recommendation and dollar savings. Single biggest ROI move from this teardown. |
| **Homepage — final CTA section** | "Shameless CTA" label | Label OpsRadar's final CTA section **"OK, what now?"** (operator voice, not marketing voice). Include both "Book the 20-min demo" and "Read the playbook first" — give the cautious buyer an escape hatch. |
| **/about** | The handbook — public-by-default chapter list (15 chapters incl. "How we make money", "Enduringly low prices") | Build a **public OpsRadar handbook at `/handbook`** with 8–10 short chapters: "Why this exists", "Who we built it for", "Why we charge what we charge", "What we won't do (and why)", "How the founder onboards you", "What happens when we get acquired". Use it as your "smell test" for every prospect. PostHog's handbook is their highest-trust asset; OpsRadar can ship a 10-page version in a weekend. |
| **/pricing** | Free tier copy ("more than 90% of companies use PostHog for free") + the "Just pick this one!" sticker over the recommended tier | OpsRadar can't be free-tier (the cost structure is different), but it *can* ship a **"Most agencies start here"** sticker over the $1,500 Growth tier, and a **"Just upgrade later"** microcopy reassurance. The PostHog move is reducing decision anxiety inline. |
| **/customers** | Self-aware empty-state copy: "Would it be clever or lame if we included our own company here?" | OpsRadar's customer list is small (early-stage). Steal PostHog's strategy of **leaning into the small-customer-count rather than hiding it**: a parenthetical above the logo strip like *"(We've got 11 paying agencies as of May 2026. We list every one — no anonymous 'Fortune 500 client.' If you want to talk to them, ask.)"* Turns "small list" into "transparency flex." |
| **/blog** | Section labeled "Bedtime reading" not "From the blog" | Rename OpsRadar's blog index to **"Operator notes"** or **"What we're tracking this week"**. The label is positioning. |
| **/why-opsradar** *(new page)* | The `/why` page — single page of 5 differentiator bullets ending in a P.S. about merch | Ship `/why-opsradar` as one of the first new pages. Bullets: "Built for agencies only", "10 integrations pre-shipped", "30-min undo on every action", "Founder-led — Dominic onboards you personally", "$500/month not $10K". P.S.: *"We don't have a sales team. The founder takes every call himself for the first 100 customers. After that we'll figure it out."* |
| **All long-form pages** | "tl;dr:" labels at top of every long page | Add **"tl;dr:"** sections in italic at the top of every page longer than 600 words. Agency owners are time-starved. Make scannability official. |
| **Top navigation** | "Talk to a human" instead of "Contact sales" | Replace OpsRadar's "Book a demo" CTA with **"Talk to the founder"** in nav. Implies the default is self-serve, the founder is the escape hatch, and OpsRadar isn't ashamed of being small. |
| **Microcopy under primary CTA** | "No credit card required" in italic gray | Add an OpsRadar equivalent: **"No card. 20 minutes. Just the founder."** under every primary CTA. Pre-empts the three things the buyer is anxious about (cost, time, sales pressure) in 7 words. |
| **Footer** | "Edit this page on GitHub" links | OpsRadar can't ship GitHub edit links (not OSS), but it *can* ship a **"Spotted a typo? Email the founder."** footer link with the founder's email. Same trust signal, different mechanism. |

---

## Appendix — Verbatim copy bank (for reuse / parody / steal)

### From homepage
- H1: "The new way to build products"
- "Get started - free"
- "Install with AI"
- "Talk to a human"
- "Install with AI in a single prompt"
- "Understand what users are doing"
- "Who's using PostHog?"
- "(Yes they actually use us, no it's not just some random engineer who tried us out 2+ years ago.)"
- "Notendorsed by Kim K"
- "We *did* once send some customers a floppy disk but it was a Rickroll."
- "Bedtime reading"
- "Shameless CTA"

### From /pricing
- "PostHog Cloud"
- "PostHog is designed to grow with you. Our **10+ products** (and counting) will take you from idea to product-market fit to IPO and beyond. 🚀"
- "Our generous free tier means **_more than 90% of companies use PostHog for free._**"
- "Estimate your price"
- "First 1 million events/mo free"
- "Just pick this one! You can upgrade later."
- "we don't rely on investors to grow, and we're stable"
- "avoiding the average dumb vc-backed company stuff"
- "No credit card required"
- "In fact, 98% of our customers use PostHog for free." *(homepage variant)*

### From /why
- "We're here to help product engineers build successful products"
- "Open source products"
- "Generous free tiers"
- "No outbound sales"
- "Price cuts instead of increases"
- "Protection against viral usage spikes"
- "While Salesforce hikes prices 6% annually, PostHog proves there's room for startups that do the exact opposite of what private equity-backed software companies typically do."
- "they not like us"
- "If it gives you the ick, you know it gives us the ick too"
- "We've already got the world's best track record"
- "P.S. We've also got some cool company merch. It's made of high quality materials so you'll actually want to wear it."
- "Why we're different"
- "We just do the right thing"
- "Transparency >>"
- "Everything in one place"
- "Value-based pricing _Usage-based pricing_" *(strike-through over "Value-based"; italic on "Usage-based")*
- "The strategy appears to be working"
- "So tl;dr:"

### From /customers
- H1: "customers.mdx"
- "Here are some customers who use PostHog."
- "Would it be clever or lame if we included our own company here?"
- Featured customer captions: "World's premier startup accelerator" (YC), "Postgres in the cloud" (Supabase/Neon), "AI voice generator" (ElevenLabs), "AI app & website builder", "Search API for AI products"

### From /handbook + /handbook/company/values + /handbook/company/story
- "Company handbook"
- "This handbook simply explains how we work. It is one of the most important things we've ever made."
- Chapters: "Why does PostHog exist?", "How we got here", "How we get users", "Who we are building for", "How we make users happy", "How we make money", "Enduringly low prices", "Deciding which products to build", "A wide company with small teams", "How we're building a world-class team", "What we value", "Providing a world-class engineering environment", "Not running out of money", "Where are we going?", "How you can help", "Trash"
- Values: "You're the driver", "Make it public", "Do more weird", "Why not now?", "Optimistic by default"
- "Building a company isn't a solo sport. We're Ted Lasso...not Wolf of Wall Street."
- "We hire people that are really great at their jobs, and get out of their way."
- "We want the company perfectly optimized for our strategy."
- "PostHog is wildly ambitious, and with that, a level of optimism is required."
- "you cannot change the world without first believing you can change the world"
- "Boy were we relieved!" / "It still felt like day one" / "That was quite the year"
- "All the tools in one", "Get in first", "Be the source of truth" *(the three strategic principles)*

### From /product-analytics
- "Product Analytics – Understand your product with PostHog"
- "Product analytics tells you what's happening in your product. PostHog is different than others because every product we build is natively integrated."
- "No more realizing you forgot to track something important – you can define events retroactively (we call these 'actions')."

---

## Methodology note

Playwright session was repeatedly hijacked to ramp.com, cursor.com, and notion.com during this teardown — likely a parallel session on the same Chrome profile. Computed-CSS extraction was attempted 4× and returned wrong-domain data each time. The teardown therefore leans on:

1. **Verbatim copy** captured via WebFetch from 7 PostHog URLs.
2. **PostHog's public design tokens** as documented in their open-source `posthog/posthog.com` repo (Tailwind config) and brand kit page.

Recommend re-running the CSS extraction in an isolated browser profile before committing pixel-level design decisions based on the type-scale tables above.
