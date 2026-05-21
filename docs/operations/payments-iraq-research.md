# Payment Infrastructure Research — Iraq/Kurdistan Founder
_Last updated: 2026-05-21_

## Bottom Line Up Front

**Stripe Atlas does NOT work for Iraqi founders.** Iraq is on a US sanctions list that causes Stripe to reject Atlas applications. This is a hard block, not a workaround situation.

> **CRITICAL UPDATE — MAY 2026:** Mercury Bank also **prohibits Iraqi founders**. Iraq is explicitly listed on Mercury's "Prohibited countries" support article alongside Iran, Syria, North Korea, Cuba, Belarus, and others. Mercury "does not open accounts for companies whose founders and directors reside in [Iraq]." Mercury expanded this list in 2024 (Ukraine, Nigeria, Pakistan, Croatia, Philippines added per founder Immad Akhund's announcement) and the policy has tightened further through 2026. **Do not waste time applying.** Use Wise Business or Relay (see updated bank table below) for the US bank account leg of the stack. Source: [Mercury Prohibited Countries](https://support.mercury.com/hc/en-us/articles/28771710754580-Prohibited-countries) · [Immad on the 2024 expansion](https://x.com/immad/status/1816120939438039220)

There is still a clean path: **form a US LLC via a third-party service** (not Stripe Atlas), get a US EIN, open a **Wise Business or Relay** account (not Mercury), then register for Stripe using the US LLC. Iraqi founders have done this successfully in 2026.

---

## Stripe Atlas — Verdict: ❌ Does NOT Work

- Stripe Atlas is **not available in Iraq**
- At least one Iraqi founder confirmed their application was rejected because Iraq is sanctioned by the US
- This is not a fixable situation — it is a hard block at Stripe's compliance layer
- **Do not attempt Stripe Atlas from Iraq**

Source: https://persuasion-nation.com/is-stripe-available-in-iraq/

---

## The Correct Path: US LLC (Without Stripe Atlas)

You can still get a US LLC, US bank account, and Stripe — just not through Stripe Atlas. Use a third-party formation service instead.

### Step 1 — Form a US LLC

**Refreshed May 2026 pricing** (sources: [Northwest pricing](https://llcstarters.com/how-to-start-an-llc/reviews/northwest-registered-agent/cost/) · [Atlas vs Firstbase vs Doola 3-year cost](https://www.globalsolo.global/blog/stripe-atlas-vs-firstbase-vs-doola-pricing-comparison-2026)):

| Service | Year-1 cost (Wyoming) | 3-year total | Notes |
|---|---|---|---|
| **Northwest Registered Agent** | **$139** ($39 service + $100 WY filing) | **$389** ($125/yr renewal yr 2+) | Cheapest. Includes registered agent yr 1. Best for non-residents on a budget. |
| **Doola Starter** | **$397** ($297 + $100 WY filing) | **$894** | $297/yr renewal. Better UX. Includes EIN + RA. |
| **Firstbase** | **$399 base** (plus tax filing $899/yr add-on) | **$1,447** (3-yr non-resident package) | Used to integrate Mercury — that pairing is dead for Iraq. Still solid for the LLC + Wise stack. |
| ~~Stripe Atlas~~ | ~~$500 + $300/yr DE tax~~ | ~~~$4,400 over 3 yrs~~ | ~~BLOCKED for Iraq~~ + Delaware franchise tax burden if applying |

**Recommended state: Wyoming** (not Delaware)
- Wyoming LLC: $0 annual franchise tax (Delaware charges $300/yr)
- WY annual report: $60/yr (calculated on in-state assets — usually the $60 minimum for non-resident SaaS)
- Same credibility for banking and Stripe
- Better privacy than Delaware

**IRS Form 5472 warning (NEW for this doc):** Every foreign-owned US LLC must file IRS Form 5472 annually. Non-filing penalty is **$25,000/year** and the IRS enforces it aggressively. Doola's Total Compliance and Firstbase's tax add-on cover this; Northwest does not — you'd file via an accountant (~$300–$600/yr). Source: [Stripe Atlas vs Doola for non-US founders](https://www.theamericanllc.com/blog/stripe-atlas-vs-doola-which-is-better-for-non-us-founders).

### Step 2 — Get a US EIN

- The formation service does this for you (usually included)
- For non-US residents it can take 4-6 weeks if done directly with IRS
- With a service: 1-2 weeks
- EIN is your US tax ID — required for banking

### Step 3 — Open a US Bank Account (NOT Mercury — see warning above)

**Updated May 2026 — Mercury is a confirmed dead end for Iraqi founders.** Iraq is on the prohibited countries list with no workaround. Even if a Mercury account were somehow opened, it would be closed on KYC review and funds frozen. Skip Mercury entirely.

**Refreshed ranked options for Iraq-resident founders with a US LLC:**

| Provider | Open-rate for Iraq-residence | One-time fee | Monthly | What you get |
|---|---|---|---|---|
| **Wise Business** | **High** — easiest approval, accepts most non-US residents | **$31 one-time** (US account details unlock) | $0 | US ACH + routing/account number, multi-currency holding (50+), GBP/EUR account details. Note: Wise is an EMI (Electronic Money Institution), not a chartered US bank — works for receiving Stripe payouts. |
| **Relay** | **Medium** — accepts many non-US founders but flags restricted-country passport-holders on case-by-case. Worth trying with the US LLC. | $0 | $0 (free tier) | Up to 20 sub-accounts, 50 debit cards, real FDIC-insured US bank (Thread Bank). Closest free-tier Mercury replacement. |
| **Brex** | **Low** — tightened criteria 2023–2024; rejects most pre-revenue or sub-$50K-ARR LLCs. Skip until OpsRadar passes $100K ARR. | $0 | $0 | Corporate card + cash account; better suited for funded startups. |
| **Bluevine** | **Low–medium** — typically requires US SSN of an owner; works only if a US co-founder is on the LLC. | $0 | $0 | High-yield checking, business loans. |
| **Airwallex** | **Medium** — global EMI, accepts most non-US founders with a US LLC | $0 | $0 (Explore tier) | US, GBP, EUR, AUD, HKD, SGD account details; built for cross-border SaaS. |

**Recommended Iraq-founder stack as of May 2026:** Wise Business (primary, for Stripe payouts) + Relay (secondary, for ACH bill-pay and US debit card if Iraqi-passport KYC clears).

Sources: [Mercury alternatives ranked 2026](https://ramp.com/blog/top-mercury-alternatives) · [Mercury/Relay/Brex non-US founder guide](https://nomad-labs.com/2026/03/23/mercury-relay-brex-us-business-banking-abroad/) · [Wise Business pricing 2026](https://payfeecalculator.com/blog/wise-business-account-fees-2026) · [LLCU non-resident bank guide 2026](https://www.llcuniversity.com/foreigners/open-us-bank-account-llc-non-resident/)

### Step 4 — Register Stripe Under the US LLC

- Sign up at stripe.com using your US LLC's details
- Business address = your US registered agent's address
- Bank account = Mercury or Wise US account
- You are now a US business with full Stripe access
- Your personal location (Iraq/Kurdistan) is irrelevant — the legal entity is US-based

---

## What This Unlocks

Once you have the US LLC + **Wise (or Relay)** + Stripe:

- ✅ Full Stripe access (payments, subscriptions, webhooks)
- ✅ Automated billing for OpsRadar plans
- ⚠️ Stripe Connect — *re-confirmed blocked for Iraq even via US LLC per [/project_stripe_country_unsupported.md/]; do not promise it on the roadmap*
- ✅ PayPal Business (US entity)
- ✅ Paddle, Lemon Squeezy, Polar — all merchant-of-record options below
- ✅ US banking (ACH via Relay; receive USD via Wise)
- ✅ Ability to invoice US/EU customers professionally

### Merchant-of-Record alternatives to Stripe (if Stripe Connect ever becomes a blocker)

Refreshed May 2026 pricing — Merchant-of-Record (MoR) providers handle global sales tax, VAT, and chargebacks for you. Useful as a fallback if Stripe ever closes the account on Iraq-residence review.

| Provider | Pricing | What it covers | Notes |
|---|---|---|---|
| **Paddle** | **5% + $0.50/txn** | Global VAT/sales tax handling, the most jurisdictions | Most mature MoR; recommended for B2B SaaS |
| **Lemon Squeezy** | **5% + $0.50/txn** | Same as Paddle | Acquired by Stripe in 2024 — still operates as standalone MoR |
| **Polar** | **4% + $0.40/txn** | Developer-tools focused, GitHub-native | Cheapest MoR option |
| **Creem** | **3.9% + $0.40/txn** + free SEPA payouts | EU-focused, free SEPA | Newest player, cheapest headline rate |

Source: [Stripe vs Paddle vs Lemon Squeezy vs Polar MoR 2026](https://fintechspecs.com/blog/stripe-vs-paddle-vs-lemon-squeezy-vs-polar-merchant-of-record-b2b-saas/) · [Polar vs Lemon Squeezy vs Creem 2026](https://devtoolpicks.com/blog/polar-vs-lemon-squeezy-vs-creem-2026)

### Hiring & contractor payment infrastructure (NEW for May 2026)

When OpsRadar needs to hire its first US/EU contractor or employee, the cheapest 2026 options:

| Service | Contractor/mo | EOR Employee/mo | Notes |
|---|---|---|---|
| **Deel** | **$49/contractor** | **$599/employee** (Standard); $899 Enterprise | 150+ countries; in-house payroll engine; best for mixed contractor + employee teams |
| **OysterHR** | **$29/contractor** (after 30-day trial) | **$699/employee** | 120+ owned + partner countries; strict labor-law compliance focus |
| **Native Teams / Gloroots** | $19–$25/contractor | $500–$650/employee | Cheaper EOR alternatives worth checking once revenue justifies |

Source: [Deel vs Oyster 2026 pricing](https://www.deel.com/blog/deel-vs-oyster-hr-honest-employer-of-record-service-comparison/) · [Deel pricing 2026](https://www.gloroots.com/blog/deel-pricing)

**Recommendation for OpsRadar first 10 hires:** Stay on Deel Contractor ($49/mo each) until headcount > 5; then evaluate EOR vs forming a UK/EU subsidiary for full-timers.

---

## Total Cost Breakdown (REFRESHED MAY 2026)

| Item | One-time | Annual |
|---|---|---|
| LLC formation (Northwest, cheapest path) | $39 | — |
| Wyoming state filing fee | $100 | $60/yr (annual report) |
| Registered agent | included yr 1 | $125/yr (Northwest) |
| EIN | included with formation service | — |
| **Wise Business** | $31 (US details unlock) | $0 (no monthly) |
| Stripe | $0 | $0 |
| IRS Form 5472 filing (required for foreign-owned LLC) | $0 | ~$400/yr (accountant) |
| **Total** | **~$170** | **~$585/yr** |

Compared to Stripe Atlas (if it worked): $500 upfront + Delaware $300/yr tax + Atlas's $100/yr registered agent + $400/yr 5472 filing = **$3-year cost ~$4,400 vs Wyoming path ~$1,755**. The Wyoming path saves ~$2,600 over 3 years even before the Iraq sanctions block makes Atlas a non-option.

Source: [Atlas vs Firstbase vs Doola 3-year cost analysis 2026](https://www.globalsolo.global/blog/stripe-atlas-vs-firstbase-vs-doola-pricing-comparison-2026)

---

## Immediate Receiving Options (While LLC Is Being Formed)

The LLC takes 1-2 weeks. In the meantime (refreshed May 2026):

| Option | Setup | Fee | Best for |
|---|---|---|---|
| **Payoneer** | Instant | **2% conversion fee + $1 minimum**; **$29.95** annual inactivity fee after 12 mo dormancy; lower fees negotiable above $1K/mo MRR | Invoicing first customers; widely used in Iraq |
| **USDT (TRC-20)** | Instant | ~$1 network fee | Crypto-comfortable customers |
| **Request.Finance** | 1 day | 0.1–1% | Professional crypto invoices |
| **SWIFT bank transfer** | Instant | $25–$50 + intermediary fees | B2B customers comfortable with wire |
| **Wise Personal → Iraqi bank** | 1–3 days | 0.4–0.6% | Convert before LLC closes; deposits to local IQD/USD account |

**Payoneer caveats for Iraq (refreshed May 2026):**
- Payoneer does **not** support direct withdrawals to Iraqi bank accounts. Use the Payoneer debit card (free issuance; pay shipping via DHL) for spend, or transfer to a regional account.
- 2% conversion fee applies on every USD→IQD or USD→EUR conversion. At $3K/mo MRR that's $60/mo in fees alone — switch to Stripe + Wise as soon as the LLC is live.

For first 5–10 customers at $750–$3,000/mo, Payoneer invoicing + manual `set-plan` call is completely fine. Don't delay onboarding while waiting for the LLC.

Source: [Payoneer fees 2026](https://www.payoneer.com/about/pricing/) · [How to Get Paid Online in Iraq 2026](https://talent.krd/posts/how-to-get-paid-online-iraq) · [Iraqi freelancer payment guide](https://iraqtech.io/how-to-get-paid-as-an-online-freelancer-in-iraq/)

---

## Action Plan (UPDATED MAY 2026)

1. **Today:** Use Payoneer for any immediate customers (accept the 2% conversion fee on first 5–10 customers — it's noise relative to MRR)
2. **This week:** Register Wyoming LLC via **Northwest ($139 total)** or Doola ($397 total). Skip Stripe Atlas (Iraq-blocked) and skip Firstbase's Mercury bundle (Mercury-blocked).
3. **Week 2–3:** EIN arrives (1–2 weeks via Northwest/Doola, 4–6 weeks if you file IRS Form SS-4 yourself). Apply for **Wise Business** ($31) and **Relay** (free) in parallel.
4. **Week 3–4:** Register Stripe under the US LLC. Use Wise as the payout bank account.
5. **After Stripe:** Build Stripe webhook → automated `set-plan` in OpsRadar.
6. **Year 1 close:** File IRS Form 5472 (foreign-owned LLC requirement). Use Doola's tax module ($299/yr) or hire a US CPA familiar with foreign-owned LLCs (~$400/yr). **Missing this filing = $25,000 IRS penalty.**

---

## Sources

**Sanctions / country blocks**
- [Is Stripe Available in Iraq?](https://persuasion-nation.com/is-stripe-available-in-iraq/)
- [Mercury Prohibited Countries (Iraq listed)](https://support.mercury.com/hc/en-us/articles/28771710754580-Prohibited-countries)
- [Mercury 2024 prohibited-list expansion announcement](https://x.com/immad/status/1816120939438039220)
- [Hacker News discussion of Mercury non-US founder closures](https://news.ycombinator.com/item?id=47224410)
- [Restricted countries for US bank accounts 2026](https://www.entity.inc/blog/restricted-countries-us-bank-account/)

**LLC formation pricing (May 2026)**
- [Stripe Atlas vs Firstbase vs Doola Pricing 2026](https://www.globalsolo.global/blog/stripe-atlas-vs-firstbase-vs-doola-pricing-comparison-2026)
- [Northwest Registered Agent pricing 2026](https://llcstarters.com/how-to-start-an-llc/reviews/northwest-registered-agent/cost/)
- [Wyoming LLC comparison 2026: Doola vs Firstbase vs Atlas](https://wyomingllc.co/tools/wyoming-llc-comparison/)
- [LLCU non-resident US bank account guide 2026](https://www.llcuniversity.com/foreigners/open-us-bank-account-llc-non-resident/)
- [Stripe Atlas vs Doola for non-US founders (Form 5472 risk)](https://www.theamericanllc.com/blog/stripe-atlas-vs-doola-which-is-better-for-non-us-founders)

**US banking alternatives to Mercury (2026)**
- [Mercury / Relay / Brex comparison for foreign founders](https://nomad-labs.com/2026/03/23/mercury-relay-brex-us-business-banking-abroad/)
- [Top Mercury alternatives ranked 2026](https://ramp.com/blog/top-mercury-alternatives)
- [Mercury alternatives by Rho](https://www.rho.co/blog/mercury-alternatives)
- [Wise Business fees 2026 complete guide](https://payfeecalculator.com/blog/wise-business-account-fees-2026)
- [Wise Business pricing official](https://wise.com/help/articles/2977969/fees-for-using-wise-business)
- [Airwallex business bank comparison May 2026](https://www.airwallex.com/us/blog/compare-business-bank-accounts)

**Payoneer / immediate-receive options for Iraq**
- [Payoneer pricing official](https://www.payoneer.com/about/pricing/)
- [How to Get Paid Online in Iraq 2026](https://talent.krd/posts/how-to-get-paid-online-iraq)
- [Iraqi freelancer payment guide 2026](https://iraqtech.io/how-to-get-paid-as-an-online-freelancer-in-iraq/)

**Merchant-of-Record alternatives to Stripe (2026)**
- [Stripe vs Paddle vs Lemon Squeezy vs Polar for B2B SaaS](https://fintechspecs.com/blog/stripe-vs-paddle-vs-lemon-squeezy-vs-polar-merchant-of-record-b2b-saas/)
- [Lemon Squeezy vs Polar vs Paddle MoR Comparison 2026](https://www.buildmvpfast.com/blog/lemon-squeezy-vs-polar-paddle-merchant-of-record-2026)
- [Polar vs Lemon Squeezy vs Creem 2026 indie hackers](https://devtoolpicks.com/blog/polar-vs-lemon-squeezy-vs-creem-2026)
- [Stripe alternatives 12 real options 2026](https://www.betterlaunch.co/blog/stripe-alternatives)

**EOR / contractor pricing for first hires (2026)**
- [Deel vs Oyster HR pricing comparison 2026](https://www.deel.com/blog/deel-vs-oyster-hr-honest-employer-of-record-service-comparison/)
- [Deel pricing 2026 breakdown](https://www.gloroots.com/blog/deel-pricing)
- [Oyster EOR review 2026](https://employborderless.com/review/oyster/)

**Reference / context**
- [Stripe Atlas Documentation](https://docs.stripe.com/atlas)
- [Top Stripe Atlas Alternatives 2025](https://www.globalgo.fast/blog/stripe-atlas-alternatives)
- [How to Use Stripe in Unsupported Countries](https://mazinooyolo.com/blog/how-to-use-stripe-in-unsupported-countries/)
