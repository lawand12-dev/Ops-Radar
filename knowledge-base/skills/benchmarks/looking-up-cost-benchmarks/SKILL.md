---
name: looking-up-cost-benchmarks
description: Lookup tables for 2024-2025 agency cost benchmarks — internal loaded hourly cost and client billing rates by role and market, revenue-per-employee floors by agency type, and the load + markup formulas. Use when the user asks "what's the benchmark for X", "loaded hourly cost", "revenue per employee", "benchmark floor", "industry average", "what should I charge", "what does a designer cost", "is my RPE good", or when an agent needs to cite a specific number in an audit, briefing, or COO answer.
---

# Looking Up Cost Benchmarks

*Need to cite a benchmark number for what an agency should charge, what they spend per employee, or what a role costs internally? Pull from these tables — every number is sourced.*

## When this triggers

- An agent is writing an audit or briefing and needs a defensible number ("loaded cost of a PM is $50-70/hr")
- The user asks "what's normal?" / "what's the benchmark?" / "is X good?"
- The COO is about to quote an internal cost or billing rate and must show the source
- An action evaluator needs a floor to compare a client's effective rate against
- The user asks about revenue per employee, utilization, or the load multiplier

If the user is computing one client's effective rate, use the `calculating-effective-hourly-rate` skill instead — this one is for *citing the benchmark*, not computing it.

## Available benchmarks

### US internal cost vs billing rate by role (loaded, 2024-2025)

All figures USD/hour. Internal cost = salary loaded with benefits + overhead. Source for all rows: `research-04`.

| Role | Internal cost ($/hr) | Billing rate ($/hr) | Notes |
|---|---|---|---|
| Virtual Assistant | $20-40 | $50-100 | Highest automation ROI potential |
| Operations Coordinator | $25-35 | $75-150 | Salary base ~$54k/yr |
| Account Manager | $40-60 | $150-250 | Salary $50-80k/yr |
| Content Creator | $40-70 | $100-200 | Projects bill $1k-2.5k/piece |
| Designer | $50-80 | $125-250 | Mid-to-senior |
| Project Manager | $50-70 | $175-300 | Salary ~$100k/yr |
| Strategist | $60-100 | $200-350 | Senior strategic roles |
| Developer | $70-120 | $200-400 | Highest internal cost |

### International internal cost benchmarks

| Market | Role | Internal cost (local) | Billing rate (local) | Source |
|---|---|---|---|---|
| UK | Digital designer (mid) | £30-50/hr | £100-200/hr | `research-04` |
| Canada | In-house developer | $30-75 USD/hr | $150-300/hr | `research-04` |
| Australia | Project Manager (mid-senior) | $35-65 USD/hr | retainer $3k-10k/mo | `research-04` |
| EU (Western) | Virtual Assistant | €20-50/hr | €50-150/hr | `research-04` |
| EU (Eastern) | Ops / VA roles | €19-35/hr | €50-150/hr | `research-04` |

### Revenue per employee by agency type (annual, USD)

Source for all rows: `research-08`. RPE is the strongest single signal of agency health.

| Agency type | Struggling | Profitable | Top performers |
|---|---|---|---|
| Marketing (US, 2025 avg = $220k, +11% YoY) | <$150k | $200-300k+ | — |
| Marketing — mid-size (50-200 staff) | — | $172k avg | — |
| Recruiting | $100-150k | $175-250k | $300k |
| Design / Creative | $100-175k | $150-200k | $250-300k |

### Revenue per employee by team size (professional services, all verticals)

Source: `research-01` (Kantata/SPI 2025 Professional Services Maturity Benchmark).

| Team size | RPE (annual) |
|---|---|
| Under 10 employees | $147,000 |
| 10-30 employees | $154,000 |
| 31-100 employees | $153,000 |

### Pricing model RPE delta

Source: `research-08`.

| Pricing model | RPE | Delta |
|---|---|---|
| Retainer-led | $220,000+ | — |
| Project-led | $150,000 | ~47% lower than retainer |

### Utilization benchmarks

Source: `research-08`.

| Tier | Billable utilization |
|---|---|
| Industry average | ~50% |
| Lean / profitable agencies | 60-70% |

### Margin baseline

Source: `research-01` (Kantata/SPI).

| Metric | Value |
|---|---|
| Professional services avg EBITDA margin | 9.5% |
| Implied operating cost ratio | ~90.5% of revenue |

### Formulas (cite when you do the math live)

| Formula | Value | Source |
|---|---|---|
| Loaded internal cost | `base salary / 2000 hrs × 1.5-2.0` | `research-04` |
| Healthy billing rate | `internal cost × 2-3` | `research-04` |
| Specialization premium | +15-25% revenue vs generalists | `research-08` |
| Automation efficiency lift | +20-30% on RPE | `research-08` |

### Time-waste benchmarks (for ROI math)

Source: `research-01`.

| Benchmark | Value |
|---|---|
| Recruiter hours/week on candidate search | 14.6 |
| Recruiter hours/week AI is expected to save | 17 |
| Time on a client report (marketing) | 15-30 min (22% under 15 min) |
| Reporting time that is non-analytical (automatable) | 68% (30% analysis + 20% explanation + 18% recs) |

## How to cite

When the agent uses a number from this skill, follow these patterns:

**Always pair the number with its comparison.** A raw number is noise. Always show the user where they sit vs the benchmark.
> Not: "PMs cost $50-70/hr internally."
> Yes: "Your PM costs $52/hr loaded — right at the middle of the US benchmark band ($50-70/hr, `research-04`)."

**Lead with the band, not a single point.** Benchmarks here are ranges. Quote the range, then optionally pick the relevant point.
> "Loaded designer cost in the US is $50-80/hr (`research-04`). At your team's seniority I'd anchor toward $70."

**Cite the research ID inline for any number that drives a recommendation.** This is the audit / briefing standard. Use the format `(research-XX)` after the figure.

**Convert markets before comparing.** When a UK or EU agency is being benchmarked against a US figure, convert with a clearly stated FX rate and note that the load multiplier differs by country tax regime.

**For RPE specifically:** always pair it with team size and pricing model — RPE of $180k means very different things for a 6-person retainer marketing shop (above struggling, below profitable) vs a 80-person project recruiting shop (above profitable).

**When applying the load multiplier:** default to 1.75x (midpoint of 1.5-2.0) unless the customer's `__how_we_work` Notion page specifies otherwise. Always state the multiplier in the output.

## What NOT to do

- **Do not invent a benchmark.** If the number isn't in the tables above, say so and offer to flag for research instead of guessing.
- **Do not quote a billing rate without naming the internal cost it implies** — the agency needs both sides to evaluate the gap.
- **Do not compare a freelancer rate to a loaded agency cost.** Freelancers don't carry agency overhead; the comparison is apples to oranges.
- **Do not use the US table for non-US markets.** Pull the international table — currency and load assumptions differ.
- **Do not present RPE without noting the agency vertical.** A $170k RPE is profitable for design and struggling for marketing.
- **Do not omit the source.** Every number cited in an audit or briefing must carry its `research-XX` reference so the customer can audit the audit.
- **Do not treat the band midpoint as a target.** The bands describe the market — the customer's own floor (from `calculating-effective-hourly-rate`) is the target.
