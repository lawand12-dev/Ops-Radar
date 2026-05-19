# OpsRadar ICP & Customer Research

*Last updated: 2026-05-18*
*Owner: founder / GTM*
*Inputs: `path-a-strategy-2026.md` Section 7, `ai-market-research-2026.md`, `.agents/product-marketing.md`, customer-research skill frame, web-sourced community data (cited inline).*

> **The point of this document.** The original ICP — "$500K–$5M digital marketing agencies, 5–50 employees" — is too wide to operationalize. It includes a 5-person SEO freelancer collective and a 48-person full-service shop in the same bucket. They buy differently, feel different pain, and pay different prices. This doc splits the universe into 3 tiers, builds 3 buyer personas you could pick out of a Slack thread, and gives sales a 10-question disqualifier so we stop chasing the wrong agencies.

---

## 1. The Refined ICP Tiers

### Tier 1 — Beachhead (first 50 customers)

> **One-line:** $1M–$3M-revenue, US-based, retainer-heavy digital agencies (paid media, SEO, social, or full-service) with 10–25 employees, a founder-CEO still doing ops, no COO, and at least 4 of our 10 stack integrations already in place.

| Attribute | Hard criterion |
|---|---|
| Revenue band | **$1M–$3M ARR** (the inflection band: big enough to bleed real money, small enough that the founder is still the decision-maker and pays from her own pocket) |
| Headcount | **10–25 FTEs** (≥10 means margin math matters; ≤25 means no real ops department exists yet) |
| Agency type | Paid-media / PPC, SEO, social, content, or full-service digital. Retainer revenue ≥ 60% of total. |
| Geography | **US + Canada, English-first.** Europe (UK, NL, DE) and AU/NZ allowed if billing in USD/GBP/EUR and stack is US-native. |
| Ops maturity | **Founder-led ops**, OR a recently-promoted "Head of Ops" / "Director of Ops" who came from a PM/AM seat in the last 18 months. No COO. No CFO. May have a part-time bookkeeper. |
| Current stack (≥4 of these) | HubSpot or Pipedrive · ClickUp or Asana or Monday · Harvest or Toggl · Stripe · Calendly · Apollo · Slack |
| Pain stage | "Growing revenue, shrinking margin" — has hit at least one of: (a) lost a 5-figure client to overservicing in the last 12 months, (b) ran a layoff in the last 12 months, (c) is currently paying or has recently fired a fractional COO at $5K–$15K/mo, (d) had a Q where bank balance dropped while revenue rose |
| Billing model | Monthly retainers or hybrid retainer + project. **Not** pure project, pure performance-fee, or pure media-buying commission. |
| AI posture | Already pays for ChatGPT/Claude team seats, ≥1 vertical AI tool. "Curious but burned." |
| Tenure | Founded **3–10 years ago**. Past the founder-as-employee phase, not yet at the institutional phase. |

**Why this is the beachhead.** This is the band where the buying decision is made by one person in one meeting, the pain is acute enough to overcome status-quo bias, and our 10 integrations cover ~80% of the real stack. Above $3M, RFPs and committees creep in. Below $1M, the founder hasn't felt the bleed yet.

**Approximate TAM at Tier 1.** ~12,000–18,000 US/Canada agencies fit; ~4,000–6,000 are reachable via the channels in Section 7.

---

### Tier 2 — Expansion (customers 50–200)

> **One-line:** $3M–$8M agencies, 25–50 employees, with a real Head of Ops or fractional COO in seat, and a multi-stakeholder buying process.

| Attribute | Criterion |
|---|---|
| Revenue band | **$3M–$8M ARR** |
| Headcount | **25–50 FTEs** |
| Ops maturity | Head of Ops or fractional COO is the user; founder is the financial buyer. May have a CFO/controller. |
| Pricing tier | Almost all land on Growth ($1,500) or Pro ($3,000), not Starter. Seats and agentic actions matter. |
| Stack depth | 7–10 of our integrations connected. Often have one we don't support yet (e.g., Float, Mosaic, Mavenlink). |
| Buying process | 2–3 stakeholders, 30–60 day cycle, security review starts to appear. |

**Why second, not first.** The check is bigger ($1.5K–$3K vs $500–$1.5K), but the cycle is 2–3x longer, the user (Head of Ops) is not the buyer (founder), and we need case studies from Tier 1 to break in. We also need the **multi-client dashboard** mature enough to defend against "we'll just hire a real COO" — which is a live alternative at this size. Win Tier 1 first, then this tier inbounds itself.

---

### Tier 3 — Future (beyond customer 200)

White space we **don't serve well yet** and shouldn't chase:

- **$8M–$20M agencies** with a real COO + analytics team. They will demand SSO, SOC 2 Type II, custom roles, audit logs, on-prem SQL exports. We're 12–18 months from that.
- **Holding-co subsidiaries** (WPP/Publicis/Omnicom op-cos). Procurement is impossible from a 1-person sale. Park.
- **Fractional COO firms with 10+ consultants** (Parakeeto-shaped). Need a true partner program with white-label + revenue-share contracts. Park until Month 9.
- **Non-marketing service firms** — law, accounting, dev shops, consultancies. Same JTBD shape but different vocabulary and different stack. Build a wedge later; do not split focus now.
- **International outside English-first markets** (LATAM, APAC, India). Stack mismatch (Zoho, Freshworks), currency complexity, support coverage.

The discipline: **every "interesting" inbound from a Tier 3 bucket gets a polite no with a "we'll be ready for you in 2027" line.**

---

## 2. The 3 Detailed Buyer Personas

### Persona A — Marcus Reyes, Founder-CEO, $1.8M paid-media agency

**Bio.** Marcus, 38, founded **Northbeam Performance** in 2018 after 6 years on the Facebook side of a Boston ad shop. The agency is 14 people (9 in delivery, 3 in BD, 1 in finance/HR, plus Marcus). 22 retainer clients, average $6.5K/mo. He still runs the weekly client review himself, still negotiates every renewal, still pulls the P&L from QuickBooks into a Google Sheet every Friday night. His wife asks him every Sunday why he doesn't take Sundays off. He doesn't have a good answer.

**Day-in-the-life (Tuesday).**
- 6:45 — coffee, opens Slack on his phone, scans #client-issues. One PM says "Acme is asking for two more landing pages this week."
- 8:00 — team standup, 15 min.
- 8:30–11:00 — back-to-back client calls. Two renewals, one fire.
- 11:00 — opens Harvest to check if the Acme team logged the LPs as in-scope. The data is 4 days old. He can't tell.
- 12:30 — lunch at his desk, reviewing the BD pipeline in HubSpot.
- 2:00 — interview a senior media buyer he's been chasing for a month.
- 4:00 — head of delivery walks in: "We're going to miss the GreenTree deliverable. We need to push." Marcus says yes without checking utilization.
- 6:30 — drives home. Anxious about cash flow because Stripe shows two invoices unpaid.
- 9:00 — opens his laptop. Tries to build a per-client margin view in a sheet. Gives up at 10:45.

**Top 5 frustrations.**
1. "I find out a client is unprofitable two months after it started."
2. "I have 8 tools open right now and none of them tell me the same number."
3. "My delivery lead says we have capacity. My utilization report says we don't. I don't know who's right."
4. "I paid a fractional COO $9K/month for 4 months and got 3 PDFs."
5. "Every benchmark I read says I should be at 75% utilization. I'm at 64% and I don't know which lever to pull."

**Top 3 buying triggers.**
1. A specific client just went unprofitable and he caught it 60 days late ("the Acme moment").
2. He's about to do a layoff and wants to know if it's necessary before he tells the team.
3. A peer in his Vistage / EO / AMI peer group said "we use [thing]" and Marcus felt behind.

**What he reads.** Smart Agency Masterclass (Jason Swenk) — listens at the gym. Build a Better Agency podcast (Drew McLellan, AMI). Karl Sakas's email list. The Demand Curve newsletter. The Agency Hour (Troy Dean) on YouTube occasionally. Hates LinkedIn but checks it twice a day.

**Where he hangs out online.**
- **Online Geniuses Slack** (25K–45K members, largest digital marketing Slack) — #agency-life and #agency-owners channels [^1]
- **AMI peer groups** (paid, 300+ agency principals, Drew McLellan)
- **EO Boston / Vistage chapter** (in-person monthly)
- **Smart Agency Masterclass Slack** (Jason Swenk's owner community)
- LinkedIn — follows Karl Sakas, Marcus Sheridan, Drew McLellan, Jason Swenk
- Lurks in **r/agency** and **r/marketing** but never posts

**How he evaluates tools.**
1. Founder demo, 20–30 min — must talk to a founder, not an SDR.
2. 14-day free trial with **his real data connected** (mandatory; a sandbox demo loses him).
3. Two peer references he can DM (not on a marketing page).
4. Decides in 1–3 weeks. Pays with a personal credit card if under $2K/mo.

**The exact words he uses (for copy).**
- "I'm flying blind on margin."
- "I'm growing revenue but my bank account is getting smaller."
- "I can't afford a real COO."
- "I'm the bottleneck."
- "I don't want another dashboard, I want someone to tell me what's wrong."
- "If I have to log into one more tool I'm going to scream."

---

### Persona B — Priya Shah, Head of Operations, $3.2M social-and-content agency

**Bio.** Priya, 31, joined **Tilt Creative** as the second account manager in 2022. Promoted to Senior AM in 2024, then to Head of Operations 9 months ago when the founder decided he didn't want to do ops anymore. 27 people, 31 clients, average $8.5K/mo retainer. She has no formal ops training. She has Notion templates, a Coda doc the previous COO left behind, and a Slack DM from the founder every morning that says "Priya can you pull…"

**Day-in-the-life (Monday).**
- 7:30 — opens Notion at home, reviews her week's "ops priorities" she set Friday.
- 8:30 — into office. Pulls the weekly utilization report. ClickUp → CSV → Sheet → Slack. 45 min.
- 10:00 — staff meeting. Founder asks "are we on plan?" She doesn't really know.
- 11:00 — DMs from 4 different PMs about resourcing conflicts.
- 1:00 — finance check-in. Stripe shows $42K in receivables >30 days. She has to chase 7 clients.
- 3:00 — interviews a candidate. Doesn't know if they actually need the headcount.
- 5:00 — founder walks in: "Can you do a margin-by-client breakdown for the board on Thursday?" She blocks Wednesday night for it.
- 9:30 — opens her laptop after dinner. The sheet doesn't tie. She cries a little.

**Top 5 frustrations.**
1. "I spend 30% of my week pulling reports nobody reads."
2. "The founder asks me a question, I spend 4 hours getting the answer, by then he's moved on."
3. "I don't have a benchmark for anything — is 68% utilization good or bad?"
4. "Tools don't talk to each other and IT won't let me hire a Zapier consultant."
5. "I got promoted into a job I was never trained for and Google can't really help."

**Top 3 buying triggers.**
1. Board meeting in 2 weeks, owner wants metrics she can't pull.
2. Lost a top performer who said "the ops here are chaos."
3. A peer Head of Ops in her Fractionals United or Slack DM circle says "we just turned on [tool]."

**What she reads.** Karl Sakas's newsletter. ZenPilot's Agency Journey podcast [^7]. The Agency Profitability Toolkit (Parakeeto). The Lenny's Newsletter on ops. Substack ops writers.

**Where she hangs out.**
- **Operations Nation** Slack
- **Fractionals United** Slack (13,000+ members) — she's adjacent because her boss talks about hiring fractionals [^2]
- **ZenPilot** community / mailing list
- **Online Geniuses** #agency-ops [^1]
- LinkedIn — follows Karl Sakas, Marcel Petitpas (Parakeeto), Gray MacKenzie (ZenPilot), Drew McLellan
- **AMI** sometimes attends webinars

**How she evaluates tools.** Wants a demo first. Wants to bring it to the founder with a 1-pager. Cares deeply about onboarding effort because she's the one who will do it. Will champion **the tool that makes her look good in the Thursday board update.**

**The words she uses.**
- "I just need one source of truth."
- "I'm pulling the same reports every week."
- "Nobody on my team can pull this without me."
- "If I get hit by a bus this place falls over."
- "My founder doesn't want a dashboard, he wants an answer."

---

### Persona C — David Okonkwo, Fractional COO (channel persona)

**Bio.** David, 47, was COO of a $14M Toronto creative agency for 8 years, exited when the founders sold to a holding co in 2023. Now runs an independent fractional COO practice — **OkonkwoOps** — with 4 active agency clients at $9K–$12K/month each, plus a roster of 2 "intro engagement" clients at $3K/mo. Trying to scale to 7 clients without hiring. He is who OpsRadar wants in our corner.

**Day-in-the-life (Wednesday).**
- 7:00 — coffee, opens his personal CRM (Notion). Today: Client B's monthly review, Client A's resource planning call, Client D's quarterly business review prep.
- 8:00 — drives to Client B's office. 10:00 review meeting. Spent 6 hours last night pulling utilization from their Mavenlink into a Google Slide deck. Hates it.
- 11:30 — Zoom with Client A about hiring plans. They want him to "tell them" what to do; he doesn't have live data.
- 2:00 — block for Client D's QBR. He has to pull margins, utilization, scope creep across 18 clients of theirs. Took him 11 hours last quarter. He's billing 8.
- 6:00 — at home, posts a thoughtful comment in Fractionals United Slack [^2].
- 9:00 — quotes a new prospect. Says "audit will take 3 weeks." Knows the prospect will probably ghost because of the timeline.

**Top 5 frustrations.**
1. "I bill $10K/month but spend 15 hours of unbilled prep per client per month."
2. "Each client has a different stack — I learn 4 PSAs because my clients all chose differently."
3. "I can't prove my impact in numbers — clients renew because they like me, not because of a metric."
4. "Onboarding a new agency takes me 3 weeks before I can say anything intelligent."
5. "If I want to scale, I have to hire — but I built this to not have employees."

**Top 3 buying triggers.**
1. **He just lost a client** because they couldn't see his impact.
2. **He's about to scale to a 5th or 6th client** and the manual ops won't survive.
3. **A peer in Fractionals United** says "I'm using [thing] and it cut my audit time in half."

**What he reads.** Fractional CXO Substacks. Karl Sakas. Parakeeto (Marcel Petitpas). Some HBR. The Profitable Service Business by Mark Wickersham.

**Where he hangs out.**
- **Fractionals United Slack** (13,000+ members, +600/month growth, founded by Karina Mikhli) — this is the highest-leverage venue [^2]
- **Modern CEO** (peer group for fractional execs)
- LinkedIn — posts 3x/week, 4K connections, mostly other fractionals + agency founders
- **Operators Guild** (paid, 600+ ops execs, $1.5K/yr)
- Goes to **AMI Build a Better Agency Summit** in Denver each May to network with agencies hiring fractionals [^4]

**How he evaluates tools.** Wants a 30-min walkthrough, then a free 30-day trial on **one of his clients' data**. Will not pay out of pocket — needs to bill it to the client or get a referral commission. **A 20–25% recurring referral fee is the table-stakes mechanic.**

**The words he uses.**
- "I need to look smart in front of 4 different clients at the same time."
- "Onboarding eats my margin."
- "My value is the framework I bring — I want a tool that runs the framework."
- "If you make me look good, I bring you 4 customers."

---

## 3. Buying Triggers — 10 Ranked

> Scored 1–10 on **Urgency** (how fast they need to act), **Budget** (how easy the money is to find), and **OpsRadar-fit** (how directly we solve their now-problem). Total score determines rank.

| # | Trigger | Urg | Budget | Fit | Total | How to detect in cold prospecting |
|---|---|---|---|---|---|---|
| 1 | **"I just discovered I lost $40K on a client last quarter and had no idea"** | 10 | 9 | 10 | **29** | LinkedIn post by founder saying "lessons learned from a tough Q." Job posting for "Senior Account Manager — must own scope" with "recent losses" language in role description. AMI / Smart Agency podcast guest mentions a specific client loss. |
| 2 | **Currently paying a fractional COO $5K–$15K/mo** | 9 | 10 | 10 | **29** | Founder follows multiple fractional COOs on LinkedIn. Fractional COO's LinkedIn bio mentions the agency as a client. Posts a "thanks to [fractional name] for…" testimonial. |
| 3 | **Just ran a layoff in last 90 days** | 10 | 7 | 10 | **27** | LinkedIn — laid-off employees announcing "open to work" from the same agency in a 30-day window. Layoffs.fyi mentions. Agency blog post "navigating change." |
| 4 | **Just hired a Head of Operations from inside (PM → Director of Ops)** | 8 | 9 | 10 | **27** | LinkedIn title change. New "Director of Ops" with <2 years at the agency and prior title was AM/PM. Often posts "excited to step into this role!" |
| 5 | **Posted a job for an "Operations Manager" or "RevOps" role** | 8 | 9 | 9 | **26** | LinkedIn Jobs, Indeed, We Work Remotely. Search for "agency operations manager" + 10–25 employees. ZipRecruiter alerts. |
| 6 | **Founder just attended AMI / Mirren / Agency Hackers event** | 7 | 8 | 9 | **24** | Conference attendee list (if public). LinkedIn posts "great time at [event]." Photos from the venue. |
| 7 | **Just raised SBA loan / brought on a partner / changed equity structure** | 8 | 9 | 7 | **24** | New "partner" announcement. PR Newswire small-agency posts. State business filings. |
| 8 | **Public complaint about a current PSA tool** (Productive/Scoro/Accelo) | 7 | 7 | 9 | **23** | G2 / Capterra reviews from agency-shaped reviewers in the last 90 days. Reddit posts in r/agency / r/marketing. Twitter/X searches: "switching from Productive." |
| 9 | **Founder just listened to a podcast about AI / margins / scope creep** | 6 | 6 | 9 | **21** | LinkedIn shares/comments on a Jason Swenk, Drew McLellan, or Marcel Petitpas episode within last 14 days. |
| 10 | **Agency just published a "we're hiring 5+ people" post** | 7 | 8 | 6 | **21** | LinkedIn posts. Career page diffs (track monthly). Tells us they're scaling — and scaling without ops is the moment we're useful. |

**Operating note for SDR/founder.** A prospect with ≥2 of these signals in the last 90 days is "hot" — front-of-queue, personal email + LinkedIn DM within 24 hours. ≥1 signal = warm — goes into the standard 5-touch sequence. 0 signals + Tier-1 firmographic match = cold — sequence at lower priority.

---

## 4. Disqualifiers — the Hard NO List

> Every "no" here saves 4–8 hours of bad-fit selling and one disappointed customer-success conversation 3 months later.

| Disqualifier | Why it's a NO | The polite "no, but…" |
|---|---|---|
| **Solo founder, <$200K revenue, no team** | No team = no utilization problem. No margin layer = no JTBD. Will churn in 60 days for price. | "OpsRadar is built for agencies with at least 5–8 people on delivery. Bookmark us for when you cross your first hire — we'll be here." |
| **Agency >$20M ARR** | They have or are hiring a real COO + analytics team. Procurement, SSO, SOC 2 Type II are blockers. Long cycle, low close rate, support burden. | "We're not the right fit at your scale — Kantata and Mavenlink are built for you. Call us in 18 months if you want vertical AI on top." |
| **Production-only studios** (video, design, dev shops, app studios, animation houses) | Project-based billing, milestone delivery, no retainer cadence. Our benchmarks and alerts don't fit. The "scope creep" problem manifests differently (change orders, not silent overservicing). | "Our benchmarks are tuned for retainer agencies. For project shops, look at Productive or Float — they handle milestones better." |
| **Promotional products / merch / print** (the Pop! Promos lesson) | Different business model — they're a manufacturer with a sales team, not a service agency. No utilization JTBD. We learned this the hard way. | "We're an operations tool for service agencies, not for promo/merch companies — your ops shape is closer to manufacturing." |
| **Agency on a stack we don't integrate with** (Mavenlink, Workamajig, FunctionPoint, Zoho One, Freshworks, Bonsai-only) | Time-to-value is too high. Customer churns before integration ships. | "We'd be useful in concept but we don't yet integrate with [tool]. If you're open to adding a 2nd tool (Harvest, Toggl), we can talk." |
| **Owner with control-freak / "I built it myself" energy** (red flag: founder talks more than asks in the demo; refuses to give us read-only access to one tool) | They will not trust agentic actions, will demand custom builds, will churn when we say no. | Don't reject explicitly. Quote them at Pro tier and let pricing self-select them out. |
| **International outside US / Canada / UK / EU / AU-NZ + English-only** | Stack mismatch (Zoho, Freshworks), currency complexity, support hours, billing edge cases. | "We're US/Canada/UK/EU-focused right now. Drop us a note in Q4 2026 — we'll have multi-currency by then." |
| **Pure performance / commission-only billing** (no retainers) | No utilization metric — the JTBD is upside, not margin protection. Different product. | "We help agencies running retainers protect margin. If you're commission-only, your problem is closer to lead-gen quality than ops." |
| **"AI is hype, I don't believe in it"** | They will not adopt agentic actions, will not trust the alerts, will return to spreadsheets. Sales cycle is hostile. | "Totally fair — we're probably not the right fit right now. If your view shifts, we'll be here." |
| **Currently switching PSA in the next 30 days** | Their attention is gone. Will look at us in Q+1, not now. | "Let's reconnect in 90 days once your new PSA is bedded in — we sit on top of it." |

---

## 5. Jobs-to-be-Done Map

> Christensen framework: each row is a **job** the customer hires us to do. The job sentence is "When [trigger], I want to [motivation], so I can [outcome]."

| # | The Job | Trigger | Desired outcome | Today's alternatives | OpsRadar fit |
|---|---|---|---|---|---|
| 1 | **Stop bleeding margin on overserviced clients** — "When I sign a new retainer, I want to know within 14 days if we're trending over scope, so I can intervene before I eat 2 months of margin." | Founder catches an overserviced client at month-end | Real-time per-client P&L | Manual sheet pulls from Harvest + QuickBooks every Friday; quarterly Parakeeto audit | **A+** — core feature. The wedge. |
| 2 | **Replace the $10K/mo fractional COO** — "When I'm paying $9K/month for a fractional COO who tells me things I should already know, I want a system that does 80% of that 24/7." | Renewal date on the fractional COO contract | Same intelligence at 1/10th the cost | Fractional COO; nothing | **A** — direct displacement. Best ROI story. |
| 3 | **Prove our AI tools are actually generating ROI** — "When my partners ask 'is the $4K/month we spend on AI working?', I want to point to a number, not vibes." | Quarterly partner meeting; budget review | AI ROI attribution | Vibes; "I think it's helping"; ChatGPT screenshots | **A** — unique angle. No competitor frames it this way. |
| 4 | **Get the founder out of the weekly reporting loop** — "When my team asks me to pull the utilization report, I want them to just have it." | Founder is the bottleneck on every operational answer | Self-serve dashboards for delivery leads | Founder pulls report manually; PSA's static reports nobody reads | **A** — Health Score + delivery views |
| 5 | **Catch a client about to churn before they tell us** — "When a client's NPS drops, response time slips, or scope reduces, I want a 30-day warning." | Just lost a 5-figure client unexpectedly | Predictive client-health alerts | Quarterly NPS survey; "gut feel" | **B+** — partially shipped, expanding |
| 6 | **Hire confidently without overshooting payroll** — "When my delivery lead says we need to hire, I want to know if our utilization actually supports it." | About to greenlight a new hire | Capacity-led hiring decisions | Founder gut + delivery lead opinion | **A** — utilization + projection |
| 7 | **Cash-flow visibility without QuickBooks gymnastics** — "When Stripe shows late invoices, I want a Slack ping with the chase list, not a 9pm scroll session." | Cash-flow scare | Cash forecast + late-invoice alerts | Weekly Stripe scroll; QBO export | **A** — Stripe integration shipped |
| 8 | **Look smart in front of board / investor / advisor** — "When my next board update is on Thursday, I want a 1-page agency health summary I didn't make in Keynote at 11pm Wednesday." | Board meeting in <2 weeks | Auto-generated agency report | Founder builds slides; pays freelancer | **B+** — health score → report builder is on roadmap |

**The wedge in one sentence:** Job #1 (per-client margin) is the foot in the door. Job #2 (replace the fractional COO) is the dollar value of the ROI. Job #4 (get the founder out of reporting) is the *emotional* hook that makes them sign.

---

## 6. The 5 Conversations Customers Are Having With Themselves

> First-person, unedited internal monologues. Copy these verbatim into landing-page headlines, cold-email opening lines, and ad creative. **These are not what they say in meetings — these are what they say to themselves on the drive home.**

**Conversation 1 — The Margin Conversation (the most important one)**
> "I keep hiring more people but margins keep shrinking. Revenue is up 22% and I took home less than last year. Is this just how agencies work? Everyone tells me 'scale solves it,' but at $2M I was profitable and at $2.8M I'm not. What the hell am I doing wrong? My accountant tells me at the end of the quarter — that's two months too late. By then I've already lost the money. I need to see this in real time. Or I need to stop growing."

**Conversation 2 — The COO Conversation**
> "I know I need a COO. Every podcast says 'the moment you can afford one, hire one.' But $25K a month? Or $10K for a fractional who comes in 8 hours a week and tells me to 'tighten my SOPs'? I've done that twice. I have a binder of recommendations and zero implementation. The third time I'm not going to spend the money. There has to be a third option."

**Conversation 3 — The AI Conversation**
> "Everyone says AI will change everything. I'm paying for ChatGPT Team, Claude, Midjourney, Cursor for the dev team, Jasper for content, and probably three more I forgot about. That's $3K a month. Is any of it actually working? My margins are worse, not better. If somebody asked me to prove AI ROI right now I'd just point at a brand-shoot deliverable and shrug. That's not an answer."

**Conversation 4 — The Layoff Conversation**
> "If we have another quarter like Q1, I have to let two people go. I don't even know which two. The delivery lead says everyone's at capacity, but our utilization report says 64%. Somebody is wrong. If I cut the wrong person I lose a client. If I don't cut, I miss payroll in October. I'm not sleeping. My wife has noticed. The team has noticed."

**Conversation 5 — The Exit Conversation (the secret one)**
> "I started this agency because I love marketing. I now spend 80% of my time in ops, finance, and HR — the three things I'm worst at. I'm 9 years in. I either sell, hire a real COO, or I burn out. The number on a sale right now would be 4–6x EBITDA. My EBITDA is bad because my ops are bad. So even my exit depends on fixing this."

---

## 7. Where to Find Them — Ranked Sourcing Playbook (Top 15)

> Ranked by **expected return per hour of effort** for OpsRadar's specific ICP, not by raw audience size. Member counts cited inline.

| # | Channel | Audience | Why this | Access notes |
|---|---|---|---|---|
| 1 | **Online Geniuses Slack** | 25K–45K members; the largest digital marketing Slack [^1] | Tier-1 personas A & B both lurk here. #agency-owners and #agency-ops channels are dense with our buyer. | Free; vetted application. No promo allowed in main channels — use the founder-only Slack DMs sparingly. |
| 2 | **Fractionals United Slack** | 13,000+ members, +600/mo growth, founded by Karina Mikhli [^2] | The single highest-leverage venue for Persona C (channel). One adopter = 3–5 customers. | Free; verification required (must be a fractional). Apply, post 2 weeks of genuine value before mentioning OpsRadar. |
| 3 | **AMI (Agency Management Institute) peer groups** | 300+ paying agency principals; Drew McLellan's network | Persona A pays $4K–$8K/yr for membership — high intent, money is real. | Cannot self-sponsor; warm intro via Drew. Sponsor the **Build a Better Agency podcast** [^3] to get inbound. |
| 4 | **Smart Agency Masterclass community** (Jason Swenk) | Podcast: 500K+ listeners across 5 years, 836+ episodes [^5]; private Slack for owners | Persona A is here. Podcast sponsorship + guest spot is the path. | Reach Jason via his podcast booking form. Sponsor episode = 4-figure CPM but ICP-pure. |
| 5 | **Agency Hackers (UK)** | 700+ paid agency-leader members on Guild; 6K+ LinkedIn followers; **typical member = 15–60 FTE, £2M–£6M revenue** [^6] | Tier-1 ICP fit for UK. Sam Burne James curates carefully. | Paid membership; events in London. Sponsor an event before pitching the community. |
| 6 | **r/agency on Reddit** | ~50K members (subreddit; verify directly) | Cheap signal: when someone posts "my client just went unprofitable, how do I prevent this?" — that's a hand-raised lead. | Free. No promotion allowed in posts. Track new threads daily with a Slack-RSS bot. DM helpful answers. |
| 7 | **ZenPilot's Agency Journey podcast + community** | 300+ episodes, Karl Sakas / Marcel Petitpas / Gray MacKenzie network [^7] | Persona B's listening list. Guest spot or paid sponsorship → direct Tier-1/Tier-2 reach. | Pitch Gray MacKenzie via the ZenPilot site for guest. |
| 8 | **AMI Build a Better Agency Summit** | 300–500 agency principals, $2,595/ticket, Denver, May | Density of buyers in one hotel. Sponsor a side-event. | Annual; book booth Q4. ROI is in the hallway, not the booth. |
| 9 | **Mirren Live** | 500–1,000 agency new-biz leaders, NYC, May | More BD-shaped than ops-shaped, but lots of founders. | Sponsor or buy a single ticket. Pre-conference outreach lifts ROI 3x. |
| 10 | **Karl Sakas's email list + LinkedIn** | 600+ agency consulting clients in 36 countries; published author | Karl's audience = exact ICP. Co-marketing collab (joint webinar, co-authored white paper) is the move. | Pitch Karl directly via LinkedIn. He responds to specifics. |
| 11 | **Parakeeto (Marcel Petitpas) audience** | Agency profitability consultancy, $1K–$5K/mo retainers; podcast + email list | Adjacent product, same ICP, same vocabulary. Possible referral partnership. | Pitch Marcel directly. Frame as "we automate what your audits surface manually." |
| 12 | **HighLevel community** | 91K members; agency-dense reseller community [^growth-doc] | Density is high; ICP fit is mixed (lots of <$500K freelancers). Filter ruthlessly. | Free; Skool-based. Daily posting required to build trust. |
| 13 | **Operators Guild** | 600+ ops execs at high-growth companies, $1.5K/yr paid | Adjacent — has some agency Heads of Ops (Persona B). | Paid; requires application + work-history review. |
| 14 | **G2 + Capterra "Productive.io alternatives" / "Scoro alternatives" listings** | Direct competitive intent | When someone reads a competitor's reviews looking for alternatives, they have urgency + budget. | Pay for "alternatives" listing placement. Track who clicks. |
| 15 | **LinkedIn Sales Navigator: "Head of Operations" + agency + 10–50 FTE + 0–18 months in role** | ~2,500–4,000 names in US/Canada | Direct line to Persona B. The "0–18 months in role" filter is the urgency mechanic. | $99/mo Sales Nav. 50 InMails / week. Pair with email via Apollo. |

**Mod Agency Insiders Facebook group** was named in the strategy doc at "15,000 members" — but the most recent verified count is from 2019 [^8]. Current count is unverified; deprioritize until a member confirms.

---

## 8. The 10 Qualifying Questions (15-Minute Discovery)

> Ask these in order. Each has a "YES" answer (qualify in) and a "NO" answer (qualify out or note the risk). At the end, you should have a Tier-1 / Tier-2 / Tier-3 / disqualify call with confidence.

| # | Question | YES = qualified | NO = disqualified / flag |
|---|---|---|---|
| 1 | "What's your current annual revenue, roughly — sub-$1M, $1–3M, $3–5M, $5–10M, $10M+?" | $1M–$8M | <$500K (out: too small); >$20M (out: too big) |
| 2 | "How many people on the team?" | 10–50 | <5 (out); >50 (Tier-3) |
| 3 | "Are you the founder/owner, or are you the COO / Head of Ops?" | Founder (Persona A) or Head of Ops with founder accessible (Persona B) | "I'm a manager and I need to get my boss's buy-in" — extend cycle by 30 days |
| 4 | "Is your billing mostly retainers, mostly projects, or a mix?" | ≥60% retainer | <40% retainer (out: wrong shape) |
| 5 | "Walk me through the tools you use to run the agency day-to-day — for CRM, project mgmt, time, invoicing." | Names ≥4 of our 10 integrations | Names Mavenlink / Workamajig / Zoho / FunctionPoint / Bonsai-only (out: integration mismatch) |
| 6 | "How do you currently see per-client profitability? Daily, weekly, monthly, quarterly, never?" | "Monthly," "quarterly," or "I pull it manually" | "We have it in real time" (probably overstated — dig); "It's in Productive and it's fine" (lower urgency) |
| 7 | "Are you currently working with a fractional COO or have you in the last 12 months?" | YES at $5K+/mo (urgent: replace them) or "I almost hired one" (urgent: prevent the hire) | "We hired a full-time COO 6 months ago" (Tier-3 risk) |
| 8 | "What's your gut on utilization across the team right now — above 70%, around 60–70%, or below 60%?" | 55–70% (clear pain) or "I don't actually know" (textbook pain) | ">75% and I can prove it" (rare; probably overstated, but if true, less urgent) |
| 9 | "Have you done a layoff in the last 12 months, or are you thinking about one?" | YES to either (acute pain) | "Never" + "growing fast" (less urgent, but still qualifies) |
| 10 | "If we showed you a 14-day trial connected to your real data, who would need to be in the room to say yes — just you, or a partner / board / spouse?" | "Just me" (1-person sale, 30-day cycle) | "Board / partners / committee" (Tier-2 or Tier-3 cycle, 60–90 days) |

**Scoring rubric.**
- **8–10 YES** → Tier-1 fit. Push for demo + trial today.
- **5–7 YES** → Tier-2 fit. Likely longer cycle; assign to nurture sequence + monthly check-in.
- **≤4 YES** → Disqualify politely. Add to "revisit in 6 months" file.

---

## Appendix — Sources

[^1]: Online Geniuses — member count varies by source (25K–45K). [Online Geniuses](https://onlinegeniuses.com/) · [LinkedIn](https://www.linkedin.com/company/online-geniuses) · [The Hive Index](https://thehiveindex.com/communities/online-geniuses/) · [Why Influence Podcast — Markovich interview (25K+ at the time)](https://whyinfluence.com/david-markovich-online-geniuses-058/)
[^2]: Fractionals United — 13,000+ members, growing ~600/month, founded by Karina Mikhli. [Fractionals United](https://www.fractionalsunited.com/) · [MicroEmpires interview](https://www.microempires.cc/p/karina-mikhli-fractionals-united) · [The Hive Index](https://thehiveindex.com/communities/fractionals-united/)
[^3]: Build a Better Agency Podcast — Drew McLellan / AMI. New episodes Wednesdays. [Agency Management Institute](https://agencymanagementinstitute.com/agency-owner-podcast/) · [Apple Podcasts](https://podcasts.apple.com/us/podcast/build-a-better-agency-podcast/id1050216800)
[^4]: AMI Build a Better Agency Summit — Denver, May; 300–500 agency principals.
[^5]: Smart Agency Masterclass — Jason Swenk. 836+ episodes; 500K+ listeners across 5 years; 42 countries. [Apple Podcasts](https://podcasts.apple.com/us/podcast/smart-agency-masterclass-with-jason-swenk-podcast-for/id870206013) · [Agency Mastery](https://www.agencymastery360.com/podcast) · [Listen Notes](https://www.listennotes.com/podcasts/smart-agency-masterclass-with-jason-swenk-eNqWnL6muGt/)
[^6]: Agency Hackers — 700+ paid members on Guild, 6,047 LinkedIn followers, typical member £2M–£6M / 15–60 FTE. [Agency Hackers](https://www.agencyhackers.com/) · [Membership](https://www.agencyhackers.com/membership/) · [Guild blog](https://guild.co/blog/agency-hackers-online-membership-community-guild/)
[^7]: ZenPilot Agency Journey Podcast — 300+ episodes, Gray MacKenzie / Karl Sakas guests. [ZenPilot](https://www.zenpilot.com/agency-journey/) · [Karl Sakas at ZenPilot](https://www.zenpilot.com/inbound-agency-journey/inbound-agency-growth-consultant-and-inbound15-speaker-karl-sakas)
[^8]: Mod Agency Insiders — last verified count ~15,000 members in a 2019 Inc. Magazine article; current count not independently verifiable. [Mod Agency Insiders](https://www.facebook.com/groups/modagencyinsiders/) · [Mod Girl Marketing](https://www.modgirlmarketing.com/facebook-group-anniversary/)

---

*End of document. Next action: turn the Tier-1 firmographic in Section 1 + the trigger scoring in Section 3 into an Apollo / Sales Nav saved-search and an outbound priority queue.*
