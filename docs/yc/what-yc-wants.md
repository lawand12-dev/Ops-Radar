# What YC Wants — And How OpsRadar Scores

*Compiled 2026-05-22. Updated 2026-05-27 with the deep-dive + X findings. Research synthesis on what YC partners actually look for in applications + interviews, with OpsRadar scored against each criterion and question-by-question draft answers for the application form. $2M OpenAI tokens grant for accepted batch companies.*

> **Updated 2026-05-27.** This doc is the strategy layer; the mechanics (verbatim form fields, the 10-min interview run-of-show, partner quotes, funded comps, honest odds, the visa path) now live in [`../research/2026-05-27-yc-deep-dive-application.md`](../research/2026-05-27-yc-deep-dive-application.md) — read that alongside this. Two corrections folded in below: (a) the funnel numbers (the "0.5%" was directionally right but S25 was 0.6% / S26 est. ~3-4%); (b) all "n8n / audit funnel" references are now stale (n8n severed in CP-15, audit funnel retired in CP-16) — corrected inline.

---

## The shape of the YC funnel (2026 data, updated)

- **30,000+ applications**; **~140–200 accepted** since the move to 4 batches/year. S25 ran a reported **0.6% rate (lowest in YC history)**; S26 estimates land ~3-4% — but treat your real odds as **dominated by the written-application filter**, not the headline rate. ([wearefounders acceptance rate 2026](https://www.wearefounders.uk/y-combinator-acceptance-rate-2026/))
- 10-minute Zoom interviews with 2-3 partners (no presentations allowed). @safishamsii (S26 accept, May 2026) reports **two** interviews — be ready for a follow-up round.
- **Batch is in-person in San Francisco** (3-day retreat + weekly meetups) — relocation for ~3 months is mandatory per [YC FAQ](https://www.ycombinator.com/faq). For the Iraqi-passport visa path (no ESTA → B-1 via third-country post → O-1A after), see the deep-dive §5.2.

> *"The overall acceptance rate is dominated by the written application filter, and your personal odds depend almost entirely on the quality of your application and whether you have something to show."* — [WeAreFounders.uk on YC acceptance rate](https://www.wearefounders.uk/y-combinator-acceptance-rate-2026/)

The written application IS the test. Most rejections happen there, before any human partner even reads carefully. The interview is just the disambiguation step for borderline candidates.

---

# What YC partners actually look for (the 5 signals)

## Signal 1 — First-principles thinking + a real "discovery"

> *"YC partners look for candidates who are 'first principles thinkers' — people who not only believe what no one believes yet, but figure out what the necessary things are to build to create something no one else saw. Founders that Garry Tan chose to fund came with 'some new discovery that they had discovered interacting with the technology itself.'"* — [The Founders Corner on YC rejections](https://www.the-founders-corner.com/p/why-39800-yc-applications-get-rejected)

**OpsRadar's "discovery":**
- The Federal Reserve FEDS Notes April 2026 paper showed 8.8% of small businesses have AI in production vs 68% who "use AI." That **60 percentage point gap** is the OpsRadar wedge — *agencies want a CAIO but can't afford one*. You discovered this by trying to be that CAIO yourself for marketing agencies before realizing software could replace 80% of the function.
- The 21.5% of agencies losing money (Planable 2026) up from 13% — *the AI productivity transition is creating losers, not just winners.*

These are the kinds of insights that show first-principles thinking. **Lead with them.**

## Signal 2 — Founder-market fit

> *"YC wants to know that you didn't pick this idea from a 'hot startup ideas' list. The best answers reveal personal experience with the problem, domain expertise that gives you an unfair advantage, or a discovery that came from working in the industry."*

**OpsRadar's founder-market fit angles:**
- You've been running operations for service businesses (Lawand's 3 years as Sales & Inventory Manager — see `founder-profile.md`)
- You know the service-business tool stack (HubSpot/ClickUp/Harvest/Stripe) and the ops failure modes intimately
- You're building the product *you needed*, not chasing a market
- You picked the services vertical because that's where you live, not because it was on YC's RFS list (it happens to overlap with RFS #2/#4/#12/#15 — bonus, not driver). And Blomfield/Friedman/Tan have since published the exact thesis (domain knowledge as the moat, vertical > horizontal) — see deep-dive §4.

## Signal 3 — Real numbers, not narrative

> *"Clear, specific answers beat polished ones. For example, '127 paying customers generating $8,400 in MRR, growing 22% month-over-month' is a great answer. Instead of saying 'we have strong early interest,' provide real numbers like '14 paying customers at $1,200/month, NPS of 72.' The number doesn't need to be large — it needs to be real."*

**OpsRadar's traction reality check:**

| Metric | What you have today (be honest) | How to lift it |
|--------|--------------------------------|----------------------------------------|
| Paying customers | Verify count | Convert the Swish demo / 1-3 prospects to a named design partner — the single highest-leverage move (deep-dive §5.3) |
| MRR | Verify (likely $0 — say so, framed) | Be precise: pilot ≠ bookings ≠ revenue (Garry Tan, deep-dive §7.2). Don't inflate |
| Pipeline | 370 tracked prospects, 233 personalized cold emails, 8 replies (`traction-evidence.md`) | Cite as evidence of *motion* |
| Integrations in production | broker (Nango) live; Gmail agent shipped, fleet rebuilding | Demo URL/screenshot of Hire chat |
| Velocity proof | Composio→Nango migration in days after the breach | Lead the velocity answer with this — highest-resolution formidability proof (deep-dive §5.3) |
| Code shipped | recent ship cadence | Show velocity, not just absolute size |

*(Note: the prospect-facing audit funnel was retired in CP-16 — don't cite "audit completions" as a metric anymore.)*

**The rule:** if you don't have customer revenue, lead with usage metrics. If you don't have usage metrics, lead with build velocity. **Never** lead with TAM, addressable market, or "strong interest."

## Signal 4 — Speed compounds

> *"If you really want to improve your chances, work hard and have your startup improve between the time you applied and the time you interview. This may mean you launched, improved your product, increased revenue. Demonstrating you can move fast and make quick progress is the most surefire way to impress your interviewers."*

This is **the most actionable signal**. Between applying (May 25) and interview invitations (~3 weeks later), every shipped feature + every new customer raises your odds.

**OpsRadar's velocity plan (apply → interview window):**
- Rebuild the next 2-3 Nango tool agents on the Hire surface (visible, demoable progress)
- Land ≥1 named design partner (convert the Swish demo / a warm prospect) — the highest-leverage move in the corpus
- Ship the MCP server polish (highest-signal Software 3.0 / "Software for Agents" proof)
- Tighten the Hire chat demo to a clean golden path

**The interview update email** (if invited): "Since we applied, we shipped X, Y, Z and landed [design partner]." This single email — sent the day before interview — is the highest-leverage action on the entire calendar (deep-dive §5.3, move 10).

## Signal 5 — AI-native, not AI-wrapped (2026-specific)

> *"YC is betting heavily on AI-native businesses (where AI is architecturally central, not just a wrapper). 'Tarpit' ideas — AI-wrapped features presented as standalone businesses — are particularly problematic."*

**OpsRadar passes this test:**
- Multi-tenant LLM agent architecture (not just GPT calls)
- Custom-built knowledge layer (KB ingestion, RAG, pattern library)
- MCP-native interfaces (planned)
- AI is the COO function, not an "AI-enhanced dashboard"

**But the application copy needs to make this obvious.** Don't say "we use AI to..." — say "the AI IS the product." The product IS an agent that reasons over your business in real time.

---

# What YC rejects (don't trip these)

## The Tarpit list

YC's term for ideas that look shiny and easy but get crushed:
- AI wrappers over GPT-4 (ChatGPT-for-X)
- "Notion but for X" / "Linear but for Y" copycat ideas
- Marketplace ideas with no liquidity strategy
- Browser extensions / Chrome plugins without distribution
- "We're like Stripe but for Z" infrastructure plays without proof
- B2B SaaS for a captive market (see Razorpay's Monopoly Incentive Gap — `docs/positioning/moats.md` Provocation 2)

**OpsRadar passes the tarpit test** because:
- Not an AI wrapper — full agent + integrations + benchmark data moat
- Not a copycat — there's no funded "AI COO for agencies" today
- Has a clear distribution wedge (fractional COO partners)
- Targets a competitive market (digital agencies fighting for clients) — not a captive one

## Common rejection patterns

| Mistake | OpsRadar's risk | Fix |
|---------|------------------|-----|
| Vague claims ("strong interest") | Medium — easy to slip into | Use specific numbers in every answer |
| No traction signal | Resolved — 250 cold outreach + Reddit engagement + inbound partnership offer (see `traction-evidence.md`) | Cite specific numbers + the partnership-offer Reddit quote verbatim in Q5 |
| Solo founder no demonstrated execution | N/A — 2-cofounder team (Lawand CEO + Atta CTO, both Halabja Iraq, 60/40 split). See `founder-profile.md` for the full team breakdown | N/A |
| Reapplying with same pitch as last batch | N/A — first-time apply | Skip |
| Failed to address "Why now? Why you?" | Medium | Frame around the 60pp gap (Signal 1) + Iraq angle + 6-12 month YC window |

## The "Why now? Why you? Why this?" framing

Every application has to answer these three implicitly. Drafts:

**Why now?**
> Agencies have 12-18 months before the AI productivity transition crushes the ones still operating manually. The 21.5% losing money in 2026 (up from 13% in 2025) is the leading indicator. YC RFS #15 (AI OS), #4 (Company Brain), #12 (Software for Agents) all opened in 2026 — the category is officially open and not yet owned. The $2M OpenAI tokens grant makes inference cost zero during the batch — the unit economics work better today than they will after the batch.

**Why you?**
> [Founder bio — replace with the specific facts]. You've spent years inside service-business operations and know the Stripe + HubSpot + ClickUp + Harvest stack and its failure modes at a level no consultant does. You ship at YC-tier velocity — when your integration broker was breached, you ripped it out and migrated the whole stack to Nango in days with zero downtime. You operate from Iraq — constrained banking (Mercury prohibited), constrained Stripe access — and have shipped a global SaaS anyway. That's the founder filter YC tests for.

**Why this?**
> The category is unowned. 27+ competitors mapped (`docs/competitive/competitor-teardowns.md`); none position as AI COO. Productive/Scoro/Kantata are PSA tools; they record what happened. ClickUp Super Agents (launched May 2026) is horizontal — no agency financial layer. The closest analogues — Toast (restaurants), ServiceTitan (home services), GoHighLevel (white-label marketing) — proved vertical SaaS at scale ($82.7M ARR bootstrapped for GoHighLevel). The window is 3 years per the YC RFS framing; it's mid-cycle.

---

# The application form — question by question

The actual S26 application has ~25 questions. The five that drive the decision:

## Q1 — "Describe what your company does in one or two sentences."

**Bad:** "OpsRadar is an AI-powered operations platform that helps service businesses manage their business better."

**Good (drop-in):**
> OpsRadar is the AI COO for service businesses that bill for client time — we wedge in through marketing agencies first. It connects HubSpot, ClickUp, Harvest, and Stripe, watches every client's margin, scope, and cash flow in real time, and tells the founder what to do before it costs them — replacing a $10K/month fractional COO at $750–$3,000/month.

(35 words. Specific tools. Specific outcome. Specific pricing anchor.)

## Q2 — "What is your company going to make?" (3-paragraph max)

**Drop-in:**

> OpsRadar is the operating brain for service businesses that bill for client time — agencies, dev shops, recruiting firms, consultancies, accounting firms. We sell narrow (marketing agencies are the first beachhead) and build broad. It connects to the integration stack every one of them already pays for — HubSpot or Pipedrive for sales, ClickUp or Asana for projects, Harvest or Toggl for time, Stripe for payments — and live-fetches everything every page load. No customer business data persists in our database; the AI agent reads the live state of the business every time it's invoked.
>
> The agent runs three loops continuously. (1) It detects margin alerts: a client whose actual hours have outrun their retainer budget, and proposes a one-click invoice for the overage. (2) It watches utilization and scope: surfaces team capacity drift before the agency over-commits to a new deal. (3) It produces a daily AI briefing for the founder: "Today, Client B is your single biggest profit leak; here are three actions you can take."
>
> By 2027, OpsRadar is also an MCP server - any external agent (Claude Desktop, ChatGPT, an internal agency or service-business agent) can query OpsRadar as the source of truth on operations. We're the company brain for service businesses that bill for client time, with agencies first.

(279 words. Specific integrations. Specific behaviors. Forward-looking but grounded.)

## Q3 — "Why did you pick this idea? Do you have domain expertise?"

This is where founder-market fit lives. Lead with the personal story. **Replace this with your actual story** — examples of strong patterns:
- "I spent 2 years running operations for a [X-person] agency where we lost $Y on Client Z because nobody saw the scope creep until quarter-end..."
- "I built automation for 11 agencies as a freelancer in 2024-25 and discovered every one of them had the same blind spots: margin, capacity, cash flow..."
- "I tried to be a fractional COO for [X] agencies and realized the function was 80% pattern recognition over the same 4 data sources..."

The discovery must come from doing the work, not reading about it.

## Q4 — "Tell us something impressive that each founder has built or achieved."

> *"YC considers this the most important question on the application."*

**The Q4 form is per-founder — each cofounder writes their own one-or-two sentence answer.** Final drafts for both Lawand and Atta are in [`founder-profile.md`](./founder-profile.md) Part 8. Short version below; use the doc's versions for the actual submission:

**Lawand:** Self-taught English, business, AI tools, web building, and automation from Kurdistan with no ecosystem or formal training, while spending 3 years (age 15–18) as Sales & Inventory Manager at one of Halabja's largest wholesale + retail stores — learning firsthand how operations break under volume, the insight that shaped OpsRadar.

**Atta:** Has been independently building, deploying, and monetising software products since age 14 — Telegram bots, browser extensions, backend infrastructure for paying clients, Kurdish subtitle translator browser extension + mobile app — and is currently top of his class in Information Technology at Halabja Technical Institute.

(Adapt to be true. The Iraq constraint is a feature here — it shows resourcefulness.)

## Q5 — "What's your traction? Numbers."

The format that wins:
- N prospects in pipeline (370) + N personalized cold emails (233) + N replies (8) — evidence of motion
- N integration connections by users / Hire-chat sessions
- N customers/pilots — and the named design partner if you've landed one
- $X MRR (even $0 is fine if you explain — and be *precise*: pilot ≠ bookings ≠ revenue, per Garry Tan)
- The breach→Nango migration as the velocity proof

**Brutal truth:** if you have 0 traction, this is your weakest answer. The fix this week:
1. Onboard 3 agencies as free pilots (offer 60-day Pro free in exchange for weekly feedback)
2. Cite them in the answer as "3 engaged design partners across paid media, SEO, and social verticals"

## Q6 — "Who are your competitors? Who's the closest? Why are you better?"

> *"When asked about competitors, don't write generic statements; name them specifically and explain exactly how you're different, as specificity signals real market knowledge."*

**Drop-in (already in `docs/competitive/competitor-teardowns.md`):**

> Direct competitors: Productive.io ($11/seat, $480/mo for 15 seats), Scoro ($23.90 Core), Kantata (enterprise), Accelo (after Forecast acquisition), and Float ($7.50 Starter). All are PSA tools — they record what happened. None of them carry the financial layer (Stripe + Harvest margin computation) that we built first, and none have a true agent loop with HITL gates.
>
> Closest by ambition: ClickUp Super Agents (launched May 2026). They have 100+ integrations and a $9/seat AI Brain add-on — but they're horizontal and have no agency benchmark data, no per-client profitability surface, and no vertical pattern library.
>
> What we have they don't: anonymized per-client margins across N agencies (data moat compounding from customer #50 onward), MCP-native architecture (78% enterprise adoption per April 2026 data), and a vertical agent loop tuned on service-business tool definitions.
>
> Company-brain comps: BOND (X25) is the closest horizontal "AI Chief of Staff" — it went broad (all execs), leaving the vertical-services wedge open. Memory Store (YC, launched May 2026) is a horizontal shared-knowledge wiki — we're the *vertical, agent-acting, approval-gated* version where the brain is a byproduct of agents doing real ops work, not a wiki you maintain. Token-custody is also now a buying criterion post-breach (see deep-dive §7.3): our broker holds OAuth off our servers behind short-lived session tokens.

## Q7 — "How will you make money?"

> Three pricing tiers shipped at opsradar.com/pricing today: Starter $750/mo (3 integrations), Growth $1,500/mo (all 10 + COO chat), Pro $3,000/mo (+ agentic actions, custom alerts). Fractional Operator tier at $1,200 + $300/agency/mo for fractional COOs managing multiple agencies. Van Westendorp validated; the Indifference Point for Growth lands at $1,475 — within $25 of the sticker. By year 2, we expect to add usage-based agentic-action overages (+6pp NRR per OpenView 2025 benchmark) and an embedded fintech layer (invoice acceleration, agency financing — the Toast playbook).

## Q8 — "What's your biggest risk?"

Don't dodge this. Don't say "execution" — every startup says that. Pick the real one.

**Draft:**
> The single biggest risk is distribution velocity. The category is unowned, but it won't stay unowned forever. ClickUp and Kantata both shipped AI agents in the last 6 months and have orders-of-magnitude more distribution than we do today. Our window is 12-18 months to land 100+ agencies on the platform and turn the per-agency benchmark data into a moat competitors can't replicate. Mitigation: the fractional COO partner channel (one fractional = 3-5 agencies) and the Fractionals United community (13K members) as a distribution wedge. Secondary risk: the founder's location (Iraq) creates banking friction we've already navigated (Wise + Wyoming LLC) but it introduces fundraising-call latency the YC batch in SF solves directly.

---

# The 10-minute interview — what to expect

## Format

- 10 minutes over Zoom
- 2-3 partners, all of you in the room
- They ask, you answer — partners may interrupt
- NO presentation. NO slides. NO mock-prep walk-through.
- > *"You'll be asked rapid-fire questions about your product, your market, your traction, and your team. Partners may interrupt you, not because they're rude, but because they want to cover a lot of ground quickly."* — [4dayweek.io on YC interviews](https://4dayweek.io/interview-process/y-combinator)

## The 6 question pattern (every YC interview asks variants)

1. **What does your company do?** — 20 seconds, no jargon
2. **Who is your user?** — be specific. Not "agencies" — "20-FTE digital agencies in the US/Canada with $1-3M ARR running 4+ retainers"
3. **How do you make money?** — pricing model in one sentence
4. **What's your traction?** — numbers, not narrative
5. **What's the biggest risk?** — honest
6. **Why are you the right team?** — founder-market fit story

## Numbers to have memorized cold

- MRR (current)
- WoW growth rate
- CAC (or "we haven't paid for acquisition yet")
- LTV (or estimate based on retention assumption)
- Number of users (paying + free)
- Weekly active users
- Top 1-2 pilot agency names (with permission) + their specific feedback
- The single biggest customer-validated insight you have

## What NOT to do

- Don't read from notes
- Don't pitch — they cut pitches off mid-sentence
- Don't say "we're like X but for Y" (tarpit signal)
- Don't say "the market is $X billion" (TAM is irrelevant in a 10-min interview)
- Don't over-explain the product — they'll ask
- Don't try to address objections they didn't raise

## What TO do

- Sit straight, look at the camera (not the screen)
- Have your laptop's audio mic working perfectly (test before)
- Have a backup interview link (a phone hotspot) ready
- Have your live product URL open in another tab — partners may ask you to walk through it on screen-share
- Be willing to disagree with a partner — they're testing for conviction
- If you don't know an answer, say so. Don't BS.

---

# OpsRadar's scorecard against the 5 signals

| Signal | OpsRadar score (1-10) | Notes |
|--------|----------------------|-------|
| First-principles + discovery | **8/10** | 60pp gap insight + Planable 21.5% number is strong; needs sharper founder story attached |
| Founder-market fit | **7/10** | Strong if you tell the right personal story; risky if you don't anchor it |
| Real numbers / traction | **6/10** | 250 cold emails sent + 3 active Reddit threads with operators + 1 inbound partnership offer (Creative-Letter-4902) + active conversation thread with Gullible-Storm9278 + Lawand's existing audience (Twitter @LawandOps, GitHub, opsradar.co). Documented in `traction-evidence.md`. Lift to 8/10 = convert the partnership offer + one Reddit conversation into design partners this week |
| Speed (between apply and interview) | **9/10** | High — you've shipped 6 fixes + 30+ docs + 4-doc theory stack in 7 days |
| AI-native architecture | **9/10** | Multi-tenant agent loop + KB + MCP-planned + Software 3.0 thesis explicit |

**Weighted average: 7.4/10** — application gets read carefully, not auto-rejected.

**The single highest-leverage fix:** raise the traction score by converting the Swish demo (or one warm prospect) into a *named, quotable design partner* — the substitute for the "$10K MRR" rule for a pre-revenue team (deep-dive §5.3).

---

# Action plan (now → interview)

> The S26 on-time deadline was ~2026-05-26 with a rolling tail (an S26 acceptee applied May 4 and interviewed late May). **First: verify the live `apply.ycombinator.com` form status.** If submitted, this becomes the velocity-window plan; if the tail is still open, submit immediately, then run the same plan.

| When | Action |
|-----|--------|
| **Immediately** | (a) Verify the live application status/deadline. (b) If unsubmitted, draft the answers above using the real story for Q3 + Q4 and submit early-in-day PT. (c) Have one human read the full application and flag every buzzword (Dalton: marketing-speak = fastest rejection — deep-dive §6). |
| **This week** | Convert the Swish demo / a warm prospect into a named design partner with a usable quote — the highest-leverage move in the corpus. |
| **Velocity window (apply → interview)** | Ship 2-3 visible things (next Nango tool agents on Hire, MCP polish). YC weights the apply→interview delta heavily. |
| **Day before interview** | Send the "Since we applied, here's what changed" email — the single highest-leverage calendar action. |

---

# What to do in the velocity window (apply → interview)

YC values the velocity between application and interview more than the application itself.

| Window | Ship |
|------|------|
| Week 1 | Rebuild the next 2-3 Nango tool agents on the Hire surface — visible, demoable progress |
| Week 2 | Land the named design partner (or 2-3 actively-using free pilots) |
| On invite | Prep with the 10-min run-of-show (deep-dive §2) + the 6-question pattern below. Expect possibly **two** interviews |
| Day before interview | Send the brief "since we applied, here's what changed" email |

---

# Sources

- [YC Interview Guide (official)](https://www.ycombinator.com/interviews)
- [How to Apply to YC (official)](https://www.ycombinator.com/howtoapply)
- [Garry Tan's 3 tips for YC applications](https://blog.garrytan.com/my-three-tips-for-your-y-combinator-application-as-a-former-yc-partner-video)
- [Garry Tan TechCrunch interview on YC acceptance](https://techcrunch.com/2024/05/22/garry-tan-y-combinator-accelerator-insights/)
- [The Founders Corner — Why 39,800 YC applications get rejected](https://www.the-founders-corner.com/p/why-39800-yc-applications-get-rejected)
- [WeAreFounders.uk on YC 2026 acceptance rate data](https://www.wearefounders.uk/y-combinator-acceptance-rate-2026/)
- [4dayweek.io — Top 15 YC Interview Questions 2026](https://4dayweek.io/interview-process/y-combinator)
- [Capwave.ai — Complete Guide to Apply YC 2026](https://capwave.ai/blog/blog-how-to-apply-to-y-combinator)
- [Peak Digital Studio — YC Application Questions Template](https://www.peakdigitalstudio.com/articles/yc-application-questions-template)
- [Pilot.com — How to Ace Your YC Interview](https://pilot.com/blog/tips-y-combinator-interview)
- [Xartup — Tarpit ideas YC rejects](https://xartup.substack.com/p/bad-startup-ideas-that-look-good)
- Internal: [`research-addendum.md`](./research-addendum.md) · [`../research/2026-05-27-yc-deep-dive-application.md`](../research/2026-05-27-yc-deep-dive-application.md) (the mechanics companion) · [`../positioning/moats.md`](../positioning/moats.md) · [`../positioning/path-a-strategy.md`](../positioning/path-a-strategy.md) · [`../positioning/identity.md`](../positioning/identity.md) · [`../fundraising/vc-guide.md`](../fundraising/vc-guide.md)

---

*Updated 2026-05-22. The single most important read for the next 72 hours.*
