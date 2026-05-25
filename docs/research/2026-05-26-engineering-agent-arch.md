# Engineering research — Agent architecture (orchestrator-worker, delegation, HITL, charters, Apprentice Mode)

> **Research run date**: 2026-05-26
> **Question**: Is OpsRadar's agent architecture still aligned with 2026 consensus? 7 questions.
> **Status**: raw research output — informs the engineering verdict at `docs/adr/0009-engineering-stack-2026.md`.
> **Subagent run id**: `a2f1202785ae7f37f` (preserved for audit).

---

I have enough research now. Let me synthesize the answer.

# 2026 Consensus Stress-Test of OpsRadar's Agent Architecture

**1. Orchestrator-worker vs flat vs swarm.** Consensus: five major vendors (Anthropic, OpenAI, AutoGen, Cognition's post-mortem, LangChain) converged on **orchestrator + isolated sub-agents** as the 2026 default; Cognition's "Don't Build Multi-Agents" only rejects *parallel uncoordinated* sub-agents, not hierarchical delegation ([Anthropic engineering](https://www.anthropic.com/engineering/built-multi-agent-research-system), [Cognition](https://cognition.ai/blog/dont-build-multi-agents), [LangGraph supervisor](https://reference.langchain.com/python/langgraph-supervisor)). OpsRadar's CP-19 pattern (domain agents read Notion-blackboard first, fan out to tool agents only to fill gaps, max 3 actions) **holds** — it is exactly the Anthropic 4-field contract plus a blackboard, which is also the arXiv 2510.01285 pattern.

**2. Manager/report `triggerAndWait`.** Consensus: durable pause-and-wait via checkpoint-resume is the 2026 production shape for long-horizon agent delegation; Trigger.dev v4, OpenAI Agents SDK handoffs, and LangGraph all converged on it ([Trigger.dev AI agents](https://trigger.dev/product/ai-agents), [OpenAI Agents handoffs](https://openai.github.io/openai-agents-python/handoffs/)). CP-37's `delegate_to_employee` over `tasks.triggerAndWait` **holds**. Minor drift: pair every wait with a **waitpoint token** for HITL escape so a stuck delegate can be human-released.

**3. HITL / approval defaults.** Consensus: HITL is the architectural standard for 2026; 90% of fully autonomous deployments fail long-horizon tasks; "identity-aware orchestration with time-boxed approval windows + full audit" is the floor ([Strata 2026 HITL guide](https://www.strata.io/blog/agentic-identity/practicing-the-human-in-the-loop/), [Cresta Agent Operations Center](https://cresta.com/agent-operations-center), [Anthropic on autonomy](https://www.anthropic.com/research/measuring-agent-autonomy)). OpsRadar's CP-14 Ask/Auto/Off **holds**, but the *default* should be **Ask** for writes and **Auto** for reads — autonomy earned, not granted. Add time-boxed expiry on queued approvals (Cresta pattern).

**4. Capability declaration (CHARTER.md vs A2A Agent Card vs Skills).** Consensus: the standard has converged on **A2A Agent Card at `/.well-known/agent-card.json`** for inter-agent discovery (150+ orgs incl. Google, Microsoft, AWS, Salesforce, ServiceNow as of April 2026); Anthropic Skills are the *intra-agent* capability format ([A2A AgentCard spec](https://agent2agent.info/docs/concepts/agentcard/), [Copilot Studio A2A GA](https://learn.microsoft.com/en-us/microsoft-copilot-studio/add-agent-agent-to-agent)). OpsRadar's CP-39 CHARTER.md **drifts**. Change: keep CHARTER.md as the human-edited source, but **compile it to A2A AgentCard JSON** at `/api/employees/[slug]/.well-known/agent-card.json`. Free interop with Copilot Studio / Salesforce Agentforce / ServiceNow.

**5. System-prompt-as-code vs as-data.** Consensus: prompts are first-class versioned artifacts in git (Markdown or YAML), loaded into a runtime cache; hardcoding violates separation of concerns ([Agenta versioning guide](https://agenta.ai/blog/prompt-versioning-guide), [LaunchDarkly prompt management](https://launchdarkly.com/blog/prompt-versioning-and-management/)). `buildCooSystemPrompt(...)` template functions **partially drift**. Change: move the static spine of each prompt to `prompts/<slug>/v<n>.md`, keep the template function as the *interpolator*, log the file's git SHA into Langfuse traces.

**6. Named AI employees with chat threads.** Consensus: Notion 3.3 Custom Agents (Feb 24, 2026 — 21k built in beta, "Onboarding Eddie / IT Hero / Sales Detective" shape) and Lindy 2026 both canonicalize: **named persona + system prompt + schedule + scoped tools + scoped memory + per-agent chat surface** ([Notion 3.3 release](https://www.notion.com/releases/2026-02-24), [Lindy AI employee guide](https://www.lindy.ai/blog/ai-employee)). OpsRadar's `custom_employees` shape **holds exactly**. No change.

**7. Apprentice mode / learning from rejection.** Consensus has shifted from per-rejection rule-writing to **GEPA-style reflective prompt evolution** (ICLR 2026 Oral, beats RL with ~35× fewer rollouts; ingests *textual* feedback not just scalar reward) ([GEPA paper](https://arxiv.org/pdf/2507.19457), [DSPy GEPA tutorial](https://dspy.ai/tutorials/gepa_ai_program/)). OpsRadar's append-a-markdown-rule pattern **partially drifts** — it works but is the 2024 Reflexion shape. Change: keep the per-rejection rule file as ground-truth feedback, but run a weekly GEPA pass that distills accumulated rejections into a new system-prompt version (compiles rules → behavior).

---

**OpsRadar's agent architecture is ~80% aligned with 2026 consensus.**

Top 3 changes ranked by impact:
1. **Compile CHARTER.md → A2A AgentCard** at `.well-known/agent-card.json` per employee — unlocks free interop with Microsoft / Google / Salesforce agent ecosystems, near-zero implementation cost.
2. **Versioned prompt files + git-SHA logging** — replace inline `buildCooSystemPrompt` with `prompts/<slug>/v<n>.md` loaded at boot; tag every Langfuse trace with the prompt SHA. Unblocks safe prompt experimentation and rollback.
3. **GEPA-style weekly distillation pass** over `learn-from-rejection` outputs — keep per-rejection markdown rules as feedback corpus, add a Trigger.dev weekly job that uses reflective evolution to produce the next prompt version. Moves OpsRadar from rule-accumulation (degrades over time) to prompt-evolution (compounds).

Sources:
- [Anthropic — Built multi-agent research system](https://www.anthropic.com/engineering/built-multi-agent-research-system)
- [Cognition — Don't Build Multi-Agents](https://cognition.ai/blog/dont-build-multi-agents)
- [LangGraph supervisor reference](https://reference.langchain.com/python/langgraph-supervisor)
- [OpenAI Agents SDK — Handoffs](https://openai.github.io/openai-agents-python/handoffs/)
- [OpenAI Agents SDK — Agents](https://openai.github.io/openai-agents-python/agents/)
- [Trigger.dev — AI agents product](https://trigger.dev/product/ai-agents)
- [Cresta — Agent Operations Center](https://cresta.com/agent-operations-center)
- [Strata — Practicing HITL 2026](https://www.strata.io/blog/agentic-identity/practicing-the-human-in-the-loop/)
- [Anthropic — Measuring agent autonomy](https://www.anthropic.com/research/measuring-agent-autonomy)
- [Anthropic — Equipping agents with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [A2A AgentCard spec](https://agent2agent.info/docs/concepts/agentcard/)
- [Microsoft Learn — A2A in Copilot Studio](https://learn.microsoft.com/en-us/microsoft-copilot-studio/add-agent-agent-to-agent)
- [Microsoft Learn — Declarative Agent schema 1.2](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/declarative-agent-manifest-1.2)
- [Notion 3.3 — Custom Agents release](https://www.notion.com/releases/2026-02-24)
- [Lindy — What is an AI employee](https://www.lindy.ai/blog/ai-employee)
- [GEPA paper — ICLR 2026 Oral](https://arxiv.org/pdf/2507.19457)
- [DSPy GEPA tutorial](https://dspy.ai/tutorials/gepa_ai_program/)
- [Agenta — Prompt versioning guide](https://agenta.ai/blog/prompt-versioning-guide)
- [LaunchDarkly — Prompt versioning & management](https://launchdarkly.com/blog/prompt-versioning-and-management/)
