# Research — YC S26 deep dive: the application, the interview, what gets funded, partner signal, honest odds, anti-patterns

> **Research run date**: 2026-05-27
> **Question**: For an Iraq-based, 2-founder, pre-revenue team applying to YC Summer 2026 — what are the *actionable specifics* of the current application form, the 10-minute interview, what YC funds right now (S26 RFS + recent batch comps), what individual partners are signaling, the honest acceptance odds + the highest-leverage moves, and the documented rejection anti-patterns?
> **Status**: raw research output — exhaustively cited evidence document. Every non-obvious claim carries a URL.

---

## What this answers + how it complements the existing yc/ docs

The four existing YC docs (`what-yc-wants.md`, `founder-profile.md`, `research-addendum.md`) and the two recent research files (`2026-05-27-yc-fundraising-refresh.md`, `2026-05-25-yc-acceptance-pattern.md`) already cover: the 5 partner signals, the founder bios + Iraq headwind data, the 4 RFS categories mapped to OpsRadar, the breach-as-velocity narrative, the 11x "remove-the-human" cautionary tale, and the S25/W26 "AI [role] for [vertical]" pitch shape.

**This doc does NOT repeat those.** It goes one layer deeper on the *mechanics*: (1) the verbatim application fields + what each is really probing + word-count norms + the 1-min video craft; (2) the interview run-of-show with first-hand 2025-2026 accounts; (3) the FULL S26 RFS authorship + a concrete roster of recently-funded AI-ops/back-office comps with one-liners; (4) named partner quotes from 2025-2026; (5) the relocation reality (now confirmed mandatory) + honest odds; (6) the documented rejection anti-patterns. It is the "how do we actually fill the form and survive the 10 minutes" companion to the strategy docs.

---

## Section 1 — The current YC application: fields, intent, norms, and the 1-minute video

### 1.1 The form (verbatim fields, in roughly the order YC presents them)

YC does not publish the form outside the live `apply.ycombinator.com`, but the field set is stable across 2024-2026 and reconstructable from founder writeups + YC's own pages. The load-bearing fields and their verbatim phrasing:

**Company section**
- "Describe what your company does in 50 characters or less." — a hard 50-char cap; this is the line a partner skims first. ([shizune YC examples](https://shizune.co/yc-application-examples/what-is-your-company-going-to-make), [Razorpay YC guide](https://razorpay.com/blog/writing-an-outstanding-y-combinator-application/))
- "What is your company going to make? Please describe your product and what it does or will do." — the core product field; aim ~2-4 tight sentences, no platform-speak. ([shizune](https://shizune.co/yc-application-examples/what-is-your-company-going-to-make))
- "Where do you live now, and where would the company be based after YC? Explain your decision regarding location." — directly probes relocation commitment (see §5). ([Leland YC guide](https://www.joinleland.com/library/a/yc-application))
- "How do or will you make money? How much do you think you'll make in 5 years?" — combined business-model + ambition field. YC frames it as "how big can this be" plus "near-term money path." ([shizune money examples](https://shizune.co/yc-application-examples/how-do-or-will-you-make-money), [Capwave](https://capwave.ai/blog/blog-how-to-apply-to-y-combinator))

**Founders section** (per-founder)
- "Please tell us in one or two sentences about something impressive that each founder has built or achieved." — **YC's self-described "most important question on the application."** Per-founder, ~1-2 sentences each. ([Vaave's 10 YC questions](https://medium.com/vaave/10-y-combinator-questions-every-entrepreneur-should-answer-d1a9186a93a1))
- "Please tell us about the time you most successfully hacked some (non-computer) system to your advantage." — tests resourcefulness / Paul-Graham "naughtiness." (Lawand's motorcycle-delivery story is a textbook answer — already drafted in `founder-profile.md`.) ([Vaave](https://medium.com/vaave/10-y-combinator-questions-every-entrepreneur-should-answer-d1a9186a93a1))
- "How long have the founders known one another and how did you meet? Have any of the founders not met in person?" — probes team durability + co-founder risk. ([Leland](https://www.joinleland.com/library/a/yc-application))
- "Please tell us about an interesting project, preferably outside of class or work, that two or more of you created together." — probes shipping-together history.

**Progress / traction section**
- "How far along are you?" — YC advice: "start with an honest answer backed by data, then add context rather than starting out defensively." ([shizune how-far-along](https://shizune.co/yc-application-examples/how-far-along-are-you), [Capwave](https://capwave.ai/blog/blog-how-to-apply-to-y-combinator))
- "How many active users or customers do you have? Do you have revenue?" — the single field that, if strong, neutralizes most other risk factors.
- "If you've already started working on it, how long have you been working and how many lines of code have you written?"

**Idea section**
- "Why did you pick this idea to work on? Do you have domain expertise in this area? How do you know people need what you're making?" — the founder-market-fit field (see §6 anti-patterns).
- "Who are your competitors, and who might become competitors? Who do you fear most?" — name them; vagueness here is a documented ding (see §6).
- "What's new about what you're making? What substitutes do people resort to because it doesn't exist yet (or they don't know about it)?"

**Equity / legal**
- "Have you incorporated, or formed any legal entity yet?" / equity split per founder / "Are any of the founders covered by a non-compete or IP agreement?"

**The video field**
- "Please enter the URL of a one-minute unlisted (not private) YouTube video introducing the founders." — **YouTube only**, exactly ~1 minute, unlisted not private. ([YC video page](https://www.ycombinator.com/video), [Pilot video guide](https://pilot.com/blog/how-prepare-yc-application-video))

Format norm across all text fields: **clarity beats completeness.** The reconstructed founder consensus is "stripped to essentials," short, specific, jargon-free — partners read tens of thousands of these and skim. ([wearefounders — How we nailed YC](https://www.wearefounders.uk/how-we-nailed-yc-on-our-first-try-a-family-affair/))

### 1.2 What each high-stakes field is *really* probing

| Field | Surface ask | What it actually tests |
|---|---|---|
| 50-char description | what you do | Can you communicate without buzzwords (proxy for clear thinking) |
| "most impressive thing built" | resume | Evidence of the *trait* (determination/velocity), not credentials |
| "non-computer hack" | a story | Resourcefulness under constraint — the Iraq profile shines here |
| "why this idea / domain expertise" | motivation | Founder-market fit; whether you *discovered* this vs picked it off a list |
| "how far along" | metrics | Velocity + honesty; defensive padding is a tell |
| "who do you fear most" | competitors | Real market knowledge; "no competitors" is a red flag |

### 1.3 The 1-minute video — current (2025-2026) craft

The video is YC's "truth serum" — partners use it to read **founder chemistry, communication clarity, and velocity**, not production value. ([techwisehub video formula](https://www.techwisehub.com/blog/perfect-yc-application-video), [Pilot](https://pilot.com/blog/how-prepare-yc-application-video))

Documented best practices for 2026:
- **Just the founders talking.** YC's instruction: "introduce yourselves, explain what you're doing and why." Nothing else. No animated logo, no music, no b-roll — partners "watch these back-to-back and hate fluff." ([YC video](https://www.ycombinator.com/video), [Zyner video guide](https://zyner.io/blog/yc-application-video-guide))
- **Audio > video.** "Bad video is forgivable; bad audio is not." Use a phone as a second mic just out of frame. ([Zyner video guide](https://zyner.io/blog/yc-application-video-guide))
- **Equal airtime.** "If one founder talks for 50 seconds and the other for 10, YC assumes the second is weak or disengaged." When one speaks, the other actively listens (nods). ([Zyner video guide](https://zyner.io/blog/yc-application-video-guide))
- **Don't recite a script** — bullet points, talk like to a friend. ([Pilot](https://pilot.com/blog/how-prepare-yc-application-video))
- **Dense, factual, fast.** "The videos that get funded often look terrible… but they sound incredible." ([techwisehub](https://www.techwisehub.com/blog/perfect-yc-application-video))

> **So what for OpsRadar:** the video is the single place the Iraq angle + 2-founder dynamic is *seen, not claimed*. A grainy webcam recording of Lawand + Atta, equal airtime, dense and fast, opening with the discovery (not credentials), is on-pattern. The 60-second script in `founder-profile.md` Part 10 is already structured for this — just record it raw, no production.

---

## Section 2 — The 10-minute interview: run-of-show + first-hand 2025-2026 accounts

### 2.1 Official format (verbatim from YC)

- **10-minute conversation over Zoom**, all founders present, **2-3 partners** who have your application open. ([YC interviews](https://www.ycombinator.com/interviews))
- Two activities only: "asking questions and reviewing what you've built." ([YC interviews](https://www.ycombinator.com/interviews))
- "There isn't time for prepared speeches, slide presentations, or screencasts." ([YC interviews](https://www.ycombinator.com/interviews))
- YC's own prep advice is *anti-prep*: "We don't recommend doing mock interviews" and over-preparing "can make the interview more awkward." The real prep: "work hard and have your startup improve between the time that you applied and the time that you interview." ([YC interviews](https://www.ycombinator.com/interviews))
- "All founders should answer at least one question." ([YC interviews](https://www.ycombinator.com/interviews))
- Style: rapid-fire, direct, interruption-heavy — partners interrupt "to cover a lot of ground quickly," not to be rude. ([4dayweek YC interview](https://4dayweek.io/interview-process/y-combinator))

### 2.2 The rapid-fire question bank (categories that recur, verbatim examples)

From the aggregated 2025 question corpus: ([Flowjam YC interview questions 2025](https://www.flowjam.com/blog/yc-interview-questions-2025))

- **One-liner:** "Explain what your company does in one sentence."
- **Team/origin:** "How did you two meet?" · "Who writes code and who sells?" · "What's the biggest fight you've had in the last month?"
- **Problem/market:** "How painful is this really?" · "Who else tried and failed?" · "What changed in the last 12 months that makes this possible now?"
- **Traction:** "What's your weekly growth rate?" · "How many paid pilots?" · "What's churn?"
- **Demo:** "Can you screen-share the product right now?"
- **Moat:** "What stops Google from building this?" · "How defensible is your dataset?"
- **Business model:** "Why not charge 10x more?" · "What happens if CAC doubles next quarter?"
- **AI-specific:** "How much does a single query cost you at [model] pricing?" · "What's your hallucination mitigation strategy?"
- **Rapid-fire stress tests:** "Convince me this isn't a feature." · "What's the worst-case scenario in 6 months?"

The most reliably-asked question per multiple guides: some form of **"How fast is X growing?"** where X is whatever metric proves the business is real (revenue / WAU / units / design partners). ([Capwave](https://capwave.ai/blog/blog-how-to-apply-to-y-combinator))

### 2.3 First-hand 2025-2026 interview accounts (cite these)

**Account A — Onu / Loula (X25):** They prepped obsessively for rapid-fire business questions and got none. Within the first moments a partner said: *"So we love your backgrounds, but we hate your idea. Are you open to changing it?"* The 10 minutes turned into a collaborative brainstorm about problems they knew in fintech/dev-tools. Their takeaway: *"YC is looking to invest in teams they believe in, not ideas that are bound to change"* — they credit acceptance to *"strong backgrounds, grit, and confidence,"* not the idea. ([Loula YC interview experience](https://joinloula.medium.com/our-y-combinator-interview-experience-6e8a2fe4ea5))

**Account B — "How we nailed YC on our first try":** Applied **late** in the cycle (Friday→Sunday submit→Monday/Tuesday invite→Thursday interview→accepted that night). Built a "no-frills, just execution" prototype over the weekend; spent 48 hrs after the invite gathering real user anecdotes. The interview: partners arrived **15 minutes late**, questions were straightforward, and the founders "sensed YC had largely decided beforehand, using the interview to check for red flags." Acceptance came by phone, not email. Credit: demonstrated execution (quit jobs, moved, shipped 7 products), concrete user stories, a working prototype, and founder resilience. ([wearefounders — How we nailed YC](https://www.wearefounders.uk/how-we-nailed-yc-on-our-first-try-a-family-affair/))

**What both confirm:** the interview is largely a *disambiguation / red-flag check* on a decision the application mostly drove (consistent with the `what-yc-wants.md` framing). The team read dominates the idea read. Late application is **not** disqualifying.

### 2.4 What gets teams dinged (documented)

From the 2025 corpus + guides: ([Flowjam](https://www.flowjam.com/blog/yc-interview-questions-2025), [4dayweek](https://4dayweek.io/interview-process/y-combinator), [Pilot interview](https://pilot.com/blog/tips-y-combinator-interview))
1. **Lengthy monologues** instead of 20-second answers (partners will cut you off).
2. **Claiming no competition** ("we're the only ones doing this").
3. **Dodging the equity-split question** or being cagey about co-founder dynamics.
4. **Over-polished decks over a raw working demo** — they want the localhost, not the Figma fantasy.
5. **Failing to explain "why now"** / the market shift.
6. **Buzzword pitches** — "people who really understand can communicate efficiently in layman's terms."

### 2.5 Numbers to have memorized + setup

Have cold: current revenue/MRR (even $0, explained), WoW growth, # users (paid+free), CAC ("we haven't paid for acquisition"), the single biggest customer-validated insight, top 1-2 pilot/design-partner names + verbatim feedback. Tech setup: rock-solid internet + a hotspot backup, product open in a tab ready to screen-share. ([Flowjam](https://www.flowjam.com/blog/yc-interview-questions-2025), [4dayweek](https://4dayweek.io/interview-process/y-combinator))

---

## Section 3 — What YC funds NOW: the full S26 RFS + recent batch comps

### 3.1 The Summer 2026 RFS — all categories + authors (verbatim framing)

S26 RFS published ~April 28, 2026, expanded to **15 categories** (nearly double the prior batch), with a heavy hard-tech tilt — roughly half the list is capital-intensive (agriculture robots, counter-drone defense, space/lunar manufacturing, semiconductors). ([YC RFS](https://www.ycombinator.com/rfs), [VC Cafe RFS S26](https://www.vccafe.com/2026/04/28/requests-for-startups-summer-2026-edition/), [Founders Corner RFS](https://www.the-founders-corner.com/p/yc-just-told-you-exactly-where-to))

The categories OpsRadar touches + their YC partner authors and core insight:

| RFS category | Author | Core insight (paraphrase + key quote) |
|---|---|---|
| **AI-Native Service Companies** | Gustaf Alströmer | "Services at software margins" — companies that *don't sell software, they sell the service / just do the work*; already-outsourced sectors are ideal targets. ([Founders Corner](https://www.the-founders-corner.com/p/yc-just-told-you-exactly-where-to)) |
| **Company Brain** | Tom Blomfield | Not search, not a chatbot over docs — an **"executable skills file"** agents can act on; "a living map of how a company actually works." "The biggest blocker to AI automation isn't the models — it's the domain knowledge." ([Founders Corner](https://www.the-founders-corner.com/p/yc-just-told-you-exactly-where-to), [thevccorner RFS](https://www.thevccorner.com/p/yc-summer-2026-requests-for-startups-ideas)) |
| **AI Operating System for Companies** | Diana Hu | "Closed-loop intelligence" across all operations; the integration layer connecting Slack/Linear/GitHub. Explicitly **"Not another dashboard."** ([Founders Corner](https://www.the-founders-corner.com/p/yc-just-told-you-exactly-where-to)) |
| **Software for Agents** | Aaron Epstein | "Make Something Agents Want" — machine-readable interfaces, agents as first-class users. ([Founders Corner](https://www.the-founders-corner.com/p/yc-just-told-you-exactly-where-to)) |
| **SaaS Challengers** | Jared Friedman | Target "invulnerable" legacy products (chip design, ERPs, industrial control) with AI-native rebuilds. ([Founders Corner](https://www.the-founders-corner.com/p/yc-just-told-you-exactly-where-to)) |

Other S26 categories (not OpsRadar's lane, listed for context): Counter-Swarm/Drone Defense (Tyler Bosmeny — "more like Cloudflare than Raytheon"), Low-Pesticide Agriculture (Garry Tan), plus space electronics, semiconductors, robotics, etc. ([Founders Corner](https://www.the-founders-corner.com/p/yc-just-told-you-exactly-where-to))

**Blomfield's explicit go-to-market advice inside the Company Brain RFS:** *"Vertical first. Don't build 'company brain for everyone.' Build it for [one team type], then expand. Skills file format is the moat — whoever defines the portable schema for 'here is how this company runs' wins the category."* This is near-verbatim the OpsRadar thesis (vertical = service businesses; Notion brain + `SKILL.md` files = the executable skills file). ([thevccorner RFS](https://www.thevccorner.com/p/yc-summer-2026-requests-for-startups-ideas))

### 3.2 Recently-funded comps (W26 / S25 / X25) — names + one-liners + why fundable

W26 batch = **199 companies**; ~73% AI-focused; the largest single bucket is **"AI-native services" (56 companies, 28%)** defined as "AI performs a job end-to-end, and the customer supervises or approves" — which is *exactly* OpsRadar's control-first approval-gate shape. ([Extruct W26](https://www.extruct.ai/research/ycw26/))

**The AI-ops / back-office / company-operations roster (W26), with one-liners:** ([Extruct W26](https://www.extruct.ai/research/ycw26/))

| Company | One-liner | Note |
|---|---|---|
| **Corvera** | Autonomous CPG back-office operations | Closest "AI operations for a vertical" comp; reported $33k MRR / 12 brands / 130% w/w in early 2026 (per `2026-05-25-yc-acceptance-pattern.md`) |
| **FullSeam** | Financial operations automation | Direct adjacency to OpsRadar's revenue/collections loops |
| **Balance** | AI accounting automation | "Full-stack AI [profession]" template |
| **Ventura** | AI teammates for industrial distributors | Vertical "AI teammate" framing |
| **Fenrock AI** | AI agents for banking back office | Vertical back-office |
| **Perfectly** | AI recruiting operations platform | Services-business ops |
| **Robby** | Home services back-office automation | Services vertical |
| **Proximitty** | Autonomous business loan servicing | Closed-loop ops |
| **Patientdesk.ai** | AI front and back office for dental practices | Vertical front+back office |
| **MochaCare** | Scheduling and hiring for care agencies | "for [agency type]" wedge |

**AI Chief of Staff / exec-ops comps (X25 / S25):**
- **BOND (X25)** — "Your AI Chief of Staff" (assistant "Donna") for CEOs and busy execs; uses LLMs + vector search to "tear down data silos." The closest *horizontal* competitor; went broad (all execs), leaving the vertical-services wedge open. ([YC BOND](https://www.ycombinator.com/companies/bond), [BOND launch](https://www.ycombinator.com/launches/Ncl-bond-ai-chief-of-staff-for-ceos-and-busy-execs))
- **Mesmer** — "AI chief of staff for CTOs." ([catalaize S25](https://catalaize.substack.com/p/y-combinator-s25-batch-profile-and))
- **Blueshoe (S25)** — "automates legal back-office operations for law firms — invoicing, collections, intake, pricing." Near-identical *function set* to OpsRadar's (invoicing/collections), just in legal. ([Extruct S25](https://www.extruct.ai/blog/ycs25/))

S25 was **>60% AI in the one-liner**, dominant shape = narrow vertical "AI employee/role for one function." ([catalaize S25](https://catalaize.substack.com/p/y-combinator-s25-batch-profile-and), [Extruct S25](https://www.extruct.ai/blog/ycs25/))

**What made these fundable (the pattern):** a tight "AI [role/ops] for [one vertical]" one-liner; the AI *does the work end-to-end with human approval*; founders with domain insight; and a workflow that is expensive + repetitive today. ([Extruct W26](https://www.extruct.ai/research/ycw26/), [onecerebral / Jared Friedman vertical-AI thesis](https://www.linkedin.com/posts/raadahmed_ycs-jared-friedman-on-the-future-of-vertical-activity-7266955104363196417-v-xb))

### 3.3 RFS-category map for OpsRadar (which to claim)

OpsRadar sits at the **intersection of three S26 software categories at once** — claim the intersection, not one box (per `2026-05-27-yc-fundraising-refresh.md`):
- **AI-Native Service Companies** (Alströmer) — OpsRadar *does the COO work*, gated by approval. Strong.
- **Company Brain** (Blomfield) — the customer-owned Notion brain + `SKILL.md` files = literally the "executable skills file." Strongest, and unowned by any funded company yet.
- **AI OS for Companies** (Hu) — the OAuth tool-fabric + agent loop. Caveat: Hu's "Not another dashboard" warning means **demote the `/dashboard/*` framing**; lead with brain + agent.

---

## Section 4 — Partner signal (2025-2026 quotes, attributed)

**Garry Tan (President/CEO) — the vertical-AI / moat thesis:**
> *"Evals are emerging as the real moat for AI startups. Hard-won insights about customers and their business logic discovered by founders acting almost as ethnographers spelunking in the underserved slices of the GDP pie chart."* ([Garry Tan on X, Feb 2026](https://x.com/garrytan/status/1892952656940880036))

> *"Moat is a verb"* — defensibility is the act of staying ahead, not a static asset; build a business defensible "even if your code is open-sourced tomorrow." The #1 reason startups fail: "they don't make something people want." ([everything.design on Tan moat](https://www.everything.design/blog/build-real-moat-2026), [fs.blog Knowledge Project — Tan](https://fs.blog/knowledge-project-podcast/garry-tan/))

**Jared Friedman (Group Partner) — vertical AI > horizontal:**
> Software engineering is ~50% of all agent activity today; "everything else — BI, customer service, high-stakes verticals — is still tiny." The next billion-dollar AI companies "won't be 'AI for developers'… [they'll] live inside hospitals, law firms, banks, schools, and logistics operations — places where agent usage is still under 5%." Prediction: "just as SaaS created 300+ unicorns, vertical AI will do the same — on an even larger scale." ([onecerebral / Friedman thesis](https://www.linkedin.com/posts/raadahmed_ycs-jared-friedman-on-the-future-of-vertical-activity-7266955104363196417-v-xb))

His build advice: "Identify an expensive, repetitive workflow… design an AI agent to fully replace it. Choose an industry you understand deeply — insider knowledge uncovers overlooked automation. Move fast." ([onecerebral](https://www.onecerebral.com/p/vertical-ai-agents-could-be-10x-bigger-than-saas))

**Tom Blomfield (Group Partner, ex-Monzo) — Company Brain:**
> *"The biggest blocker to AI automation isn't the models — they're good enough. It's the domain knowledge."* Company knowledge is "scattered across employees' heads, Slack threads, email, old tickets… undocumented habits." The answer is "a living map of how a company actually works… an executable skills file," built "vertical first." ([thevccorner RFS](https://www.thevccorner.com/p/yc-summer-2026-requests-for-startups-ideas), [Founders Corner](https://www.the-founders-corner.com/p/yc-just-told-you-exactly-where-to))

**Diana Hu (Group Partner) — AI OS:**
> "Build the connective layer that makes a company legible to AI by default. **Not another dashboard.**" "Closed-loop intelligence" across operations. ([Founders Corner](https://www.the-founders-corner.com/p/yc-just-told-you-exactly-where-to))

**Dalton Caldwell (Managing Director) — applications, tarpits, resilience:**
> Founders "treat applications like homework assignments, polishing every sentence until it sounds like corporate marketing speak — the fastest way to get rejected." Jargon like "paradigm-shifting B2B platform" → rejection. Choosing what to build "based on what they think VCs will like" is a mistake. The success trait isn't a personality type but **"profound self-belief"**; the survival mindset is **"Just don't die."** Most successful YC companies "were rejected at least once" — if you reapply, "the best story is one of progress." ([Lenny's — Dalton 1,000+ startups](https://www.lennysnewsletter.com/p/lessons-from-1000-yc-startups), [Zyner application guide](https://zyner.io/blog/ycombinator-application-guide))

**Pete Koomen (Group Partner) — "AI Horseless Carriages":**
> Most AI apps fail by "jamming a little bit of AI into an interface designed for mundane human labor rather than an interface designed for automating mundane labor." If an LLM acts on the user's behalf, the user should be able to **teach it** (edit the system prompt). ([koomen.dev — AI Horseless Carriages](https://koomen.dev/essays/horseless-carriages/), [officechai summary](https://officechai.com/ai/y-combinator-partners-explain-how-ai-integration-in-apps-needs-to-steer-clear-of-horseless-carriages/))

**Evolved YC craft signal (2026):** YC now **accepts Claude Code transcripts in applications** to evaluate how founders prompt agents and think in systems; the old "write code, talk to users" has become **"prompt and talk to users."** Directly validates Lawand's Software-3.0-director profile. ([quasa / Tan AI-agents advice](https://quasa.io/media/where-to-build-ai-agents-next-y-combinator-president-garry-tan-s-clear-advice-backed-by-fresh-anthropic-data))

> **So what for OpsRadar:** the partner who authored each of OpsRadar's three categories has *published the exact thesis OpsRadar is built on* — domain knowledge as the moat (Blomfield), vertical > horizontal (Friedman), evals/ethnographer-insight as the moat (Tan), control-first/teach-the-agent (Koomen). The application should echo this language deliberately (without parroting): "domain knowledge is the blocker; we have 5 years of it," "vertical wedge, then expand," "the brain is an executable skills file," "the owner teaches and approves the agent."

---

## Section 5 — Honest odds + levers (the brutal version)

### 5.1 The numbers

- **Applications S26: 30,000+. Acceptance: ~3-4% (estimated).** Batch size since the 2025 move to 4 batches/year: **~140-200 companies.** ([wearefounders acceptance rate 2026](https://www.wearefounders.uk/y-combinator-acceptance-rate-2026/), [AcceleratorWatch S26](https://acceleratorwatch.com/predictions/yc-s26))
- Context: S25 ran ~160-169 companies at a reported **0.6% rate — the lowest in YC history.** The "3-4%" S26 figures are softer estimates; treat the real personal odds as **dominated by the written-application filter**, not the headline rate. ([wearefounders acceptance rate](https://www.wearefounders.uk/y-combinator-acceptance-rate-2026/))
- W26 = 199 companies; **founders are younger** (avg ~5.8 yrs experience, down from YC's historical ~9) and **more Bay-Area-concentrated**; the batch tilted hard-tech/industrial and *away* from consumer. ([Extruct W26](https://www.extruct.ai/research/ycw26/), [Jared Heyman W26](https://jaredheyman.medium.com/on-the-freakishly-strong-yc-w26-batch-056ccb666076))

### 5.2 The relocation reality — now CONFIRMED mandatory (this is the hard one)

YC's FAQ is unambiguous: *"The batch takes place in-person in San Francisco. It kicks off with a 3-day, in-person retreat and features weekly meetups in San Francisco."* Relocation for the ~3-month batch is required; "after the 3 month program, you can go wherever you want." ([YC FAQ](https://www.ycombinator.com/faq))

The good news for an Iraq-based team: **no US-based requirement to apply,** and YC handles logistics post-acceptance — *"If we accept your application, we'll help you get visas and incorporate"* and "YC works with excellent immigration attorneys that have helped hundreds of our founders get visas." ([YC FAQ](https://www.ycombinator.com/faq)) Typical path: B-1 / ESTA for the batch itself, O-1A after (YC acceptance is itself "extraordinary ability" evidence). ([tryalma visa options](https://www.tryalma.com/learn/best-visa-options-yc-company-founders), [passright accelerator visas](https://www.passright.com/the-ultimate-guide-for-startup-founders-best-visa-green-card-options-for-y-combinator-techstars-and-other-accelerator-founders-to-stay-in-the-u-s/))

**The brutal honesty:** Iraq is not on the standard B-1/ESTA easy path, and an Iraqi passport faces materially higher US-visa friction than the Indian/European founders YC usually onboards. This is the single most concrete risk a partner will silently weigh ("can these two actually be in SF in July?"). The existing `founder-profile.md` location-data (90% US-focused batches, MENA underrepresented) compounds it. The application must make the SF commitment + a credible visa plan *explicit and confident* — not hand-wave it.

#### The actual Iraqi-passport visa path (verified 2026-05-27, via Grok web search — NOT legal advice)

This closes the corpus's one unaddressed gap. The path exists; it just has to be planned early and routed through a third country.

- **ESTA / Visa Waiver Program: NOT available.** Iraq is not a VWP country; Iraqi nationals (and, under the VWP Improvement & Terrorist Travel Prevention Act, even dual nationals / prior-Iraq-travel applicants) are ineligible. Rule this out entirely.
- **B-1 (temporary business visitor) is the path for the 3-month batch.** It covers program participation, meetings, consultations — but *not* paid US employment. Requires proof the trip is temporary + sufficient funds + strong ties to Iraq (the INA 214(b) immigrant-intent presumption is the real hurdle for high-migration-pressure countries).
- **The wrinkle that must drive timing: Baghdad + Erbil routine nonimmigrant visa processing is currently suspended (as of recent 2026 updates).** Iraqi applicants schedule at **third-country posts** — Amman (Jordan), Ankara/Istanbul (Turkey), Cairo (Egypt) — with ~1–3+ month waits that vary by post. **Apply the moment an interview/acceptance lands, via a third-country post.** A YC acceptance/invitation letter + itinerary + proof of ties strengthens the B-1.
- **O-1A ("extraordinary ability") is the realistic long-term play — and YC acceptance is itself strong evidence for it** (the ~1% selectivity + prestige helps satisfy O-1A criteria: critical role in a distinguished org, membership/achievement, comparable evidence). No annual cap, 3-yr initial validity, work authorization, premium processing (15-day) available. YC explicitly connects accepted international founders with immigration counsel to build the O-1A petition, often self-sponsored via the new US C-corp.
- **The sequence to state in the application:** B-1 (third-country post) for the batch → O-1A after, built on the YC acceptance, with YC's immigration attorneys. This is the documented pattern for non-treaty-country founders (Turkish founders cite exactly this: B-1 in, O-1A after YC). No highly-detailed *Iraqi/Kurdish-specific* YC visa writeup surfaced publicly (low volume / privacy), but YC's FAQ confirms it has helped "hundreds" of international founders with individualized plans.

> **So what for the application "Location" field:** don't hand-wave and don't over-apologize. State it with command: *"We relocate to SF for the batch. ESTA isn't open to Iraqi passports, so we file B-1 through [Amman/Ankara] the moment we're accepted — we've already mapped the third-country post and timeline — then move to O-1A with YC's immigration counsel, using the YC acceptance as the extraordinary-ability basis."* Knowing this chain cold *is itself* the resourcefulness-under-constraint signal YC tests for (§1.2, the "non-computer hack" trait). The constraint becomes evidence, not liability.

### 5.3 The 3-5 highest-leverage moves (Iraq-based, pre-revenue, 2-founder, time-limited)

Ranked by leverage-per-effort given the constraints:

1. **Convert ≥1 of the ~370 prospects (or the 1 demo deal) into a NAMED design partner / LOI before the interview.** This is the highest-leverage move in the entire corpus. The published rule: "$10K MRR growing 20% w/w → no one cares about other risk factors"; pre-revenue, the substitute is *evidence of progress* — a named, quotable design partner clears the "how far along" bar and gives an interview answer to "how many paid pilots?" ([Zyner solo founders](https://zyner.io/blog/yc-solo-founders), [Capwave](https://capwave.ai/blog/blog-how-to-apply-to-y-combinator))

2. **Make the breach→Nango migration the velocity centerpiece**, framed as "isolated behind one interface → migrated in days → zero downtime." YC explicitly optimizes for velocity ("launching in weeks, not months"); a days-long emergency re-architecture is the highest-resolution velocity proof an applicant can show, and reads as *formidability* (the trait YC weighs most). (Detail + sourcing in `2026-05-27-yc-fundraising-refresh.md` §2.)

3. **Record the raw 60-second video with equal airtime** (per §1.3). For a team whose written profile carries a location headwind, the video is where "two real, fast, sharp builders" becomes *seen*. Low effort, disproportionate signal.

4. **Lead the application with the brain + agent, demote the dashboard**, and echo the three RFS-author theses in OpsRadar's own words (per §3.3, §4). Map the one-liner to the intersection: *"AI COO for service businesses, built on a customer-owned company brain (an executable skills file) that makes the business legible to AI."*

5. **State the SF + visa plan explicitly and confidently** (per §5.2) — pre-empt the partner's #1 silent objection about an Iraq-based team. Pair with the "naughtiness/hack" evidence (Iraqi-banking workaround, motorcycle-delivery loop) so the constraint reads as *the determination filter YC tests for*, not a liability.

Headwinds to be honest about: the hard-tech RFS tilt means "another AI software company" competes against agriculture robots and space electronics for attention; the SF-in-person concentration + Iraqi-visa friction are real; pre-revenue + international is the hardest combination in the corpus. The levers above don't erase these — they're the maximum an Iraq-based pre-revenue pair can do in the time window.

---

## Section 6 — Anti-patterns (documented reasons YC rejects)

| Anti-pattern | Source / quote | OpsRadar exposure |
|---|---|---|
| **Tarpit ideas** — "deceptively appealing, positive early feedback, but trap you" (e.g. location-based social, generic marketplaces) | Dalton Caldwell ([Lenny's](https://www.lennysnewsletter.com/p/lessons-from-1000-yc-startups)) | Low — "AI COO for services" is a funded shape, not a tarpit |
| **Vitamin not painkiller** — nice-to-have → slow adoption, deferred purchase | ([vcunfiltered vitamin vs painkiller](https://vcunfiltered.beehiiv.com/p/vitamin-vs-painkiller), [HN thread](https://news.ycombinator.com/item?id=33584809)) | Medium — must frame around $/day of margin leaked + overdue cash, not "insights" |
| **"Just a wrapper"** — a little AI jammed into an old UI; no architectural depth | Pete Koomen "horseless carriage" ([koomen.dev](https://koomen.dev/essays/horseless-carriages/)) | Low if framed as agent-IS-the-product; risk if framed as "AI-enhanced dashboard" |
| **"Convince me this isn't a feature"** — could ClickUp/HubSpot just ship this | Flowjam interview bank ([Flowjam](https://www.flowjam.com/blog/yc-interview-questions-2025)) | Medium — answer with the cross-tool brain + vertical benchmark data moat |
| **No founder-market fit** — picked the idea off a "hot ideas" list | Dalton: don't "build what you think VCs will like" ([Lenny's](https://www.lennysnewsletter.com/p/lessons-from-1000-yc-startups)) | Low — 5 yrs ops + the discovery story (already drafted) |
| **Corporate marketing-speak / jargon** — polishing every sentence into buzzwords | Dalton: "the fastest way to get rejected" ([Lenny's](https://www.lennysnewsletter.com/p/lessons-from-1000-yc-startups)) | Medium — easy slip; have a human flag every buzzword |
| **Claiming no competition** | interview ding ([4dayweek](https://4dayweek.io/interview-process/y-combinator)) | Low — competitor teardowns exist; name BOND/Corvera/ClickUp |
| **Vague metrics / "strong interest"** | rejection pattern ([Founders Corner rejections](https://www.the-founders-corner.com/p/why-39800-yc-applications-get-rejected)) | Medium (pre-revenue) — substitute named design partner + velocity |
| **Mixed identity / unclear who hurts if you vanish** | interview: "obvious who hurts if you stop existing tomorrow" ([Flowjam](https://www.flowjam.com/blog/yc-interview-questions-2025)) | Medium — pick ONE beachhead vertical in the one-liner |
| **"Remove-the-human" autonomous-employee framing** | 11x backlash (see fundraising-refresh §3) | Low — control-first approval gate is the antidote; lean into it |
| **Monologues / over-prepared deck** | interview dings ([Flowjam](https://www.flowjam.com/blog/yc-interview-questions-2025)) | Behavioral — practice 20-sec answers, bring the localhost not slides |

---

## So what for OpsRadar — the application playbook (concrete moves)

1. **One-liner (50 chars):** lead with the role-replacement + vertical. Draft: `AI COO for agencies & service businesses` (40 chars). The longer "what will you make" field carries the brain/agent depth.
2. **"What will you make":** open with the agent + customer-owned brain ("executable skills file"), demote the dashboard (Diana Hu's "not another dashboard"). End with the control-first approval gate as the 11x antidote.
3. **"Why this idea / domain expertise":** use Lawand's 5-yr operations origin story verbatim from `founder-profile.md` Part 9 — it's the strongest founder-market-fit answer in the corpus and directly answers Blomfield's "domain knowledge is the blocker."
4. **"Most impressive thing built" (per founder):** use the drafted Q4 answers (`founder-profile.md` Part 8) — Lawand's self-learning-under-constraint, Atta's ship-since-14. These are *trait evidence*, not resumes.
5. **"Non-computer hack":** the motorcycle-delivery loop (`founder-profile.md`) — a textbook answer.
6. **"How far along / customers":** convert the 1 demo deal into a named design partner this week; quote them. Cite the ~370-prospect pipeline as evidence of motion. Lead the *velocity* answer with the breach→Nango migration.
7. **"Competitors / who you fear":** name BOND (horizontal, left the vertical open), Corvera/FullSeam/Blueshoe (adjacent verticals), ClickUp/HubSpot (the "isn't this a feature" risk — answer with cross-tool brain + benchmark moat).
8. **"Location":** explicit, confident SF commitment + visa plan (B-1/ESTA for batch, O-1A after). Don't hand-wave.
9. **Video:** raw, equal airtime, dense/fast, discovery-first. No production. YouTube unlisted.
10. **Between submit and interview:** ship one visible thing + land the design partner; send a "since we applied, here's what changed" note. This is the highest-leverage interview-window action.

---

## Section 7 — X / real-time signal (pulled 2026-05-27 via Grok)

First-hand and partner posts from X that public web search can't reach. These resolve several of the open questions below and materially sharpen the application playbook.

### 7.1 Garry Tan is publicly building OpsRadar's exact pattern

The YC *president* has, across April–May 2026, described a personal-AI / "company brain" build pattern that is near-identical to OpsRadar's architecture. This is the single most useful application-framing signal in the entire corpus — echo his own language back.

- **The three-file agent constitution (Apr 27, 2026):** *"The secret to an articulate agent isn't one file. It's three: SOUL.md (who the agent IS — a constitution, not a system prompt), USER.md (a deep model of who YOU are, ~4000 words), AGENTS.md (operational rules — brain-first protocols, lookup chains, what to never do)."* ([@garrytan](https://x.com/garrytan/status/2048669695344046090)) → OpsRadar's `SKILL.md` + customer-owned Notion brain + per-agent prompts ARE this pattern, shipped for customers.
- **"Skillify it. Add to cron. Evals." (May 25, 2026):** *"This is exactly how I build my agents and I've built 4 back to back now: both personal AI and company brains. It's the same methods over and over. Do it. Skillify it. Add to cron. Check if it is resolvable. Evals and integration tests. Repeat."* ([@garrytan](https://x.com/garrytan/status/2058871289545466300)) → literally OpsRadar's loop (skills + cron agents + outcome tracking).
- **"Code as memory" (May 10, 2026):** the agent researches once, writes a script, then re-executes it on every future identical task. ([@garrytan](https://x.com/garrytan/status/2053538847795880414)) → the "executable skills file" Blomfield's RFS asks for.
- **Build the cerebellum, not just the prefrontal cortex (May 24, 2026):** *"Everyone building AI agents is focusing on the prefrontal cortex — planning, reasoning. There's value in building the cerebellum: offloading boring tasks into reflex… Your mortgage gets paid by a standing order, not a committee. Most agent frameworks will fail because they treat all cognition as high cognition. The winners will nail the boring stuff first."* ([@garrytan](https://x.com/garrytan/status/2058602658538344546)) → OpsRadar's collections / scope / delivery / briefing agents ARE the cerebellum (the boring, must-be-done ops). **Frame the cron-agent fleet this way in the application.**
- **Vertical whitespace (Feb 22, 2026):** *"Software engineering accounts for nearly 50% of all AI agent tool calls. Healthcare, legal, finance, and a dozen other verticals are barely touched, each under 5%. That's a hundred AI unicorns waiting to be built."* ([@garrytan](https://x.com/garrytan/status/2025394385907761166)) — reinforces Friedman's vertical thesis from the president's chair.
- **@harjtaggar (May 24, 2026):** building agents = "retrieval quality, context engineering, and cross-modal eval loops before anything actually works." ([link](https://x.com/harjtaggar/status/2058646609173610953)) → speak fluently about evals + context engineering in the interview; it's the partners' own vocabulary.

### 7.2 Partner advice on traction honesty + earned insight (application-shaping)

- **Be precise about pilot vs bookings vs revenue vs recurring (Apr 25, 2026):** *"Don't mistake one tier for another. Be precise, and always be truthful."* ([@garrytan](https://x.com/garrytan/status/2048017824895909901)) → for pre-revenue OpsRadar: call the Swish deal a *pilot/demo*, the 370 a *pipeline* — never inflate. Precision reads as formidability.
- **Earned, weird insight beats "AI for X" (May 24, 2026):** *"The founders I love have a specific, weird, earned insight that nobody else has. Not 'AI for X.' A genuine edge that came from living inside a problem. The ones dying: technically competent founders building something nobody asked for… avoiding the conversation with the one user who'd tell them the truth."* ([@garrytan](https://x.com/garrytan/status/2058457353859834142)) → lead with Lawand's lived operations insight, not "AI COO for X."

### 7.3 Funded comp in OpsRadar's EXACT lane (fresh)

- **Memory Store (@memorydotstore), launched ~May 19, 2026, YC-funded:** *"gives your team and AI agents a shared company brain. Your team's knowledge & decisions are scattered across Slack, emails, and people's heads. Memory Store turns them into a living wiki for your agents and teammates."* ([YC launch post](https://x.com/ycombinator/status/2056797036490752082)) → **the closest funded "company brain" comp yet.** Differentiator to draw: Memory Store is a *horizontal* knowledge wiki; OpsRadar is the *vertical, agent-acting, approval-gated* version with the brain as a byproduct of agents doing real ops work. Name it as a competitor.
- Adjacent W26 agent-infra/ops comps to be aware of: **Orthogonal** ("unified API for AI agents," [link](https://x.com/orthogonal_sh/status/2051720023425929325)), **Haladir** ("operational superintelligence" for logistics, [link](https://x.com/Haladirofficial/status/2057319540082737254)), **Truffle AI** (W25, open-source agent orchestration, [link](https://x.com/SVrijraj/status/2054096326309405160)). None occupy the services-COO + customer-owned-brain wedge.

### 7.4 The S26 cycle is live RIGHT NOW

- **Deadline was 2026-05-26 (yesterday).** Interviews are just beginning to ramp; detailed first-hand 10-min interview writeups for S26 don't exist yet (too early).
- **First confirmed S26 acceptance (May 26, 2026):** @safishamsii (Graphify) — *"Applied on May 4th, went through two interviews, and got in last week. The traction and support from the community genuinely made the difference."* ([link](https://x.com/safishamsii/status/2059275039329993029)) → confirms: applied-early, **two** interviews, traction was the differentiator. (Note: this implies the on-time deadline was earlier and there's a rolling/extended tail — verify the live form before assuming the window is closed.)

### 7.5 International founders: relocation is the norm, and YC's immigration help is the *draw*

No partner post says "you must relocate," but every international-founder account treats moving to SF as standard and cites YC's immigration support as a primary reason to apply:

- *"is YC becoming a product for internationals?… their product is particularly attractive to strong international teams that want to move to SF… they seem to be very helpful with immigration at a time when it's particularly painful to move here."* ([@uninsightful, Nov 2025](https://x.com/uninsightful/status/1986611973921120417))
- *"up to 2022… international companies were actually more likely to make YC's 'top companies' list than domestic peers. The benefit was YC, not being in SF."* ([@credistick, Jan 2026](https://x.com/credistick/status/2011516377837027758))
- **Middle-Eastern immigrant founder precedent:** *"@thecto and i are both middle-eastern immigrants who didn't study CS let alone go to a fancy college… we both taught ourselves how to code… that eventually led to @mail0dotcom and then getting into @ycombinator."* ([@nizzyabi, Aug 2025](https://x.com/nizzyabi/status/1952123493497336172)) — closest MENA-adjacent precedent + the self-taught-under-constraint arc mirrors Lawand's.
- Turkish founder (moved to SF for YC, raised $50M+): ([@emiratli_, Mar 2026](https://x.com/emiratli_/status/2032180540204597743)); French small-town founder ([@JohnBanr, Jun 2025](https://x.com/JohnBanr/status/1929567891176984809)) — the "moved with nothing, YC changed everything" arc is the international template.

### 7.6 Breach-recovery reads as *antifragile*, not as a red flag

Investor/security-community sentiment is uniformly positive when a breach is handled with transparency + fast fixes — confirming the "we migrated off in days" framing is a strength:

- **On the Composio breach specifically (May 25, 2026):** *"Credit where it's due: @composio has been exceptional in their communication. Transparent incident report, rapid revocation of affected keys, IP allowlisting, external IR experts. In a world where companies hide breaches for months — this is how you build trust during a crisis."* ([@TheCIOWhisperer](https://x.com/TheCIOWhisperer/status/2058902542856192369)) → independent corroboration of the breach OpsRadar migrated off of.
- *"we recovered fast, patched the vector, hardened every public API… Total impact: 86 minutes. Total outcome: we're stronger than before."* ([@ayushagarwal, Nov 2025](https://x.com/ayushagarwal/status/1992197462149464094)) — the antifragile framing template for OpsRadar's "isolated behind one interface → migrated in days → zero downtime."

> **Net for OpsRadar:** the X signal upgrades three application moves from "good idea" to "echo the president's own published words." (1) Frame the cron-agent fleet as Tan's "cerebellum — nail the boring stuff first." (2) Frame the brain as his SOUL/USER/AGENTS + "skillify it, add to cron, evals" pattern, productized for the customer. (3) Name Memory Store as the horizontal comp you beat on vertical depth + agent action + approval gate. And keep traction language *precise* (pilot ≠ revenue) — Tan called that out twice.

---

## Open questions — RESOLVED + still-open (updated 2026-05-27 with X data)

**Resolved by the X pull:**
- ✅ **S26 deadline**: was **2026-05-26** (yesterday). The cycle is live; interviews ramping. @safishamsii applied May 4, did two interviews, accepted ~May 25–26 — so there's a rolling tail. *Verify the live `apply.ycombinator.com` form before assuming the window is closed.*
- ✅ **MENA precedent**: no Iraqi-specific S26 post found, but self-taught Middle-Eastern immigrant founders have gotten in ([@nizzyabi](https://x.com/nizzyabi/status/1952123493497336172)); international relocation to SF is normalized and YC's immigration help is a stated draw.
- ✅ **Partner sentiment still pro-AI-services/company-brain**: Tan actively boosting the exact pattern through late May 2026 (§7.1) — attention has NOT fully shifted to hard tech for software founders.
- ✅ **Funded comp in-lane**: Memory Store (company brain) is the live one to position against (§7.3).

**Still open (verify before/at submission):**

- **Exact S26 batch size + start date.** FAQ says 3-day retreat + weekly SF meetups but no S26-specific dates; the cycle is confirmed live (§7.4) but dates aren't pinned.
- **Whether the "Claude Code transcript in application" option is live for S26** — verify on the live application form; if real, attach one (Lawand's agentic build history is the asset, and §7.1 shows Tan values exactly this).
- ✅ **Visa-friction reality for an Iraqi passport** — RESOLVED 2026-05-27 (see §5.2 "The actual Iraqi-passport visa path"): no ESTA; B-1 via a third-country post (Baghdad/Erbil processing suspended) for the batch; O-1A after, with YC's immigration counsel, using the acceptance as the extraordinary-ability basis. *(Confirm live embassy status + post wait-times at travel.state.gov before booking; consult the attorney YC provides — not legal advice.)*
- **Is the on-time vs rolling deadline tail still open as of submission day?** @safishamsii's May-4-apply / late-May-accept timing implies a tail; confirm on the live form.

---

## Sources

- [Y Combinator — Interview Guide](https://www.ycombinator.com/interviews)
- [Y Combinator — FAQ (relocation, international, investment)](https://www.ycombinator.com/faq)
- [Y Combinator — The Application Video](https://www.ycombinator.com/video)
- [Y Combinator — Requests for Startups (S26)](https://www.ycombinator.com/rfs)
- [Flowjam — YC Interview Questions 2025 (60+ Q&A)](https://www.flowjam.com/blog/yc-interview-questions-2025)
- [4dayweek — Top 15 YC Interview Questions (2026)](https://4dayweek.io/interview-process/y-combinator)
- [Pilot — How to Ace Your YC Interview](https://pilot.com/blog/tips-y-combinator-interview)
- [Pilot — How to Prepare for Your YC Application Video](https://pilot.com/blog/how-prepare-yc-application-video)
- [Zyner — Ultimate YC Application Video Guide](https://zyner.io/blog/yc-application-video-guide)
- [techwisehub — The Perfect YC Application Video Formula](https://www.techwisehub.com/blog/perfect-yc-application-video)
- [Loula (Onu) — Our Y Combinator Interview Experience](https://joinloula.medium.com/our-y-combinator-interview-experience-6e8a2fe4ea5)
- [wearefounders — How We Nailed YC on Our First Try](https://www.wearefounders.uk/how-we-nailed-yc-on-our-first-try-a-family-affair/)
- [wearefounders — YC Acceptance Rate 2026](https://www.wearefounders.uk/y-combinator-acceptance-rate-2026/)
- [AcceleratorWatch — YC S26 Predictions](https://acceleratorwatch.com/predictions/yc-s26)
- [Extruct — YC W26 Batch Breakdown (199 companies)](https://www.extruct.ai/research/ycw26/)
- [Extruct — YC S25 Batch Analysis](https://www.extruct.ai/blog/ycs25/)
- [catalaize — YC S25 Batch Profile & AI Trends](https://catalaize.substack.com/p/y-combinator-s25-batch-profile-and)
- [Jared Heyman — On the freakishly strong YC W26 batch](https://jaredheyman.medium.com/on-the-freakishly-strong-yc-w26-batch-056ccb666076)
- [YC — BOND company page](https://www.ycombinator.com/companies/bond)
- [YC — BOND launch](https://www.ycombinator.com/launches/Ncl-bond-ai-chief-of-staff-for-ceos-and-busy-execs)
- [The Founders Corner — YC just told you where to build (S26 RFS authors)](https://www.the-founders-corner.com/p/yc-just-told-you-exactly-where-to)
- [The Founders Corner — Why 39,800 YC applications get rejected](https://www.the-founders-corner.com/p/why-39800-yc-applications-get-rejected)
- [The VC Corner — YC S26 RFS: all 15 ideas](https://www.thevccorner.com/p/yc-summer-2026-requests-for-startups-ideas)
- [VC Cafe — RFS Summer 2026 edition](https://www.vccafe.com/2026/04/28/requests-for-startups-summer-2026-edition/)
- [Lenny's Newsletter — Lessons from 1,000+ YC startups (Dalton Caldwell)](https://www.lennysnewsletter.com/p/lessons-from-1000-yc-startups)
- [Zyner — YCombinator Application Guide (2025)](https://zyner.io/blog/ycombinator-application-guide)
- [Zyner — Does YC accept solo founders? (2026)](https://zyner.io/blog/yc-solo-founders)
- [Garry Tan on X — evals as moat / ethnographers in the GDP pie chart](https://x.com/garrytan/status/1892952656940880036)
- [everything.design — Garry Tan "moat is a verb"](https://www.everything.design/blog/build-real-moat-2026)
- [fs.blog Knowledge Project — Garry Tan](https://fs.blog/knowledge-project-podcast/garry-tan/)
- [quasa — Garry Tan on building AI agents (Claude Code transcripts in apps)](https://quasa.io/media/where-to-build-ai-agents-next-y-combinator-president-garry-tan-s-clear-advice-backed-by-fresh-anthropic-data)
- [onecerebral / Jared Friedman — Vertical AI agents 10x bigger than SaaS](https://www.onecerebral.com/p/vertical-ai-agents-could-be-10x-bigger-than-saas)
- [LinkedIn — Jared Friedman on the future of vertical AI agents](https://www.linkedin.com/posts/raadahmed_ycs-jared-friedman-on-the-future-of-vertical-activity-7266955104363196417-v-xb)
- [koomen.dev — AI Horseless Carriages (Pete Koomen)](https://koomen.dev/essays/horseless-carriages/)
- [officechai — YC partners on horseless carriages](https://officechai.com/ai/y-combinator-partners-explain-how-ai-integration-in-apps-needs-to-steer-clear-of-horseless-carriages/)
- [shizune — YC application examples: what is your company going to make](https://shizune.co/yc-application-examples/what-is-your-company-going-to-make)
- [shizune — YC application examples: how do or will you make money](https://shizune.co/yc-application-examples/how-do-or-will-you-make-money)
- [shizune — YC application examples: how far along are you](https://shizune.co/yc-application-examples/how-far-along-are-you)
- [Razorpay — Writing an outstanding YC application](https://razorpay.com/blog/writing-an-outstanding-y-combinator-application/)
- [Capwave — How to apply to YC in 2026](https://capwave.ai/blog/blog-how-to-apply-to-y-combinator)
- [Leland — YC Application Guide (process, questions, deadlines)](https://www.joinleland.com/library/a/yc-application)
- [Vaave — 10 YC questions every entrepreneur should answer](https://medium.com/vaave/10-y-combinator-questions-every-entrepreneur-should-answer-d1a9186a93a1)
- [vcunfiltered — Vitamin vs Painkiller](https://vcunfiltered.beehiiv.com/p/vitamin-vs-painkiller)
- [tryalma — Best visa options for YC founders](https://www.tryalma.com/learn/best-visa-options-yc-company-founders)
- [passright — Visa/green card options for accelerator founders](https://www.passright.com/the-ultimate-guide-for-startup-founders-best-visa-green-card-options-for-y-combinator-techstars-and-other-accelerator-founders-to-stay-in-the-u-s/)

---

*Compiled 2026-05-27. Companion to `what-yc-wants.md` (the strategy) + `2026-05-27-yc-fundraising-refresh.md` (the RFS/breach/intl angle). This doc is the mechanics: how to fill the form, survive the 10 minutes, and which partner thesis to echo.*
