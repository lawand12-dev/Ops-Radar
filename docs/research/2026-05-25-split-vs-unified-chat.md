# Research — Split vs unified chat patterns (Notion / Lindy / Devin / Copilot Studio)

> **Research run date**: 2026-05-25
> **Question**: CP-38 — should Q&A and agent-builder live in one chat or two?
> **Status**: raw research output — informs the positioning brief in `docs/positioning/`.
> **Subagent run id**: `ab408304046d6b781` (preserved for audit; transcript at `~/.claude/projects/.../subagents/agent-ab408304046d6b781.jsonl`).

---

I have enough evidence on all four products. Here's the synthesis.

---

## Research findings: Ask AI vs Build Agent surfaces

### 1. Notion 3.3 Custom Agents — **SEPARATE**
Custom Agents are created from a dedicated sidebar section, not from Notion AI Chat. Per Notion's Help Center: *"Go to the `Agents` section in the sidebar and select `+` to create a new Custom Agent"* — with three sub-flows (Create with AI chat / from a template / from scratch). The "Create with AI chat" sub-flow is a builder-scoped chat, not the main Q&A chat. Help docs explicitly distinguish "Notion Agent" (the conversational answer surface) from "Custom Agents" which "follow precise instructions you define" and run on triggers/schedules.
Citation: https://www.notion.com/help/custom-agents and https://www.notion.com/blog/introducing-custom-agents

### 2. Lindy 3.0 — **SEPARATE**
Creation has its own entry point. Per the Lindy Academy "Getting Started 101": *"click the 'New Lindy' button below Home in the top left of your workspace. Then click 'Start from scratch'…"*. Agent Builder (the prompt-to-agent compiler launched in 3.0) is what that button opens — distinct from "Chat with Lindy," which is the runtime surface where you talk to an existing Lindy. Lindy's argument: *"vibe code agents, bringing them from prompt to production in minutes"* (lindy.ai/blog/lindy-3-0) — the builder is the marketed surface, not the chat.
Citation: https://www.lindy.ai/academy-lessons/getting-started-101 and https://www.lindy.ai/blog/lindy-3-0

### 3. Cognition Managed Devins — **SAME**
The main Devin chat IS the spawning surface. Cognition's blog: *"Devin will break down large tasks and delegate them to parallel Devins that each run in their own VM"* and *"The main Devin session acts as a coordinator: it scopes the work, assigns each piece to a managed Devin, monitors progress…"* — no separate builder route. Spawning is delegated by Devin itself in-conversation. Rationale (from the same post): isolation of context windows, not surface separation — *"Each managed Devin gets a clean slate, a narrow focus, its own shell, and its own test runner."*
Citation: https://cognition.ai/blog/devin-can-now-manage-devins

### 4. Microsoft Copilot Studio + M365 Copilot — **MIXED / SEPARATE**
Two surfaces by design. Microsoft Learn: *"Agent Builder is simple, accessible, and integrated with the Microsoft 365 Copilot experience, so you can build agents in context without any code"* — that's lightweight Q&A agents inside the chat. *"The full version of Copilot Studio is a standalone web portal"* for anything needing actions, multi-step workflows, or non-Graph connectors. Microsoft's own framing: start in Copilot, *"copy an agent created in Microsoft 365 Copilot to Copilot Studio when you need advanced capabilities."* So in-chat for simple, separate app for serious.
Citation: https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/copilot-studio-experience

### Synthesis
The dominant pattern is **SEPARATE** (3 of 4: Notion, Lindy, Microsoft). Only Cognition uses the SAME chat, and only because their unit of work is task-delegation between identical Devin instances — not "author a new persistent named employee." Where the artifact is a **named, persistent, triggered/scheduled agent** (Notion Custom Agents, Lindy, M365 agents), every vendor ships a dedicated builder route with its own "+ New" entry point — even when that builder itself uses a chat-like compiler underneath. The disagreement is only about *what* the builder looks like: Notion and Lindy embed a prompt-to-spec compiler in the builder; Microsoft offers both lightweight (in-Copilot) and heavyweight (Copilot Studio portal) builders side-by-side. No vendor in this set merges "ask live questions" and "create a new persistent agent" into one undifferentiated chat.

Sources:
- [Notion blog: Introducing Custom Agents](https://www.notion.com/blog/introducing-custom-agents)
- [Notion Help: Custom Agents](https://www.notion.com/help/custom-agents)
- [Lindy 3.0 launch post](https://www.lindy.ai/blog/lindy-3-0)
- [Lindy Academy: Getting Started 101](https://www.lindy.ai/academy-lessons/getting-started-101)
- [Cognition: Devin can now Manage Devins](https://cognition.ai/blog/devin-can-now-manage-devins)
- [Microsoft Learn: Agent Builder vs Copilot Studio](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/copilot-studio-experience)
