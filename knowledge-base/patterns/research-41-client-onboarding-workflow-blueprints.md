# The agency onboarding playbook that OpsRadar should productize

**The gap between contract signed and first deliverable is where small agencies lose 5–20 hours of busywork per client and 20%+ of them to churn within 90 days.** OpsRadar's addressable problem is not the work agencies do — it is the connective tissue between phases: access collection, intake chasing, stakeholder scheduling, kickoff prep, tag/pixel verification, status reporting, and scope-drift detection. That connective tissue is 40–60% automatable with n8n, and practitioners across five verticals use a near-identical 6-phase shape. **Build the shell once, specialize the middle by vertical, and price the playbooks $500–2K/month.**

The research below synthesizes operator-published playbooks (Thoughtbot, Basecamp Shape Up, Designjoy, Animalz, Omniscient Digital, Recruiterflow, SPP.co), vendor documentation (Leadsie, HubSpot, ALM Corp, Databox, AgencyAnalytics, ManyRequests), and benchmark data (AgencyAnalytics 2024 report, Setup Marketing Relationship Survey, SerpSculpt 2025 retention data). Practitioner and vendor sources are flagged throughout. Quantitative claims cite the underlying source; when vendor-authored efficiency numbers appear they are marked as such.

## The universal 6-phase shape

Every vertical researched converges on the same phase structure. What varies is the content of phases 4 and 5 and the duration of phases 2 and 6. This convergence is the single most important finding for product strategy: **one n8n shell handles every vertical; the specialization lives in the sub-workflows and templates bolted onto it.**

| Phase | Window | Universal purpose | Varies by vertical |
|---|---|---|---|
| 1 Handoff | Day 0–2 | Contract → internal provisioning | Trivially; same everywhere |
| 2 Intake | Day 2–7 | Data + access collection | Heavily — credentials, questions, SMEs |
| 3 Kickoff | Day 7–10 | Alignment + decisions locked | Agenda sequence |
| 4 Setup | Day 10–21 | Technical scaffolding | Most — pixels vs repos vs ATS vs Figma |
| 5 First deliverable | Day 21–30 | First client-visible output | Most — ad launch vs vertical slice vs concept |
| 6 Steady state | Day 30–60+ | Cadence + reporting + scope control | Moderately — sprint vs retainer rhythm |

**Contract-to-first-deliverable timelines by vertical (ranges, not points):**

- Marketing agency: 21–30 days (paid ads can hit 14 days if tracking was pre-built; SEO/content stretches to 35–45)
- Design agency: 21–30 days project model, same-day for Designjoy-style subscriptions
- Dev/software agency: 21–30 days to first vertical slice (Thoughtbot's public target: "working version in 4–6 weeks")
- Recruiting agency: 7–14 days for contract staffing; 21–30 days contingent tech; 21–30 days retained exec search to first shortlist
- Content agency: 21–30 days to first published article; 5–7 day cycles once in steady state

The **AgencyAnalytics 2024 Benchmarks Report** [vendor] puts average professional-services retention at 84%, with 8-figure agencies retaining ~92% vs ~78% for 7-figure agencies (Predictable Profits 2025, 300+ agencies). **Setup Marketing's 2024 Relationship Survey** found 48% of clients leave due to delivery dissatisfaction, not price — and only ~50% of agencies set clear timeline/cost/effort expectations during onboarding (State of Agency-Client Collaboration 2024). The onboarding window is the trajectory-setter: Deliberate Directions' operator data says "the first 45–90 days determine the trajectory of the entire relationship."

## Where the hours go (marketing agency time study)

The per-client cost of manual onboarding is the wedge OpsRadar sells against. SPP.co estimates **5 hours of onboarding labor per client × $50/hr = $250/client** (internal estimate, vendor). Practitioner data from r/agency threads and agency-owner Twitter consistently lands higher: 8–15 hours agency-side for a paid-media retainer setup, 2–5 hours client-side if the client is cooperative.

| Phase | Agency hours | Client hours | % automatable busywork | % human judgment |
|---|---|---|---|---|
| 1 Handoff (D0–2) | 1–2 | 0.25–0.5 | 80–95% | 5–20% |
| 2 Intake (D2–7) | 2–4 | 1–2 | 50–70% | 30–50% |
| 3 Kickoff (D7–10) | 2–3 | 1–1.5 | 30–50% | 50–70% |
| 4 Setup (D10–21) | 4–10 | 0.5–1 | 40–60% | 40–60% |
| 5 First deliverable (D21–30) | 6–15 | 0.5–1 | 10–25% | 75–90% |
| 6 Steady state (per month, D30–60) | 4–8 | 0.25–0.75 | 55–75% | 25–45% |

The shape of the opportunity is clear: **phases 1, 2, and 6 are the automation fat** — high hour counts, high busywork ratios, low judgment requirements. Phase 5 is the judgment-heavy core agencies are actually paid for. OpsRadar's pitch writes itself: automate the 60% that is connective tissue so agencies can spend every hour on the 40% that is creative/analytical judgment.

## The seven failure modes that make onboarding hurt

These appear in every practitioner source consulted, with remarkable frequency consistency across marketing, design, dev, recruiting, and content. Each is an n8n-addressable surface.

**Credential collection (60–80% of onboardings hit friction).** Practitioner consensus is unanimous: Meta Business Portfolio access, Google Ads MCC invites, GA4 Admin/Editor grants, GSC verified-user status, and GTM Publish access together produce 5–7 days of wait per client (SPP.co operator estimate). Root causes: client doesn't know who has admin; 2FA codes go to vacationing employees; Meta's Partner-vs-People distinction is genuinely confusing; Meta now requires 2FA for many business actions which breaks shared logins. Current handling is manual email chases. Time impact: 3–14 days of elapsed time, often against a campaign launch deadline. Leadsie [vendor] claims its automated link reduces turnaround by over 50% and cites a customer testimonial of "25% efficiency increase, time from sign to onboard decreased 25%." These are vendor-reported but directionally consistent with the SPP.co 5-hour baseline. **Key insight:** Meta offers two permission levels — Partial Access (most agency work) and Full Control (admin/billing); agencies should default to Partial to reduce client fear and still get the job done.

**Asset collection (50–70% frequency).** "We'll send the logo tomorrow" becomes two weeks of wrong file formats. Failure: client sends JPG instead of vector, forcing recreation upcharge; stock photo licenses unverified; voice/brand guidelines are a 2018 PDF that doesn't match current website. Current handling: nagging emails. Time impact: 3–10 days. Fixable via structured intake with required file types + automated reminder cadence.

**Stakeholder alignment (30–50% frequency, higher for 50+ person clients).** Wrong decision-maker attends kickoff; RACI never countersigned; CMO and CEO have opposing views of the brand which surface during concept review, not intake. Handling: escalation to sponsor, often a painful renegotiation. Time impact: 5–15 days plus possible re-work.

**Scope creep in first 30 days (40–60% frequency).** Client treats first-month capacity as a retainer. Hexagon research via Moxo: low-maturity orgs hit scope creep in **47% of projects vs 30% in mature orgs** with formal approval logs. Handling: formal change-order process, which small agencies are bad at enforcing. This is the highest-margin automation opportunity — an n8n scope-drift detector that watches Slack/email for scope-expanding requests without ticket IDs.

**Tool fragmentation (near-universal).** A typical small agency runs 8–15 tools across an engagement: contract, payment, PM, storage, comms, intake, scheduling, recording, design, analytics, reporting, credentials. Context and decisions scatter; new hires can't find what matters. This is exactly what n8n was built for — the glue between systems.

**Client going silent (25–40% frequency in weeks 2–3).** Intake half-complete, review overdue, calls rescheduled. SPP.co cadence guidance [vendor/practitioner]: daily touch week 1 → twice-weekly weeks 2–3 → weekly week 4 → bi-weekly thereafter. Escalation ladder should be automated: day 3 Slack nudge, day 5 email + calendar hold, day 7 account manager calls.

**Reporting expectations mismatch (50%+ frequency).** Client wants daily performance updates; agency sends monthly. Client expects pipeline attribution; agency only has GA4 traffic. Fix this at kickoff with a written reporting SLA and a dashboard URL delivered by Day 14 — practitioner standard (Databox, AgencyAnalytics both publish this as best practice).

## Blueprint 1: Marketing agency (paid ads, SEO, content, full-service)

**Phase 1 Handoff (Day 0–2).** Triggers: DocuSign/PandaDoc `envelope.completed`, Stripe `payment_intent.succeeded`, HubSpot deal-stage move to "Closed-Won." Tasks: AE→delivery handoff memo (required fields: scope, sales promises, stakeholder map, political context); ClickUp/Asana project spawned from vertical-specific template; Slack Connect channel `#client-[slug]`; Google Drive folder tree; 1Password shared vault; welcome email with Loom walkthrough. Failure mode: AE promised things (timeline, channels, tools) not captured in SOW — handoff memo must reconcile before Phase 2 trigger fires. Duration 1–2 business days.

**Phase 2 Intake (Day 2–7).** The intake questionnaire is the single highest-leverage artifact. **ALM Corp's 20-question framework** [practitioner] covers four areas: business context (goals, KPIs, CAC/LTV, monthly marketing budget, single most important 12-month goal), brand and messaging (tone, value prop, unique differentiators), audience and competitive landscape (ICP, personas, top 3 competitors, past marketing that didn't work and hypotheses why), and technical environment (CMS, CRM, GA4/GTM status, conversion tracking, existing integrations). The credential checklist is where delivery speed lives. **Exact permission levels, synthesized from Leadsie and ALM Corp:**

- **Meta Business Portfolio:** Partner access (not People), Partial Access on ad accounts (not Full Control). Pages: Advertiser role (not Admin). Pixels: data-source access. Catalogs: Partial Access unless managing product feed. Leadsie covers 31 platforms via one link; manual requires knowing the Business Portfolio ID and waiting for 2FA-verified approval.
- **Google Ads:** MCC-level invite (not individual account invite) → Standard access. Never let the agency create a new ad account they own — always add them as a linked manager on the client's existing account.
- **GA4:** Editor role (Administrator only if you're rebuilding the property). Roll-up properties only for multi-brand clients.
- **Google Search Console:** Full user, property-level, verified (not just Restricted).
- **Google Tag Manager:** Publish access (Read or Edit is not enough — you can't ship tags).
- **TikTok Ads Manager:** Admin or Operator via Business Center.
- **LinkedIn Campaign Manager:** Account Manager or Campaign Manager role.
- **HubSpot:** Marketing Hub — Super Admin if setting up; Marketing Access + Contacts Access for ongoing work.
- **Klaviyo:** Admin or Manager (not Content Editor — can't access segmentation).
- **Shopify:** Staff account with specific permissions (Orders, Products, Analytics); Partner Store access preferred for dev/theme work.

Meetings: 45–60min discovery call + 30–45min tech audit. Duration 5 business days. Gate: Phase 3 cannot schedule until intake is 100% complete and at least 80% of access is working.

**Phase 3 Kickoff (Day 7–10).** 60-minute agenda with timing: 5min intros, 10min scope + KPI read-back from SOW, 15min 30/60/90-day plan walkthrough, 10min comms SLA + approval matrix sign-off, 10min reporting cadence, 5min next steps. Deliverables: kickoff deck pre-filled from intake data, project plan, RACI, comms plan, revision policy (2 rounds standard; round 3+ billable). Duration 2–3 business days.

**Phase 4 Setup (Day 10–21) — the deepest phase.** Account audits: Meta BM (ad accounts, pixels, catalogs, pages, domains verified); Google Ads (conversion actions, GCLID, audiences, exclusions); GA4 (events mapped to conversions, UTM taxonomy, cross-domain tracking, custom dimensions); GSC (sitemaps, coverage, mobile usability). Pixel/tag implementation is where tracking lives or dies: Meta Pixel + CAPI (server-side for iOS 14.5+ fidelity), Google Ads conversion with Enhanced Conversions, GA4 events (purchase, lead, signup) wired through GTM, TikTok pixel, LinkedIn Insight Tag, server-side GTM for first-party data. UTM conventions doc is mandatory (Tinuiti/Common Thread Collective both publish versions). Audience uploads: customer match lists, lookalikes, remarketing pools. Asset library populated in Drive/Figma/Canva with folder taxonomy. CRM + email sync (HubSpot↔Klaviyo or HubSpot↔Salesforce). Reporting: Databox or AgencyAnalytics dashboard built with KPI widgets, scheduled weekly snapshot. Baseline benchmarks recorded for 30/60/90-day comparison.

**Phase 4 failure modes** are the expensive ones: broken pixel (silent data loss for weeks until a campaign optimization reveals it — always verify in Meta Events Manager + GA4 DebugView before going live); wrong attribution model (client reports pipeline, agency reports last-click — reconcile at kickoff); missing GTM container access (agency can see tags but can't publish); billing not transferred (client gets a surprise Meta charge); Admin vs Employee permission confusion (agency added as Employee, can't assign pixels to ad accounts). Duration 7–11 days.

**Phase 5 First deliverable (Day 21–30).** Paid sub-type: media plan doc (budget allocation across channels, audience strategy, bidding strategy, creative brief), first creative batch (3–5 concepts), audience builds, and launch readiness review before Go. SEO sub-type: technical audit (Screaming Frog + Ahrefs), keyword strategy with intent clustering, 12-week content calendar. Content sub-type: editorial calendar + first 1–3 briefs approved. QA is non-negotiable before client review: pixel fires verified, UTM tags on every link, creative sized for every placement. Review cycle via Loom (async walkthrough) + Frame.io for creative comments; 2-round revision policy enforced. Duration 7–10 days.

**Phase 6 Steady state (Day 30–60).** Weekly Slack async update (Friday, 3 bullets: what shipped, what's next, what's blocked); biweekly 30-minute call; monthly report via Databox/AgencyAnalytics with a live Loom walkthrough; Slack Connect SLAs written into the agreement (response windows by severity). 90-day QBR = expansion conversation. Failure mode: reporting without outcomes — client sees traffic up but pipeline flat and churns. Tie KPIs to leading (rank, impressions, CTR) and lagging (SQL, pipeline, revenue) from Day 1.

## Blueprint 2: Design agency (brand, web, UX, product, creative subscription)

The design vertical has two genuinely different operating models running through the same shell. **Project model** (brand/identity, web, UX, product) runs milestone-driven with 30–60 day active delivery. **Subscription model** (Designjoy-style) compresses phases 1–3 aggressively — Designjoy explicitly does same-day onboarding to a Trello queue with no kickoff calls and no concepting rounds [practitioner: Brett Williams on The Futur]. n8n implication: branch on a single flag `client.model = "subscription" | "project"` and the rest of the workflow specializes automatically.

Phase 2 intake is the brand personality exercise (12 Jungian archetypes from Brand Master Academy [practitioner]) plus stakeholder-interview scheduling and Figma/CMS access. Phase 3 runs a 90–120 minute brand workshop — **Ben Burns/The Futur recommends pricing the workshop as a standalone deliverable to force stakeholder seriousness** [practitioner]. Phase 4 builds the Figma file structure (Cover → Research → Mood → Explorations → Refined → Source → Archive — this exact pattern appears in writeups from Hygraph, Zeelo, and LoopStudio) and design system tokens. Phase 5 delivers 2–3 concept directions via Figma + Loom, runs 2-round revisions with the approver named in the RACI. Phase 6 splits: subscription model runs an indefinite Trello queue with 24–72h SLA; project model runs milestone payments (50/25/25) with dev handoff through Figma Dev Mode.

**Conflicting practitioner guidance** worth exposing as OpsRadar config: Dubsado vs HoneyBook (karlywhitaker + emakatiraee favor Dubsado for workflow depth; dakotadesignco favors HoneyBook for setup ease); concept count (industry norm 2–3, Designjoy 1). Don't hardcode — make these variables.

## Blueprint 3: Dev/software agency

**Thoughtbot's public Playbook is the gold-standard practitioner source** for this vertical. Their default cadence is a 1-week iteration; Basecamp's Shape Up [practitioner: Ryan Singer] offers a 6-week cycle alternative for larger features. Target: working vertical slice by Day 21–30 — "first working version in 4–6 weeks."

Phase 2 tech discovery captures existing codebase state, stack, deployment target (AWS/GCP/Azure/Vercel/Netlify/Fly.io/Render), DevOps maturity, auth/SSO, integrations, compliance (SOC 2/HIPAA/PCI/GDPR), user volume, perf targets (p95 latency, SLO/SLA), security posture. Access list includes GitHub/GitLab org invite with team assignment, cloud IAM with least-privilege read-only roles until scope confirmed, hosting team invites, staging credentials + read-only DB replica, Figma, API docs (Postman/Swagger), observability (Sentry/Datadog/New Relic). Codebase audit covers README quality, test coverage (tracked as metric, not a hard gate — Thoughtbot warns against "coverage theater"), CI/CD state, dependency hygiene via Snyk/Dependabot/Renovate, license audit. **The #1 Phase 2 failure mode is "client doesn't know own infra"** — especially if inherited from a prior agency or founder. Budget 3–5 extra days for infra archeology.

Phase 3 produces ADRs (Architecture Decision Records in `/docs/adr/`, per the public GitLab Handbook [practitioner]), current-state + target-state architecture diagrams, a risk register, and locked decisions on branching strategy (trunk-based for high-velocity SaaS; GitHub Flow for most web), deploy cadence, environments, release process, and on-call. Phase 4 is environment setup: repo hardening (branch protection, CODEOWNERS, Conventional Commits, PR templates), CI pipeline (build → lint → test → security scan → staging deploy), IaC via Terraform/Pulumi, observability baseline, Linear/Jira project with 2-week sprint cadence. **Thoughtbot warning:** setup should be <30% of Sprint 1; over-investing in tooling before shipping is a classic small-agency trap.

Phase 5 delivers the first vertical slice — smallest end-to-end working feature, deployed to staging, with async Loom demo 24 hours before live Zoom demo. All client feedback goes to Linear/Jira tickets, never Slack DMs. Phase 6 runs the sprint cadence with weekly written status, daily async standups (GitLab Handbook pattern [practitioner]), 10–20% of each sprint reserved for tech debt (Pragmatic Engineer benchmark [practitioner]). Change requests are a formal workflow: new ask → change request ticket → estimate → written change order → client signature → backlog. **Scope creep is the #1 cited failure across Thoughtbot, Shape Up, Pragmatic Engineer, and r/ExperiencedDevs.** The OpsRadar-automatable version watches Slack for requests without ticket IDs and pings the PM.

## Blueprint 4: Recruiting agency (employer is the client)

Sub-types differ materially in cadence: contract/staffing 7–14 days contract-to-first-submission; contingent tech 14–21 days; retained exec search 21–30 days to first shortlist. Across every practitioner source (Recruiterflow, Metaview, ERE, SourceCon, Chad Sowash on RecTech), **Phase 2 role intake is where 60%+ of stalled searches originate.** The order-taker trap — recruiter accepts the JD verbatim instead of diagnosing — is the consensus #1 failure mode.

Phase 2 intake fields must include: role basics, comp band with base/OTE/equity/sign-on/relocation, must-haves/nice-to-haves/dealbreakers force-ranked, candidate ICP (15–25 target source companies + 5–10 anti-targets), interview panel with roles (screener, skills, values, bar-raiser, exec), stages, timeline with urgency driver, work model, visa stance, DEI goals, and **"why the last person failed / why the role is open"** (Recruiterflow's "Real Four" [practitioner]). Calibration profiles are non-negotiable — 3–5 real LinkedIn URLs approved before sourcing starts. Comp band validated against Levels.fyi / Pave / LinkedIn Salary.

Phase 3 kickoff locks feedback SLAs in writing: **24–48 hours on submissions, 48hr on interviews.** These SLAs are the single biggest leverage point — OpsRadar should track feedback turnaround per submission and auto-escalate breaches. Retained exec search adds a named talent map deliverable. Phase 4 launches sourcing with benchmark first-sprint volumes for contingent tech: 50–200 profiles reviewed, 20–50 contacted, 5–15 replied (10–25% reply rate), 3–8 screened, 1–3 submitted. Retained runs lower volume higher touch. Phase 5 formalizes the submission packet (4–6 sentence exec summary, resume, LinkedIn, "why this candidate," comp current + expected, availability, visa status, references status). Phase 6 runs weekly pipeline reports, guarantee tracking (30/60/90-day resignation-risk check-ins), and the 90-day BD moment — the expansion conversation Recruiterflow calls "your BD moment" [practitioner].

## Blueprint 5: Content/copywriting agency

Reference operators: Animalz (editor-led pods, full-time staffing), Omniscient Digital ($10k/mo+ retainers but process is reference-quality, 30/60/90 onboarding), Superpath/Jimmy Daly (Airtable + Zapier editorial ops), Grow and Convert (pain-point SEO methodology). The Animalz Glassdoor signal worth heeding: "production goals rose, editors didn't, freelancers backfilled without support, standards fell" [practitioner] — the cautionary tale for scaled content ops. Mitigation built into the blueprint: editor-to-writer ratio stays ≤1:4, no more than 20% freelance backfill without dedicated onboarding.

Phase 2 critical fields: brand voice doc (or flag "none — build one"), ICP with firmographic + persona, buyer stage priority, KPIs with leading vs lagging distinction, SME availability in hours/month, seed keyword list (Grow and Convert's pain-point method — start from sales-qualifying questions not volume), competitors, compliance constraints. **CMI's capacity math** [practitioner]: SME hours ÷ 2 hours per article = article capacity. Show this in the kickoff when the client wants 8 posts/month but SMEs only have 3 articles of capacity.

Phase 4 builds the editorial calendar in Airtable/Notion, 4–6 approved content briefs (Clearscope's standard brief template [vendor]: target keyword + intent + SERP analysis, persona, CTA, word count, outline, terms, information gain, SME quotes, meta/slug/alt), finalized style guide, writer assignments, CMS publish SOP. Phase 5 runs the first brief → draft → revision → publish cycle with QA gates before client sees anything (factual, SEO, voice, grammar). **"Silence = approval" SOW clauses** are controversial among practitioners — leave as opt-in config. Phase 6 delivers monthly reporting (GA4 + GSC + Ahrefs APIs → Notion/Slides template) and quarterly content audits.

## The automation decision matrix: what to build, what to leave alone

**Category A (fully automatable):** contract-signed → workspace provisioning (Slack channel, Drive folder, Notion page, ATS seat, 1Password vault); welcome email sends; calendar-booking event handling; reminder cadences for incomplete intake/assets/feedback; reporting dashboard scheduled snapshots; status summary generation from PM tool data; guarantee-window ticklers; SLA timer + first-escalation notifications.

**Category B (semi-automatable, human approval required):** kickoff deck pre-fill from intake data (AI drafts, human reviews/edits); meeting transcript → action items via Fathom/Grain/Fireflies/tl;dv (AI extracts, PM validates and assigns); asset-collection chase (auto-send, human decides when to escalate); deliverable QA checks (automated pixel fire / link UTM / accessibility / grade-threshold checks with human sign-off before client review); change-request detection (n8n watches for scope-expanding Slack/email, PM validates and routes); credential access invites (Leadsie-style link generation, client clicks, system confirms).

**Category C (not automatable — pure judgment):** intake discovery calls and tech discovery (AI-assisted notes only); architecture decisions; concept direction selection in design; which 3 candidates to submit in recruiting; final editorial voice calls; client-relationship escalation judgment; scope negotiation.

**Concrete n8n patterns to build first** (highest ROI across all five verticals):

1. **Contract + payment → provisioning fan-out.** Webhook (HubSpot deal stage) → conditional branch (vertical) → Airtable client record → Slack channel create → Drive folder from template → Notion page from template → 1Password vault → Gmail welcome → schedule Day 3 intake reminder. This is the single highest-leverage workflow because it fires on every single client.
2. **Phase-gate enforcement.** No Phase N trigger fires until Phase N-1 checklist is 100% — n8n branching + wait nodes. Blocks the handoff-gap failure mode.
3. **SLA timer with escalation ladder.** Timer → 50% ping → 100% ping → breach escalate to AE. Applied to feedback SLAs (recruiting), access SLAs (all verticals), demo SLAs (dev), review SLAs (creative).
4. **Weekly status auto-draft.** Pull Linear/ATS/ad-platform metrics → populate Notion/Loom template → Slack notify PM to review/send. Converts a 30-minute weekly task into a 5-minute review.
5. **Monthly report generator.** GA4 + GSC + Ahrefs + ad platform APIs → Databox/AgencyAnalytics/Google Slides template → Slack PM 3 days before monthly call.
6. **Change/scope-drift watcher.** Slack + Gmail listeners → keyword-match scope-expanding language without ticket IDs → flag to PM. Addresses the #1 cited failure across every vertical.
7. **Client-health composite.** Combine review turnaround, revision round count, SME availability, payment timeliness, engagement → early churn signal. Makes the 20%+ onboarding-driven churn (SerpSculpt 2025) actionable.

Vendor templates from n8n.io already exist as starting points: AI-powered client onboarding (Jotform→Asana→Slack→HubSpot→Google Sheets), marketing agency client onboarding (Typeform→Drive+OpenAI research brief with approval workflow), and HubSpot customer onboarding with email sequences. These are useful scaffolds but vertical-specific specialization (Meta/Google access, ATS hooks, editorial-hub setup) is where OpsRadar's defensibility lives.

## The ten templates every playbook ships with

The template library is the non-automation half of OpsRadar's value. Clients need artifacts, not just workflows. Structure for each, drawn from ALM Corp, Leadsie, HubSpot for Agencies, SPP.co, Thoughtbot Playbook, and the n8n template gallery:

**Intake questionnaire** (20–40 fields, vertical-specific). Marketing: 20 ALM Corp questions across business context, brand/identity, audience/competition, marketing history. Design: archetype quiz + mood keywords + must-haves/avoids. Dev: the 15-field technical discovery set. Recruiting: role-intake schema with force-ranked must-haves. Content: voice/ICP/KPI/SME/seed-keyword set.

**Welcome email sequence** (4–6 emails across Day 0/1/3/7/14/30). Day 0 welcome + Loom walkthrough; Day 1 intake form + credentials checklist; Day 3 reminder if incomplete; Day 7 kickoff confirmation + prep doc; Day 14 post-kickoff recap + revision policy; Day 30 first-deliverable review + feedback form.

**Kickoff meeting agenda** (60-minute timed): 5min intros, 10min scope read-back, 15min 30/60/90 plan, 10min comms SLA + approver matrix, 10min reporting cadence, 5min next steps, 15min buffer for questions.

**Access credential checklist by vertical** with exact permission levels (Leadsie publishes these for 31 platforms).

**First 30 days milestone checklist** (agency version + client version — they need different artifacts).

**Brand/asset request checklist**: logo in SVG + PNG + horizontal/vertical variants, brand guidelines PDF, typography with licenses, color palette with hex/RGB/CMYK/Pantone, photography with rights, product shots, past creative, voice guide, testimonials, social handles.

**SOW template sections**: scope (operational not sales language), deliverables with acceptance criteria, timeline, milestones, fees, payment schedule, IP ownership, termination, assumptions, exclusions, change management process, guarantee terms (recruiting) or revision policy (creative).

**Discovery call scripts**: question sequence covering company/product, goals, KPIs, past work, decision process, timeline, budget, team, risks.

**Client-facing project plan structure** in Notion/ClickUp/Monday with milestone view, RACI, and status dashboard.

**Brand voice / style guide intake**: voice axes (formal↔casual, playful↔serious, expert↔accessible), 10 "we say / we don't say" examples, punctuation/numbers, banned phrases, CTA language, SEO title pattern.

## Five takeaways that should shape OpsRadar's product

The research converges on a clear strategy. **First, build one shell, specialize five cores.** The 6-phase shape is universal; the content of Phases 2, 4, and 5 is where verticals diverge. One n8n parent workflow calling vertical sub-workflows is the right architecture.

**Second, the access-collection layer is the single highest-leverage feature.** Credential collection hits 60–80% of onboardings with 3–14 days of wait per client. Leadsie has proven the market ($) by solving just this slice. OpsRadar can go further by making access collection one node in a broader orchestration.

**Third, SLA timers and phase-gate enforcement are the quiet differentiators.** Every practitioner source blames broken handoffs, late feedback, and silent scope creep for failed onboardings. These are passive-watcher workflows n8n is uniquely suited to run.

**Fourth, don't over-automate the judgment work.** Practitioner consensus across every vertical: intake itself stays human-led (AI-assisted notes only); architecture decisions, concept selection, candidate-submission choice, and editorial voice are not automatable. The $500–2K/month price point is defensible only if agencies still own the judgment clients actually pay for — OpsRadar automates the 60% connective tissue, not the 40% that sells the engagement.

**Fifth, the templates are half the product.** Intake questionnaires, access checklists, kickoff agendas, SOW sections, revision policies — these are the tangible artifacts agencies need on Day 1. Ship them as a curated library tied to each blueprint. Agencies will pay for the library even before they build the workflows; the workflows are what keep them subscribed.

The opportunity for OpsRadar is precise: **automate the 5–20 hours of connective-tissue busywork per client across a 60-day onboarding window, productize it as vertical-specific n8n playbooks, and price against the 20%+ onboarding-driven churn rate.** The research shows small agencies already know they need this; they just don't have the time to build it themselves.