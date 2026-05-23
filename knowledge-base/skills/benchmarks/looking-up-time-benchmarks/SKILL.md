---
name: looking-up-time-benchmarks
description: Lookup tables for 2024-2025 agency time-waste benchmarks — manual hours per operational function by agency size, context-switching cost research (Mark, HBR, APA), and the tool-stack evolution by revenue tier. Use when the user asks "how many hours does X take", "what's the context-switching tax", "how big is the manual work problem", "what stack should an agency our size have", "when do agencies hit the automation wall", or when an agent needs to cite a defensible time figure in an audit, briefing, or COO answer.
---

# Looking Up Time Benchmarks

*Need to cite how many hours an agency wastes on manual work, what context-switching costs, or which tools a $1M agency should run? Pull from these tables — every number is sourced.*

## When this triggers

- An agent is writing an audit or briefing and needs a defensible hours-wasted figure ("client reporting eats 20-40 hrs/wk at mid-size shops")
- The user asks "how much time does X take?" / "what's normal?" / "how bad is this?"
- The COO is computing a context-switching tax and must cite Mark's 23m15s figure
- An action evaluator needs the manual-work band for a function to flag a deviation
- The user asks "what tools should we be on at our revenue?" or "are we behind on stack?"
- Anyone references the tipping point, the Frankenstack, or the Human API pattern

If the user is computing one specific client's hours leakage, use the `calculating-effective-hourly-rate` skill instead — this one is for *citing the benchmark*, not computing it.

## Available benchmarks

### Hours wasted per week on manual ops, by function and agency size

All figures are hours/week unless noted. Source for all rows: `research-05`.

| Function | Small agency | Mid-size | Large |
|---|---|---|---|
| Client reporting | 10-20 | 20-40 | 40+ |
| Lead qualification | 5-10 | 10-15 | 15-25 |
| Invoicing & billing | 5-10 | 10-20 | 20-40 |
| Project management updates | 8-15 | 15-30 | 30-50 |
| Data entry between tools | 10-20 | 20-40 | 40+ |
| Proposal generation | 5-15 | 15-25 | 25-40 |
| Content repurposing | 5-10 | 10-20 | 20-30 |
| Status meetings | 10-15 | 15-25 | 25+ |
| Leader time on internal mgmt | 10-20 | 20-30 | 30-50 |

### Client onboarding (per-client + monthly)

Source: `research-05`.

| Tier | Hours per new client | Monthly load |
|---|---|---|
| Manual baseline | 5-10 | — |
| Mid-size (10 clients/mo) | 5-10 | 25-50 |
| Large | 5-10 | 50-100 |

### Cumulative manual work + the utilization ceiling

Source: `research-05`.

| Metric | Value |
|---|---|
| Small agency total manual hrs/wk | 20-30 |
| Mid-size total manual hrs/wk | 50-100+ |
| Large total manual hrs/wk | 100+ |
| Leader time in meetings + mgmt | 69% |
| Industry billable utilization ceiling | ~50% |
| Reporting hours automation can save | 137 hrs/month (~30 hrs/wk) |
| Agencies citing billable tracking as a major pain | 48% |
| Avg tool count per agency | 5+ |

### Context-switching cost benchmarks

Source for all rows: `research-06`. The Gloria Mark numbers are the foundational citations.

| Benchmark | Value | Source |
|---|---|---|
| Time to fully regain focus after interruption | 23 min 15 sec | Mark, Gudith, Klocke (2008) CHI |
| Focus duration on a single screen (2012) | 150 sec | Mark 2015 CSCW |
| Focus duration on a single screen (current) | 47 sec | Mark 2015 CSCW |
| Decline in attention span | -69% | derived |
| App toggles per knowledge worker per day | ~1,200 | HBR |
| Weekly time lost to tool toggling | ~4 hours | HBR |
| Productive time consumed by context-switching | up to 40% | APA + Atlassian |
| Annual US economic loss from context-switching | $450B | APA + Atlassian |
| Self-organization variance on disruption cost | β = -0.346 | Mark et al. 2008 |

### Context-switching tax formula

Source: `research-06`. Use this to size the problem for any prospect.

| Formula | `tools × switches_per_day × refocus_minutes × working_days ÷ 60 = annual_hours_lost` |
|---|---|
| Worked example | 8 tools × 20 switches/day × 15 min × 250 days ÷ 60 = **10,000 hrs/yr** at a 20-person agency |
| Conservative refocus | 15 min (vs Mark's 23m15s — use 15 to avoid overclaim) |

### Agency tool-stack evolution by revenue tier

Source for all rows: `research-29`.

| Revenue tier | Tool count | Stack stage | Typical tools | Automation level |
|---|---|---|---|---|
| Under $100K | 4-6 | Survival | Google Workspace, Canva, Trello, Mailchimp free, Calendly, Zoom | None — pure manual |
| $100K-$500K | 7-10 | First systems | ClickUp, HubSpot Starter, Stripe, Loom, Zapier free | Minimal; Excel exports |
| $500K-$2M | 10-15 | Growth | monday.com Pro, HubSpot Sales Hub, GA4, Looker, Make.com, Slack, Figma | Moderate — API + iPaaS |
| $2M+ | 12-20 | Scaled | Salesforce/HubSpot Enterprise, monday Ultimate, Amplitude, Looker, Tableau | Full — iPaaS + custom + AI |

### The operational debt tipping point

Source: `research-29`. This is the single most important threshold to cite when an agency in the $500K-$2M band asks "are we struggling more than normal?"

| Benchmark | Value |
|---|---|
| Tipping point revenue band | $500K-$1M |
| Client count where manual ops caps out | ~15 clients |
| Billable leakage at the tipping point | 20-40% |
| Turnover at the tipping point | 29% |
| Share of burnout attributed to CRM↔PM disconnects + ad-hoc Slack + Excel dashboards | 41% |
| Budget redirected to "operational debt fixes" (McKinsey) | 30% |
| Cost reduction after successful automation | 30% |
| Scale multiplier post-automation (without headcount) | 2-3x |
| Documented client capacity jump (GoHighLevel users) | 10 → 30+ clients |
| AI-tool adoption threshold | $1M+ revenue |
| Typical AI tool efficiency gain | 20-30% |

### The hidden Google Sheets tax

Source: `research-29`.

| Benchmark | Value |
|---|---|
| Agencies under $500K using Sheets as ops "hub" | Default pattern |
| Working time consumed by manual Sheets bridges | ~10% |
| Canonical "Human API" pattern | GA → Sheets → HubSpot |
| Related Human API patterns | Email → ticket copy, multi-tool approval chains |

### The 3-stage stack evolution

Source: `research-29`. Use when positioning OpsRadar against the customer's current stage.

| Stage | Pattern | Revenue band |
|---|---|---|
| 1 | Frankenstack — manual toggling between disconnected tools | < $500K |
| 2 | Unified all-in-one (GoHighLevel, Scoro) | mid-scale |
| 3 | Best-of-breed with orchestration | $2M+ |

## How to cite

When the agent uses a number from this skill, follow these patterns:

**Always pair the hours figure with the agency's size.** A raw hours number is noise. Anchor it to small / mid / large so the customer sees themselves.
> Not: "Reporting takes 20-40 hours a week."
> Yes: "At your size (mid, 12 people), reporting typically eats 20-40 hrs/wk (`research-05`) — that's 1-2 FTEs of effort never billed."

**Quote the band, not a single point.** Every figure here is a range. Show the range first, then optionally pick the relevant point.

**Cite the research ID inline.** Use the `(research-XX)` format after the figure. Audit and briefing standard.

**For context-switching: pair Mark's 23m15s with the tool count.** The 23m15s figure means nothing without the multiplier — tools × switches × refocus.
> "Mark's research at UC Irvine pegs full refocus at 23m15s after an interruption (`research-06`). With your 11-tool stack and ~20 daily toggles per person, you're losing ~10k team-hours a year."

**For the tipping point: name the band, the client count, and the consequence together.** Customers in the $500K-$1M band need to hear all three.
> "You're in the operational debt tipping band ($500K-$1M, ~15 clients — `research-29`). Without automation, agencies here see 20-40% billable leakage and 29% turnover."

**For stack benchmarks: name the customer's tier, then the tools their tier should run, then where they deviate.** Don't just list the tools — call out the gap.

**Be conservative on the refocus minutes.** When applying the context-switching formula in a live audit, default to **15 minutes**, not 23m15s. The 23 figure is for narrative ("here's the science"); 15 is for math we want to defend.

## What NOT to do

- **Do not invent a benchmark.** If the number isn't in the tables above, say so and flag for research instead of guessing.
- **Do not aggregate function hours by adding the bands.** The bands overlap across functions (a status meeting is also a reporting hour). Quote per-function, not as a sum.
- **Do not quote the 1,200-toggles figure without crediting HBR (`research-06`).** It's the most-misattributed stat in this domain — name the source.
- **Do not present the tipping point without the revenue band.** A $200K agency hearing about 20-40% billable leakage will dismiss it. The threshold matters as much as the number.
- **Do not use the US-derived hours bands for offshore teams without noting it.** Manual-work load assumes US-style staffing density; cap-out points shift offshore.
- **Do not treat the AI efficiency 20-30% figure as guaranteed for sub-$1M agencies.** That number is sourced from $1M+ adopters (`research-29`); below threshold, gains are noisier.
- **Do not omit the source.** Every figure cited in an audit or briefing must carry its `research-XX` reference so the customer can audit the audit.
- **Do not present the Frankenstack → unified → best-of-breed evolution as inevitable.** Some shops profitably stay on a unified stack at $5M+. Position it as the dominant pattern, not the only path.
