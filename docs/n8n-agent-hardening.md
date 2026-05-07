# n8n Agent And Operations Hardening Backlog

This is the implementation backlog for the last step in the research order:
make the n8n-agent better, then harden production operations.

## Agent Build Loop

Use the n8n instance-level MCP server when available. The target loop for any
agent-authored workflow is:

1. Capture workflow intent, external systems, mutation risk, owner, and rollback path.
2. Search node types and SDK references before writing workflow code.
3. Generate workflow code or JSON.
4. Validate before saving with `validate_workflow`.
5. Prepare pin data for triggers, credentialed nodes, and HTTP nodes.
6. Test with pinned data using `test_workflow` before any production execution.
7. Require human approval before publishing or activating.
8. Publish only after validation, pin-data test, and owner signoff.

Sources:
- n8n MCP server setup: https://docs.n8n.io/advanced-ai/mcp/accessing-n8n-mcp-server/
- n8n MCP tools reference: https://docs.n8n.io/advanced-ai/mcp/mcp_tools_reference/

## Agent Safety Rules

High-trust actions can be automated after validation:
- Internal classification.
- Data extraction.
- Draft generation stored internally.
- Read-only enrichment.
- Internal alerts.

Human approval is required before tools that:
- Send client-facing messages.
- Modify CRM, PM, billing, ads, or reporting records.
- Delete, merge, refund, charge, or change budgets.
- Expose private client data to another system.

Implementation pattern:
- Use deterministic nodes for routing and validation where possible.
- Use AI for language-heavy extraction, summarization, draft generation, and semantic matching.
- Add a validation node or second model check before downstream systems consume model output.
- Route low confidence, schema failure, or source mismatch to review.

Source:
- n8n human-in-the-loop tool calls: https://docs.n8n.io/advanced-ai/human-in-the-loop-tools/

## RAG Agent Notes

For n8n-hosted RAG:
- Insert documents into a vector store through a dedicated ingestion workflow.
- Keep query workflows separate from ingestion workflows.
- Prefer persistent vector stores for production. The Simple Vector Store is useful for demos but is memory-backed and has Cloud limits.
- Attach the vector store as a tool only when the agent needs search. Use direct retrieve nodes for deterministic Q&A flows.
- Track source IDs in every answer so the agent cannot cite memory or model knowledge as if it came from the KB.

Source:
- RAG in n8n: https://docs.n8n.io/advanced-ai/rag-in-n8n/

## Production Hardening

Every production workflow should have:
- Workflow-level error workflow configured.
- `Stop and Error` nodes after validation failures that must alert operators.
- Execution data settings that avoid saving unnecessary successful payloads.
- Pruning enabled and sized for the client volume.
- Custom execution data for workflow ID, client ID, source record ID, destination record ID, and retry count.
- Workflow notes with owner, cadence, expected counts, rollback switch, and escalation channel.

Sources:
- Error handling: https://docs.n8n.io/flow-logic/error-handling/
- Execution data: https://docs.n8n.io/hosting/scaling/execution-data/

## Scale And Security

For self-hosted production instances:
- Use queue mode when concurrency grows beyond a single process.
- Use Redis and separate workers for execution load.
- Do not use filesystem binary storage with queue mode; use external storage or database-compatible mode.
- Run n8n security audits regularly.
- Use external secrets where the plan supports it.
- Use source control environments for dev/test/prod workflow promotion.

Sources:
- Queue mode: https://docs.n8n.io/hosting/scaling/queue-mode/
- Security audit: https://docs.n8n.io/hosting/securing/security-audit/
- Source control environments: https://docs.n8n.io/source-control-environments/setup/
- External secrets: https://docs.n8n.io/external-secrets/

## Next Implementation Tasks

1. Confirm the live n8n version and whether instance-level MCP is enabled.
2. Create a small "agent workflow build" eval set: 10 workflow specs, expected nodes, required safety gates.
3. Build a validator wrapper that refuses publish/activate unless validation and pin-data tests pass.
4. Add a production workflow template with error workflow, notes, audit logging, and approval gates.
5. Add a weekly n8n audit workflow that reports risky nodes, unprotected webhooks, unused credentials, and outdated instances.
