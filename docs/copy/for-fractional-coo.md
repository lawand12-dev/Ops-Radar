# /for/fractional-coo — Multi-tenant leverage page doctrine

*Owner: Lawand · Date: 2026-05-26 · NEW page (Inversion 3 verdict)*
*Route: `/for/fractional-coo`*
*Source: `docs/positioning/inversions.md` §"Inversion 3 — Wrong buyer?"*
*Audience: Fractional COOs running 5-10 agency clients each.*
*Pricing tier targeted: Fractional Operator ($2,999/mo, unlimited clients).*

---

## Why this page exists

Per `docs/research/2026-05-26-inversion-3-wrong-buyer.md`: of 10 candidate higher-ACV buyer segments tested, **fractional COOs running 5-10 clients each are the only segment where the Iraq-founder constraint is a non-issue** (they're remote-first solo operators; Loom-demo motion works) AND they're **5-10× leveraged buyers** (each one multiplies the agencies onboarded per outbound touch).

Probability of $10M ARR in 18 months: **~15-20% with fractional-COO leverage layer** vs **~10-12% agencies-only**.

This page is the front door for that motion.

---

## Meta

- **Title (60 chars):** `OpsRadar for Fractional COOs — multi-tenant workspace`
- **Description (155 chars):** `Run all your client agencies from one workspace. White-label, multi-tenant, 100K actions pooled across clients. $2,999/mo for unlimited clients.`
- **OG title:** `Run all your client agencies from one workspace.`
- **OG description:** `Fractional COOs use OpsRadar as the operating system for their entire client portfolio. White-label, multi-tenant, $2,999/mo unlimited clients.`

---

## Hero

**Eyebrow (small caps, small green dot):**
`FOR FRACTIONAL COOS · MULTI-TENANT WORKSPACE`

**H1:**
`Run all your client agencies from one workspace.`

**Subhead (38 words):**
`If you're running 5-10 agency clients on a $5-15K/mo retainer each, OpsRadar runs as your operating system across all of them. White-label your brand. Aggregate dashboard. Per-client brain. One workspace, your business.`

**Primary CTA:** `See the Fractional Operator workspace — 20 min with the founder`
**Secondary CTA:** `Start free trial`

**Trust microcopy under CTAs:**
`White-label · Multi-tenant · Per-client brain stays in their Notion · 14-day free trial`

---

## Section 1 — The math

**Section eyebrow:** `THE LEVERAGE`

**Section H2:** `Six clients × the same workspace = 6× the work, 1× the cost.`

**Section body (62 words):**
`A fractional COO running 6 agency clients at $8K/mo each is billing $48K/mo. Today most of you are doing it across 6 separate Notion workspaces + 6 separate dashboards + the same 10 AI tools per client ($5,200/mo × 6 = $31,200 in AI spend). OpsRadar at $2,999/mo replaces all of it. Your margin: $45K/mo on $48K/mo billed.`

**The math table:**

| Today (6 clients, scattered) | With OpsRadar Fractional Operator |
|---|---|
| 6 client Notion workspaces | 1 multi-tenant workspace, per-client view |
| 6 sets of AI tool subscriptions (~$31K/mo) | $2,999/mo flat |
| Manual context-switching across 6 dashboards | One aggregate dashboard, client-switcher built in |
| Inconsistent SOPs per client | One playbook engine, customized per client brain |
| You're the bottleneck on every approval | Earned-autonomy per client: agents graduate based on the client's data |

---

## Section 2 — What's in the Fractional Operator tier

**Section eyebrow:** `WHAT'S INCLUDED`

**Section H2:** `Everything in Pro × N clients. Pooled across the org.`

**Receipt bullets:**

- **Unlimited clients** in your FO org (no per-client license fee)
- **White-label branding** — your logo, your color, your domain (e.g. `clients.yourname.com`)
- **100,000 approved actions/mo pooled across all clients** — flexible across portfolio (one busy client doesn't burn another's cap)
- **Per-client brain in their Notion workspace** — each client owns their own brain. You see the aggregate. Client cancellation = client keeps their brain.
- **Multi-client aggregate dashboard at /dashboard/fo** — MRR across portfolio, per-client margin, per-client utilization, scope creep flags ranked across all clients
- **Client switcher built into every surface** — every page in the dashboard has a client dropdown; switching is instant
- **Per-client audit log + margin reporting** — for the quarterly review with each client
- **All 28 named built-in agents per client** — Riley, Cole, Scott, etc. running independently for each agency's data
- **Custom employee hiring per client** — describe a role once, apply across clients with one click
- **Org-chart delegation** (CP-37) — your custom AI employees can have managers + direct reports across clients
- **Everything in Pro** (priority models, webhook outbox, brain provisioning, etc.)

**Outcome meter (opt-in):** `$0.05 per approved action over 100,000/mo pooled.`

---

## Section 3 — How the multi-tenancy actually works

**Section eyebrow:** `HOW IT WORKS UNDER THE HOOD`

**Section H2:** `Per-client OAuth. Per-client brain. One operator dashboard above all of them.`

**Section body (84 words):**
`Each client you onboard gets their own OAuth connections (their Stripe, their HubSpot, their ClickUp). A dedicated OAuth broker handles every credential — you never see the API keys, and they never touch our servers. Each client gets their own company brain mirrored to their own Notion workspace. The 28 built-in agents run independently per client. If you add a custom AI employee (say, a "Bookkeeper named Sarah") you can deploy her to one client or to all six — your call. You see everything from /dashboard/fo, but each client only ever sees their own data.`

**The trust story:**

- **Client data isolation is RLS-enforced** — every Postgres row is scoped to the client's user_id. We can't accidentally leak data across clients.
- **Each client's brain is theirs** — you can fire OpsRadar as the fractional COO and the client keeps every Pattern Card, Decision Log, Risk Register entry in their Notion. The relationship between you and the client is independent of the relationship between you and us.
- **White-label means white-label** — your client sees your brand on the dashboard, not OpsRadar's. Customer-facing CHARTER.md per agent reads your brand voice (configurable per FO org).

---

## Section 4 — Who this is built for

**Section eyebrow:** `THE FRACTIONAL OPERATOR ICP`

**Section H2:** `You're running 5-10 agency clients on retainer.`

**Section body (44 words):**
`If you bill 5-10 agency clients at $5-15K/mo each on a fractional-COO retainer, OpsRadar is built for you. If you're managing 1-2 clients, start with the Pro tier ($1,499/mo) and graduate. If you're managing 20+ clients, talk to the founder — let's discuss enterprise pricing.`

**Side panel — "Where to find your peers":**

- **Operators Guild** — 1,000+ remote-first fractional executives. Active community.
- **Fractionals United** — newer community, faster-moving.
- **Catalant, Toptal, BTG, Maven** — marketplace platforms where many of you originate clients.

---

## Section 5 — The objection block

**Section eyebrow:** `WHAT I'D WORRY ABOUT IF I WERE YOU`

**Section H2:** `Honest answers to honest questions.`

### Q: "What if my client wants to take OpsRadar over directly?"

`Their call. We support clean transitions — they can sign up under their own account, and you transfer ownership of their workspace through your /dashboard/fo settings. We don't charge them a startup fee or hold their data. The brain they built with you stays in their Notion.`

### Q: "How do I demo this to a client without revealing your name?"

`White-label is full. The dashboard renders YOUR brand, not OpsRadar's. The customer-facing brain pages in their Notion are authored by your-brand-name agents (e.g. "Sarah · [Your Agency] Bookkeeper"). The only OpsRadar reference your clients ever see is in the legal footer (terms of service + privacy policy) — those have to point at us for compliance, but that's the only surface.`

### Q: "What if I leave a client mid-engagement?"

`Your client keeps their workspace + their brain + their OAuth connections. They can either downgrade to a self-served Pro tier ($1,499/mo) and run OpsRadar themselves, or you can transfer them to another fractional COO running an FO org. We don't hold anyone's data hostage — same principle as the agency tier.`

### Q: "I'm not technical. Is this hard to set up?"

`Onboarding a new client takes about 15 minutes: invite the client to your FO org, get them through OAuth on their tools, choose which agents to enable, set autonomy defaults. We have a 5-min Loom walking through it.`

### Q: "What about pricing for my clients — do I bake OpsRadar into my retainer or charge separately?"

`Your call. Most FOs running on OpsRadar bake it in — their retainer goes from $8K/mo to $9K/mo per client and they bill the difference as "tooling + ops infrastructure." Some pass it through as a line item. We don't have an opinion on which works better for your sales motion.`

---

## Section 6 — Why fractional COOs vs agency owners specifically

**Section eyebrow:** `WHY THIS MOTION`

**Section H2:** `You're already running an OpsRadar-shaped business.`

**Section body (62 words):**
`Fractional COOs are leverage businesses. You sell the same operational expertise across 5-10 clients — that's exactly what OpsRadar is structurally built to be. The agency-vertical wedge proves the architecture works on one client. The fractional-operator tier proves it scales across many. We didn't build this for you as an afterthought — `/dashboard/fo` shipped before we even named the wedge.`

---

## Final CTA

**H2:** `Six clients on one workspace. $2,999/mo.`
**Body:** `Open the Hire chat. Configure your first client agency. Run a Loom demo for them this week. We'll be on the call if you want.`

**Primary CTA:** `Start free trial`
**Secondary CTA:** `Talk to the founder — 20 min, no slides`

---

## Brand-voice rules for this page (delta from /for/* template)

| Use | Avoid |
|---|---|
| "Your client agencies" (plural) | "Your client" (singular — implies single-tenant) |
| "FO org" / "fractional operator" | "agency" alone (ambiguous on this page) |
| Per-client dollar math | Hand-wave value-prop |
| References to `/dashboard/fo` (real surface) | Imagined future features |

---

## What this page replaces

Nothing — it's brand new. Created from `docs/positioning/inversions.md` Inversion 3 verdict.

## What's NEW in v1

- Whole page is new. Brand has had a `Fractional Operator` tier in pricing since v2 of pricing.md but no dedicated landing page. This is the door.
