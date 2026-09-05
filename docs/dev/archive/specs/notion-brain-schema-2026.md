# OpsRadar Brain — Full Notion Schema (May 2026)

> **📦 Archived (2026-05-27)** for housekeeping (was an orphan at `docs/dev/` root). The Notion-brain schema itself **survives the 2026-05-26 pivot** — only the broker that feeds it changed (Composio → Nango; see `docs/adr/0010-nango-broker.md`) and the agent fleet writing to it is mid-rebuild. Treat the schema below as still-accurate reference; treat any agent-count / broker mentions as pre-pivot.

The customer-owned intelligence layer. Agents write here. Customers read, edit, own it forever.
If they leave — it stays in their Notion. Nothing exported. Nothing lost.

---

## Database 1: `Clients` — Master client registry

| Column | Type | Source |
|--------|------|--------|
| Client name | Title | Manual / CRM |
| Status | Select: Active / At-risk / Churned / Prospect | Agent-updated |
| Monthly retainer value | Number | Stripe |
| Contract start date | Date | DocuSign/Manual |
| Contract end / renewal date | Date | DocuSign |
| Service type | Multi-select: SEO / Paid / Social / Web / PR | Manual |
| Monthly hours budget | Number | Harvest/Manual |
| Avg hours logged/mo | Number | Harvest |
| Actual margin % | Number | Agent-calculated |
| Margin status | Select: Healthy / Warning / Critical | Agent-set |
| Payment behaviour | Select: Always on time / Sometimes late / Chronic | Agent-learned |
| Avg days to pay | Number | Stripe history |
| Scope creep incidents (6mo) | Number | ClickUp |
| Last COO review | Date | Agent-set |
| Churn risk score | Number 0–100 | Agent-calculated |
| Lifetime value | Number | Stripe total |
| Difficulty score | Number 0–10 | Agent-inferred |
| NPS score | Number | Typeform |
| Days since last contact | Number | Gmail |
| Ghost risk | Checkbox | Agent: no contact 14d+ |
| Notes | Text | Human + agent |

---

## Database 2: `Weekly KPI Snapshots` — Time-series financial history

| Column | Type | Source |
|--------|------|--------|
| Week ending | Date | — |
| MRR | Number | Stripe |
| Cash collected MTD | Number | Stripe |
| Outstanding invoices | Number | Stripe |
| Overdue invoices (30d+) | Number | Stripe |
| Total clients | Number | Agent-counted |
| Active clients | Number | Agent-counted |
| Avg margin % | Number | Agent-calculated |
| Team utilization % | Number | Harvest |
| Hours logged total | Number | Harvest |
| Billable hours % | Number | Harvest |
| New deals closed | Number | HubSpot/Pipedrive |
| Pipeline value | Number | HubSpot/Pipedrive |
| Churn this week | Number | Agent-detected |
| Net revenue change | Number | MRR delta |
| Net margin % | Number | QB/Xero |
| Gross profit | Number | QB/Xero |
| Agent summary | Text | COO one-liner |

---

## Database 3: `Projects` — Per-project delivery tracking

| Column | Type | Source |
|--------|------|--------|
| Project name | Title | ClickUp/Asana |
| Client | Relation → Clients | — |
| Status | Select: On track / At risk / Delayed / Complete | Agent-updated |
| Budget hours | Number | Harvest |
| Hours logged | Number | Harvest |
| Hours remaining | Formula | Budget - logged |
| % complete | Number | ClickUp |
| Start date | Date | ClickUp |
| Deadline | Date | ClickUp |
| Days overdue | Formula | If past deadline |
| Scope change count | Number | ClickUp |
| Scope change value | Number | Unbilled exposure |
| Assigned team | Multi-select | ClickUp |
| Profitability | Select: Profitable / Break-even / Loss | Agent |
| Last agent check | Date | — |
| Risk flag | Checkbox | Agent-set |
| Risk reason | Text | Agent-written |

---

## Database 4: `Team` — Capacity and utilization

| Column | Type | Source |
|--------|------|--------|
| Name | Title | Manual |
| Role | Select: Designer / Dev / Strategist / PM / Copywriter | Manual |
| Monthly capacity hours | Number | Manual |
| Hours logged this month | Number | Harvest |
| Utilization % | Formula | Logged / capacity |
| Utilization status | Select: Underloaded / Healthy / Overloaded | Agent-set |
| Active projects | Number | ClickUp |
| Billable rate | Number | Manual |
| Avg overtime hrs/mo | Number | Harvest |
| Burnout risk | Select: Low / Medium / High | Agent-inferred |
| After-hours Slack % | Number | Slack |
| Meetings per week | Number | Google Calendar |
| Deep work hrs/week | Number | Calendar gaps |
| PTO days remaining | Number | BambooHR/Gusto |
| Last 3mo trend | Select: Improving / Stable / Declining | Agent-set |
| Notes | Text | — |

---

## Database 5: `Sales Pipeline` — Deals and forecast

| Column | Type | Source |
|--------|------|--------|
| Deal name | Title | HubSpot/Pipedrive |
| Company | Text | — |
| Stage | Select: Lead / Qualified / Proposal / Negotiation / Won / Lost | CRM |
| Deal value (MRR) | Number | CRM |
| Close probability % | Number | Agent-estimated |
| Expected close date | Date | CRM |
| Days in current stage | Formula | Velocity signal |
| Lead source | Select: Referral / Cold / Inbound / Partner | CRM |
| Service type | Multi-select | CRM |
| Next action | Text | Agent-suggested |
| Last activity | Date | CRM |
| Stale flag | Checkbox | Agent: no activity 7d+ |

---

## Database 6: `Invoice Tracker` — Cash flow detail

| Column | Type | Source |
|--------|------|--------|
| Invoice ID | Title | Stripe |
| Client | Relation → Clients | — |
| Amount | Number | Stripe |
| Issue date | Date | Stripe |
| Due date | Date | Stripe |
| Status | Select: Draft / Sent / Paid / Overdue / Written-off | Stripe |
| Days overdue | Formula | If unpaid past due |
| Follow-up count | Number | Collections agent |
| Last follow-up | Date | Collections agent |
| Paid date | Date | Stripe |
| Collections agent action | Text | What agent did |

---

## Database 7: `Real P&L` — Actual profitability

| Column | Type | Source |
|--------|------|--------|
| Month | Date | — |
| Total revenue | Number | Stripe + QB |
| Total expenses | Number | QuickBooks/Xero |
| Payroll cost | Number | Gusto/Deel |
| Contractor payments | Number | Deel |
| Software costs | Number | QB categories |
| Office/overhead | Number | QB |
| Gross profit | Formula | Revenue - expenses |
| Gross margin % | Formula | — |
| Net profit | Number | After all costs |
| Net margin % | Formula | — |
| vs last month | Formula | Delta |
| vs target | Formula | Budget variance |
| Agent summary | Text | COO read |

---

## Database 8: `Marketing Performance` — Growth channels

| Column | Type | Source |
|--------|------|--------|
| Week | Date | — |
| Website sessions | Number | Google Analytics |
| Leads generated | Number | GA + HubSpot |
| Lead-to-client conversion % | Formula | — |
| Google Ads spend | Number | Google Ads |
| Google Ads ROAS | Number | Google Ads |
| Meta Ads spend | Number | Facebook Ads |
| Meta Ads ROAS | Number | Facebook Ads |
| LinkedIn impressions | Number | LinkedIn |
| SEO ranking keywords | Number | SEMrush/Ahrefs |
| Organic traffic | Number | GA |
| Cost per lead | Formula | Total spend / leads |
| Best performing channel | Select | Agent-calculated |

---

## Database 9: `Client Communication Health` — Relationship signals

| Column | Type | Source |
|--------|------|--------|
| Client | Relation → Clients | — |
| Avg email response time (hrs) | Number | Gmail |
| Emails sent this month | Number | Gmail |
| Emails received this month | Number | Gmail |
| Last communication date | Date | Gmail |
| Days since last contact | Formula | Churn signal |
| Slack messages this month | Number | Slack |
| Meetings held this month | Number | Zoom/Calendly |
| Meeting sentiment | Select: Positive / Neutral / Negative | Agent-inferred |
| Communication trend | Select: Increasing / Stable / Dropping | Agent-set |
| Ghost risk | Checkbox | No contact 14d+ |

---

## Database 10: `Team Communication & Culture`

| Column | Type | Source |
|--------|------|--------|
| Team member | Relation → Team | — |
| Slack messages sent/week | Number | Slack |
| After-hours messages % | Number | Burnout signal |
| Meetings per week | Number | Google Calendar |
| Deep work blocks/week | Number | Calendar gaps |
| Response time avg (hrs) | Number | Slack |
| PTO days used | Number | BambooHR |
| PTO days remaining | Number | BambooHR |
| Sentiment trend | Select: Positive / Neutral / Declining | Agent |
| Overload signals | Checkbox | Agent-flagged |

---

## Database 11: `Customer Support & Satisfaction`

| Column | Type | Source |
|--------|------|--------|
| Client | Relation → Clients | — |
| Open tickets | Number | Intercom/Zendesk |
| Avg ticket resolution (hrs) | Number | Intercom |
| NPS score | Number | Typeform |
| NPS category | Select: Promoter / Passive / Detractor | — |
| Last NPS date | Date | — |
| Complaints this month | Number | Intercom |
| Escalations this month | Number | Churn signal |
| Satisfaction trend | Select: Improving / Stable / Declining | Agent |

---

## Database 12: `Contracts & Legal`

| Column | Type | Source |
|--------|------|--------|
| Client | Relation → Clients | — |
| Contract status | Select: Active / Expiring / Expired / Unsigned | DocuSign |
| Contract value | Number | DocuSign |
| Contract end date | Date | DocuSign |
| Days to renewal | Formula | Churn prevention |
| Auto-renewal | Checkbox | — |
| SOW status | Select: Signed / Pending / Expired | — |
| NDA signed | Checkbox | — |
| Renewal risk | Select: Low / Medium / High | Agent |
| Agent recommendation | Text | What COO suggests |

---

## Database 13: `Tool Stack & Software Costs`

| Column | Type | Source |
|--------|------|--------|
| Tool name | Title | Manual |
| Category | Select: PM / CRM / Finance / Comms / Design / Dev | — |
| Monthly cost | Number | QB/Manual |
| Active users | Number | Manual |
| Last used | Date | Waste signal |
| Utilization % | Number | Seats used / paid |
| Is redundant | Checkbox | Agent-flagged |
| Replacement candidate | Text | Agent suggestion |
| Annual waste | Formula | Low util × annual cost |

---

## Database 14: `Meeting Load` — Google Calendar

| Column | Type | Source |
|--------|------|--------|
| Week | Date | — |
| Team member | Relation → Team | — |
| Total meetings | Number | Google Calendar |
| Client meetings | Number | — |
| Internal meetings | Number | — |
| Meeting hours total | Number | — |
| Deep work hours | Number | Calendar gaps |
| Meeting load % | Formula | Meeting hrs / work hrs |
| Back-to-back count | Number | Burnout signal |
| Agent flag | Checkbox | Over 50% in meetings |

---

## Database 15: `Recruiting & Capacity Planning`

| Column | Type | Source |
|--------|------|--------|
| Role | Title | — |
| Status | Select: Open / Interviewing / Filled / On hold | — |
| Urgency | Select: Immediate / This quarter / Future | — |
| Why needed | Text | Utilization trigger |
| Monthly cost | Number | — |
| Open since | Date | — |
| LinkedIn applicants | Number | LinkedIn |
| Interviews scheduled | Number | Calendly |

---

## Database 16: `Growth & Referrals`

| Column | Type | Source |
|--------|------|--------|
| Month | Date | — |
| Referrals received | Number | CRM |
| Referral source | Text | CRM |
| Referrals converted | Number | — |
| Referral revenue | Number | — |
| Inbound leads | Number | GA + HubSpot |
| Outbound leads | Number | Apollo |
| Best referrer | Relation → Clients | Agent-identified |
| Word of mouth score | Formula | Referrals / total new |

---

## Database 17: `Pattern Cards` — What agents learned

| Column | Type | Source |
|--------|------|--------|
| Pattern title | Title | Agent |
| Category | Select: Revenue / Delivery / Client / Team / Sales / Growth | Agent |
| Description | Text | Agent-written |
| First observed | Date | Agent |
| Confidence | Number 0–100 | Agent |
| Affected entity | Relation | Client/project/person |
| Status | Select: Active / Watching / Resolved | Agent |
| Recommended action | Text | COO suggestion |
| Times confirmed | Number | Data points count |

---

## Database 18: `Risk Register` — Live threats

| Column | Type | Source |
|--------|------|--------|
| Risk title | Title | Agent |
| Type | Select: Revenue / Delivery / Team / Client / Cash flow / Legal | Agent |
| Severity | Select: Low / Medium / High / Critical | Agent |
| Description | Text | Agent |
| Financial exposure | Number | Agent-estimated |
| Date flagged | Date | Agent |
| Status | Select: Open / Mitigating / Resolved | — |
| Deadline to act | Date | Agent |
| Agent recommendation | Text | COO suggests |
| Owner | Text | Who handles it |

---

## Database 19: `Agent Action Log` — Full audit trail

| Column | Type | Source |
|--------|------|--------|
| Action | Title | Agent |
| Agent | Select: Revenue / Collections / Scope / Delivery / Briefing / COO | — |
| Date | Date | — |
| Trigger | Text | What caused it |
| Action taken | Text | What it did |
| Outcome | Select: Resolved / Pending / Escalated / No action | — |
| Value recovered / saved | Number | ROI tracking |
| Human override | Checkbox | Owner changed it |
| Override reason | Text | Why owner disagreed |

---

## Database 20: `Weekly Briefings` — COO summaries over time

| Column | Type | Source |
|--------|------|--------|
| Week | Date | — |
| Headline | Text | One-sentence state |
| Revenue status | Text | Agent |
| Top risk this week | Text | Agent |
| Top win this week | Text | Agent |
| Agent actions this week | Number | From action log |
| Full briefing | Text | Full Monday summary |
| Owner read it | Checkbox | Engagement signal |

---

## Integration Sources Map

| Tool | Databases it feeds |
|------|-------------------|
| Stripe | Clients, KPI Snapshots, Invoice Tracker, P&L |
| HubSpot / Pipedrive | Sales Pipeline, Clients, Growth |
| ClickUp / Asana / Jira | Projects, Team |
| Harvest / Toggl | Projects, Team, Clients, KPI Snapshots |
| QuickBooks / Xero | P&L, Tool Stack |
| Gmail | Client Communication Health |
| Slack | Team Culture, Client Communication |
| Google Calendar | Meeting Load, Team |
| Google Analytics | Marketing Performance |
| Google Ads / Meta Ads | Marketing Performance |
| Zoom / Calendly | Client Communication, Meeting Load |
| Intercom / Zendesk | Support & Satisfaction |
| Typeform | Support & Satisfaction, Clients |
| DocuSign / PandaDoc | Contracts & Legal |
| BambooHR / Gusto / Deel | Team, P&L |
| Apollo | Sales Pipeline, Growth |
| LinkedIn | Recruiting, Marketing |
| Composio (500+ more) | Any table, extensible |
