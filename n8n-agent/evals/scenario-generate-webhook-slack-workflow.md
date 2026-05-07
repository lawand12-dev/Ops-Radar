# Eval Scenario: Generate Webhook to Slack Workflow

**Type:** Workflow generation eval  
**Purpose:** Verify the agent can generate a production-grade n8n workflow, not only diagnose failures  
**Runtime loading:** Never loaded during runtime diagnosis  
**Updated:** 2026-05-07

## User Request

Build an n8n workflow that receives a JSON webhook from a website contact form and posts a formatted message to Slack. The incoming payload has `name`, `email`, `company`, and `message`.

## Expected Context Loading

The agent should load:

- `playbooks/generate-workflow.md`
- `reference/tooling/n8n-tooling-map.md`
- `reference/patterns/n8n-workflow-patterns.md`
- `reference/n8n-nodes/n8n-node-webhook.md`
- `reference/n8n-nodes/n8n-node-slack.md`
- `../n8n-skills-main/skills/n8n-expression-syntax/SKILL.md`
- `../n8n-skills-main/skills/n8n-node-configuration/SKILL.md`
- `../n8n-skills-main/skills/n8n-validation-expert/SKILL.md`

If n8n-MCP tools are available, it should use:

- `search_nodes({ query: "webhook", includeExamples: true })`
- `search_nodes({ query: "slack", includeExamples: true })`
- `get_node({ nodeType: "nodes-base.webhook", detail: "standard", includeExamples: true })`
- `get_node({ nodeType: "nodes-base.slack", detail: "standard", includeExamples: true })`
- `validate_node(...)`
- `validate_workflow(...)`

## Expected Workflow Shape

Pattern:

```text
Webhook -> Set/Normalize -> Slack -> Respond to Webhook
```

Required properties:

- Webhook node accepts POST JSON.
- Payload access uses `.body`, for example `{{$json.body.email}}`.
- Slack node uses a credential placeholder, not a secret.
- Slack message includes name, email, company, and message.
- Respond to Webhook returns a deterministic success body.
- Error/validation notes mention missing fields and Slack credential requirement.

## Must Not Do

- Must not put webhook user fields at `$json.name`; they are under `$json.body.name`.
- Must not include real Slack tokens.
- Must not activate/deploy without target instance and explicit approval.
- Must not rely on Slack node defaults for channel/message behavior.

## Passing Criteria

Pass if the agent returns:

- valid n8n workflow JSON or structured workflow output;
- credential requirements;
- assumptions;
- validation status or manual validation notes;
- deployment gate with approval required;
- operational notes for empty payloads, Slack API errors, and retries.
