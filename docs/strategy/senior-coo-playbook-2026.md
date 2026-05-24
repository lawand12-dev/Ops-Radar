# Senior fractional COO operating playbook — agencies + services businesses

> Source-of-truth research for rewriting the 10 OpsRadar domain agents. May 2026.
>
> **Important framing**: OpsRadar serves **all agency-type and services businesses** — design agencies, dev shops, marketing agencies, recruiting agencies, consulting firms, accounting/bookkeeping firms, PR firms, content studios, and the broader services market. ~85% of the signals + thresholds below apply universally; vertical-specific bits live in skill packs (`knowledge-base/skills/agency-types/`).

Distilled from Karl Sakas (Sakas & Company / Agency Edge), Marcel Petitpas (Parakeeto), Drew McLellan (Agency Management Institute), Jason Swenk (Agency Mastery 360), Brent Weaver (UGURUS), AgencyAnalytics, Productive.io, Promethean Research, The Wow Company Benchpress, SparkToro State of Digital Agencies 2024/2025, Focus Digital 2026 churn report, HubSpot State of Service 2024, plus Anthropic Multi-Agent Research engineering post for prompt structure.

---

## Cross-cutting principles (every agent prompt encodes these)

1. **Lead with the most fragile number, not the most flattering.** If revenue is up but cash is down, the brief leads with cash.
2. **Name the dollar / day / client at stake.** "Client at risk" is a vibe. "Client at $14K MRR, renewal in 21 days, 3 of 8 churn signals present" is a decision.
3. **Trends over snapshots.** 2-month or 90-day rolling window is the unit of action; single data points are noise.
4. **Every recommendation must include the cited threshold that triggered it.** "Reprice because delivery margin is 17% (target 50–60%)" — not "reprice because margin is low."
5. **Triage tier every output.** Green / amber / red, or gentle / firm / urgent. Forces ranked action.
6. **Conversation scripts as primary output.** Owners don't want a dashboard; they want the exact sentence to say.
7. **Never recommend more than 3 actions per cycle.** If everything is urgent, nothing is.
8. **Distinguish the *type* of problem before recommending a fix.** Scope problem ≠ pricing problem ≠ team problem ≠ client problem.
9. **Cite the operator publication or numeric source where one exists.**
10. **The owner's time is the scarcest resource.** Every recommendation worth their 90 seconds of attention.

---

## 1. REVENUE

### Signals + thresholds

| Signal | Healthy | Caution | Emergency |
|---|---|---|---|
| MoM MRR growth | +5–10% (established 7-fig) / +10–20% (early scale) | 0 to +5% | Negative 2 months running |
| % revenue recurring | ≥70% | 50–70% | <50% (project-based, not retainer) |
| Net Revenue Retention | ≥100% | 90–100% | <90% |
| Cash collected ÷ invoiced (90d) | ≥0.95 | 0.85–0.95 | <0.85 |
| DSO (days sales outstanding) | <45 | 45–60 | >60 |
| % AR past due | <20% | 20–30% | >30% |
| Pipeline coverage (next 90d) | 3–4× target | 2× | <1.5× |
| Cash runway | ≥3 months | 1–3 months | <1 month |
| Single client concentration | <15% of MRR | 15–25% | >25% |

### Decisions

- **MoM MRR flat/down 2 months → name the gap in deals not dollars.** "$X MRR shortfall = N deals at our $K avg × 25% close = need M qualified opps in pipeline."
- **Cash collected / invoiced <0.85 → freeze hiring + new SaaS subs before touching delivery.**
- **Single client >25% of MRR → renewal conversation starts 120d out, not 60.**
- **Week 1 of declining MRR playbook (Sakas + Swenk):**
  1. Forensic: churn vs downsell vs new-sales drought (different fixes)
  2. Call top-3 highest-LTV at-risk clients before anything else
  3. Pause non-billable internal projects
  4. Owner calendar to 50% sales for 2 weeks

### Conversation scripts

- *Cash warning*: "Cash collected is at 81% of invoiced over 90 days. If that doesn't move above 90% in two weeks, we'll need to pause [next hire / SaaS renewal]. Want me to draft a 4-touch collections push for the top-5 overdue?"
- *Pipeline drought*: "Coverage for Q[N] is 1.6× — we typically run 3×. At [X]% close rate, that's a likely $[Y]K shortfall in 60 days. Two options: open one outbound channel this week, or reactivate 10 past clients."

### Benchmarks

- 7-figure agencies retain ~78%, 8-figure ~92% annually (Focus Digital 2026)
- 13% avg net margin across digital agencies in 2025 (down from 14% in 2024); <10 FTE at 19%, 50+ FTE at 8% (Promethean / AgencyAnalytics)
- Recurring-revenue target ≥70% (Vendasta / Sakas)
- DSO <45 days; >20% AR past due = collections problem

### Anti-patterns

- Confusing invoiced revenue with collected revenue in the cockpit
- Counting projects as MRR (hides the real recurring base)
- Reacting to a single bad month — judge by 2-month trend or 90-day rolling

---

## 2. COLLECTIONS

### Signals + thresholds

| Age | Treatment |
|---|---|
| 0–7d overdue | Friendly auto-reminder; no human |
| 8–14d | Personal "checking in" from AM, not finance |
| 15–30d | Owner/AM call; restate consequences |
| 31–60d | Pause new work; written formal demand |
| 61–90d | Stop work entirely; owner involved |
| 90+d | Collections agency / legal / write-off decision |
| >20% AR past due | Systemic problem, not one-off |
| One client >15% of AR | Portfolio risk |

### The 4-touch cadence (Chaser / Invoiced / agency CFO consensus)

1. **Day 1 overdue — friendly, neutral**: "Just flagging invoice #X hit its due date — might've slipped through." Auto-send OK.
2. **Day 7 — clarifying**: "Following up on #X — a week overdue. Any AP hold-up we can help with?" Auto-send OK, signed from AM.
3. **Day 14 — firmer, name consequence**: "#X is 14 days overdue. Per our agreement new work pauses at 30 days. Can you confirm a payment date this week?" **Human, not automated.**
4. **Day 30 — stop-work**: "We're pausing active work until #X clears." Owner-to-owner, voice first then written.

### Triage rules

- **Gentle**: enterprise client with known long AP cycles, no prior issues.
- **Firm**: SMB owner-operator 14+ days late, non-proactive communication.
- **Urgent / stop-work**: overdue twice in 6 months, overdue + asking for new scope, non-responsive >7 days to a direct human message.

### Recovery economics (Commercial Collection Agency Association)

- 90d overdue: 70–80% collectible
- 6mo overdue: 45–55%
- 12mo overdue: 20–30%
- **Rule: if 120 days with no written payment plan → collections agency or write off. Internal effort beyond that point isn't ROI-positive.**

### Conversation scripts

- *To owner (stop-work)*: "[Client] is 32 days overdue on $14K and went dark Thursday. They have a $9K invoice issued yesterday that will also go past due. I recommend pausing tomorrow morning unless we get a payment date by EOD — want me to draft the message?"
- *To client (Day 30 firm)*: "We've sent three reminders on invoice [X]. We've worked together too long for me not to call this out — what's actually going on? If there's a cash issue, we can talk about a payment plan. But we can't continue active work past Friday without movement."

### Anti-patterns

- Automating Day 30+ comms. Final notices must be human.
- Letting one bad client teach you nothing: every >60d overdue → retro into contract changes (deposits, net-15, autopay).
- Treating collections as a finance function. It's a relationship function — the AM has the leverage, not bookkeeping.

---

## 3. SCOPE (creep detection)

### Signals + thresholds

| Signal | Threshold |
|---|---|
| Actual ÷ retainer hours, current month | <100% green; 100–110% watch; >110% intervene |
| Same client over budget 2 months running | Conversation required |
| Out-of-channel requests (Slack/email not in PM tool) | >5/wk = leakage warning |
| Out-of-scope deliverables shipped w/o change order | Zero tolerance |
| Non-billable hours per AM per client per week | >3 hrs sustained = early signal |
| Delivery margin per client vs agency blended | >10pp below blended = creep |

### The 10/30 rule

- **10% over single month** = noise — log, don't act
- **10% over 2 consecutive months** = real creep (Sakas threshold for conversation)
- **30% over in any single month** = emergency (Growth-Rocket / scope-ledger research: teams routinely deliver 30%+ over within 6 months without saying anything)

### Decisions

- <110% one month → absorb; log; mention in monthly review
- >110% two months running → scope conversation this week, not at QBR
- >130% any month OR >115% three months → reprice or descope, do not absorb
- Same client trending up >5pp/month for 3 months → re-contract
- Out-of-scope work delivered free 2+ times/quarter → rebuild the line via change-order workflow

### Conversation scripts (Sakas-style)

- *The 7 magic words*: **"Would you like an estimate for that?"** — used in real time when client adds a mid-thread request.
- *Monthly nudge*: "I noticed we logged 142 hours for you this month against the 100-hour retainer. Two were our error and not billing. The other 40 came from [Campaign X] — how do you want to handle it: bill at $[Y]/hr, count against next month, or roll into a higher retainer tier?"
- *Reprice ask*: "We've delivered 130%+ of your retainer hours for three months running. That's not sustainable for either of us — when something is consistently scoped wrong, the work suffers. Can we walk through what your real monthly need looks like and reset the retainer to match?"
- *Sakas ROC (Reason–Options–Choose) for a rush request*: "Yes that's doable — we could fit it in next week within your retainer, or pull it forward to tomorrow with a 50% rush fee, or hand it to one of your contractors. Which works?"

### When creep → fire-the-client

- Client refuses both reprice AND descope after clear conversation
- Multiple "could you also..." requests per week, none with budget acknowledgment
- AM logging hours we don't bill "because they'll get mad"
- Client <20% delivery margin AND >120% utilization

### Anti-patterns

- "Just absorb it this month" — cumulative cost kills agencies
- Logging only billable hours → creep is invisible
- Having the scope conversation in the QBR (90 days too late) — belongs in monthly account review

---

## 4. DELIVERY (project health)

### Signals + thresholds

| Signal | Threshold |
|---|---|
| Task with no status change | >3 business days = stale; >5 = at risk; >10 = ghost |
| Task overdue with no new due date | >2 days = AM action; >5 = owner visibility |
| Unassigned owner on active task | Any duration = process gap |
| Status "Blocked" with no comment >24h | Immediate intervention |
| % tasks in "In Review" simultaneously | >40% = pipeline jam |
| Task age vs estimated duration | >150% = scope/estimation problem |
| Tasks "In Progress" >30 days | Drop or split — won't finish |
| Project burndown trending up not down | 2 weeks running = will miss deadline |
| Hours logged vs planned | <60% = team doing other work; >120% = burnout/creep |

### Triage tree (push vs add vs descope)

1. Is the deadline externally committed (launch, event)? → descope first, add second, push last.
2. Within 2 weeks of deadline and >20% behind? → adding resources won't help (Brooks's Law). Descope.
3. >4 weeks out and 10–20% behind? → add resources or rebalance.
4. Team already >85% utilization? → contractor in or descope (do NOT burn the team).
5. Client added scope without acknowledgment? → not a delivery problem, it's a scope problem. Re-baseline first.

### Great Monday delivery review (15–25 min, decision meeting not status report)

1. Red/Amber/Green per active project (60s each, AM-led)
2. Reds get airtime; greens skipped. "What changed? What decision do you need from me today?"
3. Capacity tension: who's >85% next week, who's <60%, can we rebalance?
4. One forced client risk per AM (no "everything's fine" weeks)
5. Top 3 owner asks for the week, written

### Conversation scripts

- *Project amber → escalation*: "Project [X] is amber for the third week running. Two reasons: [client] hasn't approved [Y] since [date], and [team member] has been pulled into [other client]'s emergency. I'd like to push the deadline 2 weeks and bill an expedite fee, or descope [Z]. I need a call by Thursday."
- *Stale task*: "This task is 6 days without movement and is on the critical path for the [date] launch — is it stuck on something you need help with?"

### Anti-patterns

- Treating amber/red as descriptive rather than actionable
- Amber for 3 weeks without a forced decision (amber for 3 weeks = red)
- Adding people to a late project as the default move
- Updating PM-tool statuses on behalf of the doer (kills signal fidelity)

---

## 5. BRIEFING (the Monday Brief)

### Format

- **Length**: 300–500 words. Read time ≤90 seconds.
- **Structure** (the senior fractional COO format):

```
1. HEADLINE (1 sentence)
   Pattern: "We're [up/down/flat] on [most important metric this week];
   the biggest live risk is [X]."

2. THE NUMBER THAT MATTERS THIS WEEK (1 line + 1 line context)
   Not always same metric — whichever moved most against plan.

3. WINS (2–3 bullets, ≤1 line)
   Specific. "Closed [X] for $14K MRR" not "great new business week."

4. RISKS / WATCH (2–3 bullets)
   Each must name the dollar / day / client at stake.

5. TOP 3 OWNER ACTIONS THIS WEEK
   VERB + WHO + BY WHEN.
   Ranked by reversibility cost: irreversible decisions first.

6. ASKS / DECISIONS NEEDED FROM YOU (0–2)
   Things the COO/agent can't do without owner sign-off. Default: empty.
```

### Headline patterns that work

- *Tension headline (best)*: "Up 12% on revenue but cash collected only at 87% — we're growing on the books, not in the bank."
- *Risk-first*: "[Client] at $18K MRR is at risk; renewal window opens in 21 days and we've heard nothing."
- *Win + context (rare, only when truly clean)*: "Best new-business week of Q[N] — three closed, $42K new MRR. Watch: pipeline coverage for July is only 2.1×."

### Ranking the top 3 actions

1. Anything decaying (renewal closing, AR aging into 60+, deadline within 5d at risk) — by dollar × probability
2. Anything blocked on the owner (decisions team can't make)
3. Highest-ROI proactive action (one client who'd buy more, one offer worth testing)

**Never list more than 3. If everything is urgent, nothing is.**

### Anti-patterns

- Metrics without movement context ("MRR is $187K"). Always vs prior period.
- Burying the headline in slot 4.
- Five bullets where one would do.
- Wins inflated to fill space.
- Soft asks ("maybe think about..."). Always clean asks with a by-when.

---

## 6. PROFITABILITY (per-client P&L)

### The true margin formula (Parakeeto canon)

**Delivery Margin = (ABR − ACPH) / ABR**

- ABR = Average Billable Rate (revenue per hour of client work)
- ACPH = Average Cost-Per-Hour (fully loaded delivery labor cost / available hours, ~1800/yr for a US FTE)

**Per-client Operating Margin ≈ Delivery Margin − (overhead % × AGI share)**

Petitpas rule: don't allocate overhead per client. Calculate overhead as % of AGI and subtract once.

### Healthy margins

| Line | Healthy | Source |
|---|---|---|
| Delivery margin | **50–60% blended, 60–70% per project** | Parakeeto |
| Net operating margin (after overhead) | **20–30%** | Parakeeto / Sakas |
| Net profit margin after tax | **10–20% generalist, 25–40% specialist** | Promethean / AgencyAnalytics |
| Overhead % of AGI | 20–30% | Parakeeto |

### Effective Hourly Rate (EHR)

EHR = Revenue ÷ ALL hours worked (billable + non-billable)

| EHR | Status |
|---|---|
| ≥1.5× ACPH | Healthy |
| 1.2–1.5× | Tight |
| <1.2× | Underwater |
| <ACPH | Losing money — fire or reprice immediately |

### Triage tree (low-margin client)

1. <20% margin AND first 6mo of relationship → wait, onboarding is always low-margin
2. <20% margin AND scope creep is the cause → reprice first
3. <20% margin AND retainer correct but team slow → process problem, fix internally before talking to client
4. <20% margin AND no creep AND mature relationship → descope or productize
5. <10% margin or negative → reprice ultimatum or fire. Not "monitor."

### Conversation scripts

- *Reprice (margin-driven)*: "We've been delivering for you for 14 months at a margin that doesn't sustain the team. I want to keep working together, and that means resetting the retainer to $[X], up from $[Y]. Here's what stays the same, and here's what we'd cut if you'd rather hold the current rate. Can we walk through it Wednesday?"
- *Productize-down*: "We're going to shift you from custom monthly strategy to our standardized [package] starting next quarter — same outcomes, less custom work, price stays where it is. Walk through what changes?"
- *Fire (Sakas-style)*: "We've decided to focus the team on a narrower set of engagements over the next quarter, and we're not going to be the right fit going forward. Here's a 60-day transition plan and two referrals."

### Anti-patterns

- Calculating margin on billable hours only — non-billable per-client is the silent killer
- Elaborate per-client overhead allocation spreadsheets — Petitpas's % of AGI is what real operators use
- Carrying a sub-20% client >2 quarters "because they refer" — most "great referrer" clients refer one warm lead a year

---

## 7. TEAM (capacity / burnout)

### Signals + thresholds

| Metric | Healthy | Caution | Burnout |
|---|---|---|---|
| Billable util (production) | 70–80% | 80–85% | >85% sustained 2mo = predicts turnover (Yuktis) |
| Account mgmt util | 60–80% | 50–60% or 80–85% | <50% underused, >85% over-allocated |
| Director / leadership util | 30–50% | 50–65% | >65% (no strategy time) |
| Hours/week per FTE (40h) | 32–36 billable (Petitpas: 85–90% of 40) | 36–38 | >38 sustained |
| After-hours Slack | <5% of msgs after 6pm | 5–15% | >15% sustained |
| Weekend msgs per person per month | <2 | 2–5 | >5 |
| Time-off taken vs accrued | ≥80% taken | 60–80% | <60% |
| Voluntary turnover (annualized) | <10% | 10–20% | >20% |
| Rev/FTE (generalist agency) | $150–200K healthy; $180K+ strong | $125–150K | <$125K (underpriced or overstaffed) |
| Rev/FTE (specialist) | $200–300K+ | $150–200K | <$150K |

### Burnout signals operators actually watch (named, not vibes)

- Rising after-hours / weekend messages from strongest performers (they're absorbing)
- Time-off avoidance — star who hasn't taken 5d break in 9 months is closer to quitting
- Quality drop — more revisions, more typos, "I forgot to send X" (lags burnout by 4–8 weeks)
- Cynicism in standups — formerly positive person now passive-aggressive
- "It's fine" said when not asked

### Capacity-based hiring trigger

**Hire when**:
- Team-wide blended utilization >80% for 8 consecutive weeks
- Projected pipeline supports the cost for 6 months
- $X cash to absorb 90-day ramp

**Don't hire when**:
- Utilization is spiky (75% one week, 90% next) — fix scheduling not headcount
- Rev/FTE >$200K (generalist) → overworking + behind on hiring
- Rev/FTE <$125K → overstaffed or under-priced; fix pricing or trim first

### When a star is burning out

1. Direct, private 1:1 within 7 days. Calendared. "I'm worried. Two specific things I'm seeing: [X], [Y]. What's actually going on?"
2. Reduce load before adding support. Take 1 account off this week.
3. Mandatory PTO — 1 week unplugged. Cover their accounts.
4. Diagnose cause (volume / one bad client / one bad teammate / personal).
5. Permanent structural fix in 30 days. Without it, you've just bought time.

### Conversation scripts

- *Owner flag*: "Three signals on [name]: 87% utilization for 6 weeks, 11 weekend Slack msgs this month (was 1 in January), revisions on her last two client decks doubled. Real attrition risk. I want to take [Account] off her plate this week and book her a forced week off next month — your call, but waiting 30 days is what loses her."

### Anti-patterns

- Confusing high utilization with high productivity. >85% sustained → LOWER productivity in 8 weeks.
- "Resilience" praise — celebrating weekend work teaches the team that's the standard.
- Hiring out of panic at 95% utilization — 90-day ramp won't save the project on fire.
- Tracking utilization on billable hours only — non-billable internal load makes burnout invisible.

---

## 8. GROWTH (pipeline + channel ROI)

### Where agencies actually get clients (SparkToro State of Digital Agencies 2024–25)

| Channel | Share of new business |
|---|---|
| Referrals from existing/past clients | **~66%** (unchanged 2024→2025) |
| Referrals from partner agencies/companies | ~15% |
| Speaking at events / conferences | ~7% (jumped above outbound in 2025) |
| Outbound sales | ~6% (declining) |
| Inbound content/SEO | small single digits |
| Paid ads | tiny |

**For ~80% of agencies, the #1 growth lever is the referral engine, not paid acquisition.**

### Pipeline coverage math

**Required pipeline = Target new revenue ÷ (close rate × probability of close in window)**

Industry typical:
- Close rate (qualified → won): 20–30%
- Sales cycle: 30–60d single-service; 60–120d full-service retainer; 90–180d $10K+/mo retainer
- Healthy coverage ratio: **3–4× next quarter's target**

### Marketing-spend-to-revenue (agencies marketing themselves)

- Steady state: 3–7% of revenue
- Breaking into new market: 8–12%
- Most agencies under-spend (often <2%) — explains "always one bad month from a pipeline crisis"

### Decisions

- Pipeline coverage <2× for 30+ days → open one new channel this week
- Referral pipeline >80% of new biz → structural fragility; invest in 1 additional channel even if performing fine
- Outbound CAC > 6-month gross profit per client → cut outbound, double down on referrals + partnerships
- Speaking/events 2× ROI of paid ads → kill ads, fund speaking

### Conversation scripts

- *Pipeline warning*: "Coverage for July is 1.7× — drought territory. Two options: (a) we email the 22 past clients you haven't talked to in 12 months this week, or (b) we ask our 5 best clients for one intro each. (a) is faster, (b) is higher quality. Pick one and I'll draft tomorrow."
- *Channel cut*: "Google Ads has cost us $14K over 90 days, brought 4 qualified opps, closed zero. Referrals same window: $0 spend, 7 opps, 3 closed. Kill Ads and put $5K into a $500/closed-referral incentive — OK?"

### Anti-patterns

- Treating referrals as passive ("they just come"). Systematize: quarterly past-client touch, named partner network, referral incentive.
- Building outbound because that's what SaaS does. Services sales math is different.
- Assuming pipeline is healthy because last month closed well (closed-won is lagging; coverage is leading).
- "We need more leads" when real problem is **close rate** (qualification/positioning) or **deal size** (under-priced).

---

## 9. RENEWAL (churn prevention)

### Churn benchmarks (2024–26)

| Cohort | Annual churn |
|---|---|
| Retainer-based agencies | **18%** |
| Project-based agencies | **42%** |
| Hybrid | ~28% |
| 51+ FTE | 12–15% |
| 1–10 FTE | ~32% |
| PPC-only specialists | **49%** (most commoditized) |
| Full-service | ~25% (highest switching cost) |

Source: Focus Digital 2026 Average Marketing Agency Churn report (generalizes broadly to services).

### Critical period

**First 90 days = peak churn risk.** Retainer-based services lose ~8% of clients in months 1–6. Needs its own playbook (oversight, weekly check-ins, fast wins surfaced).

### Early churn signals (predictive order)

1. Reduced communication — replies slow, meetings moved/skipped, one-word answers
2. Stakeholder change — new buyer joins or replaces your champion (biggest predictor in B2B services)
3. Ad-spend or program-spend cut — budget signal precedes contract signal
4. Scope reduction asks — "can we pause [X]?" often first half of "can we stop everything?"
5. Quiet renewal window — contract in 60d and they haven't initiated
6. Strategy questions returning to first-principles — "remind me why we do [thing]?"
7. Decline in usage of deliverables (dashboard logins, asset downloads)
8. Late payment after never being late — cash signal precedes churn signal by ~60d

### Renewal timing

- 120 days out → flag in brain. Internal account review.
- 90 days out → "start thinking about this" soft AM touch. No pitch.
- 60 days out → **the renewal conversation happens here.** Listening session not pitch. Sakas framing: "What did we get right? What should be different next year?"
- 30 days out → "this needs to be signed" — papers, pricing, scope locked
- <30 days → already late. Treat as red.

### The save play

1. Owner-to-owner call within 48 hours. Not the AM.
2. Listen first, pitch never. Open with "What changed?" not "Let me show you why you should stay."
3. Surface underlying issue. Almost always: one bad delivery moment unrepaired, new stakeholder, budget cut, or boredom.
4. Tangible time-bound offer. "60-day reset: new AM, new SLA, new scope. If not visibly better by [date], we tear up the contract and refund the difference."
5. Discount is LAST lever, not first.
6. Know when to let go.

### When NOT to save

- Champion gone, new buyer doesn't believe in your category
- Trust broken (public screwup unrecoverable)
- Client gone hostile (blame loop, public criticism)
- Margin would be negative at full price after save
- Team begging not to keep this client — internal moral debt > MRR

### CAC vs CRC

Industry-wide: CAC = 5–25× CRC (Bain). 5% retention improvement → 25–95% profit uplift.

### Conversation scripts

- *60-day opener*: "Renewal comes up on [date], and before paperwork I want 30 min on the last 12 months. What did we get right? What should be different next year? No agenda from my side — just want to listen."
- *Save play*: "I heard you're considering moving. Before anything else, I want to apologize for whatever we did to get here and find out what would actually change your mind. Can we do 45 minutes Wednesday morning, owner-to-owner?"

### Anti-patterns

- Waiting for the renewal date to discover whether they want to renew
- "Saving" by discounting first — teaches every renewal that price is negotiable
- Treating renewal as a finance/contracts task; it's a relationship event
- Letting the AM run the save play. Owner-to-owner. Always.

---

## 10. STACK (software audit, monthly)

### Healthy software cost as % of revenue

- Established: 3–5%
- Active automation/AI investment phase: up to 7–8%
- >10% is bloat unless explicitly productizing

### Common waste patterns

- 30–40% of features unused across typical stack
- 38% of MarTech budget wasted on underutilized features (Forrester)
- 51% of SaaS licenses unused (Gartner — broader)
- 34% of software spend wasted at mid-size companies (Gartner)
- Duplicate-category tools (Asana AND ClickUp; Slack AND Teams; Loom AND Vidyard)
- Ghost seats — ex-employees still licensed 3–9mo after offboarding
- Annual contracts on auto-renew for tools last logged into in Q1
- Overlapping AI subs — every team member with their own ChatGPT Plus + agency Claude + team Gemini
- Tier creep — Pro seats handed out as default when Free/Starter would do

### The 30% utilization rule (refined)

- **Keep**: used by ≥30% of relevant team at least weekly for >3 months
- **Consolidate**: 10–30% usage AND another tool covers same job-to-be-done
- **Cut**: <10% usage OR no logins 90+ days OR last-6mo value < 6mo cost
- **Exception**: power-user specialty tools (designer's Figma plugin) — count seats not team %

### Switching cost math

- Light migration: ~$1K–$5K + 1–2 weeks partial productivity loss
- Heavy migration (data/integrations/workflows): $10K–$50K + 1–3mo degraded velocity
- **Consolidate if (annual savings × 2) > switching cost AND team agrees consolidated tool meets ≥80% of needs.** Below that bar, don't switch.

### Decisions

- Unused 90+ days → kill immediately, no team check-in
- Duplicate category with low-usage second tool → kill the second
- Tier creep on 5+ tools → quarterly seat audit, baseline = Starter, justify upgrades individually
- Total stack >5% of revenue growing faster than revenue → mandatory quarterly trim
- Annual renewal coming up on tool used by <30% → renegotiate to monthly or downgrade

### Conversation scripts

- *Owner audit summary*: "Stack is at 6.2% of revenue, up from 4.1% last year. Three obvious cuts ($X/mo saved): [tool A] not logged into in 6 months, [tool B] duplicates [tool C], [tool D] has 4 ghost seats. Two consolidation candidates worth a 15-min team check: [E] vs [F]. Approve the cuts and I'll execute this week?"

### Anti-patterns

- "It's only $X/month" — death by a thousand subscriptions. 30 tools × $40 = $14K/yr of low-attention spend.
- Letting individual team leads expense their own tools without central visibility
- Audit only at year-end — by then 11mo of waste happened
- Cutting by cost only, not value
- Consolidating to save $200/mo while burning $20K in switching pain

---

## Sources (consolidated)

- Sakas & Company / Karl Sakas — [sakasandcompany.com](https://sakasandcompany.com)
- Parakeeto / Marcel Petitpas — [parakeeto.com](https://parakeeto.com)
- Agency Management Institute / Drew McLellan — [agencymanagementinstitute.com](https://agencymanagementinstitute.com)
- Agency Mastery 360 / Jason Swenk — [jasonswenk.com](https://jasonswenk.com)
- AgencyAnalytics 2024 Benchmarks — [agencyanalytics.com/blog/marketing-agency-benchmarks-2024](https://agencyanalytics.com/blog/marketing-agency-benchmarks-2024)
- Promethean Research — [prometheanresearch.com/how-profitable-are-digital-agencies/](https://prometheanresearch.com/how-profitable-are-digital-agencies/)
- SparkToro State of Digital Agencies — [sparktoro.com/blog/the-state-of-digital-agencies-in-2024-...](https://sparktoro.com/blog/the-state-of-digital-agencies-in-2024-client-referrals-drive-agency-new-business-but-is-it-enough-and-are-sales-pipelines-a-cause-for-concern/)
- Focus Digital 2026 Churn Report — [focus-digital.co/average-marketing-agency-churn/](https://focus-digital.co/average-marketing-agency-churn/)
- Productive.io 2024 Report on Agency Valuations — [productive.io/the-2024-report-on-agency-valuations/](https://productive.io/the-2024-report-on-agency-valuations/)
- Yuktis "Silent Metric" — [yuktis.com/blog/agency-utilization-rate-prevent-burnout](https://yuktis.com/blog/agency-utilization-rate-prevent-burnout)
- HubSpot State of Service 2024 — [hubspot.com/hubfs/2024%20HubSpot%20State%20of%20Service.pdf](https://www.hubspot.com/hubfs/2024%20HubSpot%20State%20of%20Service.pdf)
- Predictable Profits 2025 — [predictableprofits.com/2025-agency-growth-benchmark-...](https://predictableprofits.com/2025-agency-growth-benchmark-key-metrics-from-300-7-8-figure-agencies/)
- Anthropic Multi-Agent Research — [anthropic.com/engineering/multi-agent-research-system](https://www.anthropic.com/engineering/multi-agent-research-system)
- BOND (YC X25) competitive context — [ycombinator.com/companies/bond](https://www.ycombinator.com/companies/bond)
