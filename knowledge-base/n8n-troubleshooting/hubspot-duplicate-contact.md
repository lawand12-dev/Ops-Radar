# Case: HubSpot duplicate-contact conflict

**Type:** Labeled failure case
**Diagnosis label:** `data.duplicate-hubspot`
**Routes from:** `decision-trees/failure-diagnosis` (httpCode=409 on a HubSpot node)
**Auto-handle safety:** No data writes are auto-applied. Agent recommends node-config change (Create-or-Update). Auto-retry is unsafe — same payload will produce same conflict.
**Updated:** 2026-05-07

## Input — what the error looks like

```jsonc
{
  "name": "NodeApiError",
  "node": "HubSpot",
  "httpCode": "409",
  "message": "Contact already exists. Existing ID: 5234801",
  "description": "...",
  "context": {
    "data": {
      "status": "error",
      "category": "CONFLICT",
      "subCategory": "ContactsApi.PROPERTY_DOESNT_EXIST" /* or null */,
      "message": "Contact already exists. Existing ID: 5234801",
      "correlationId": "...",
      "context": { "id": ["5234801"] }
    }
  }
}
```

Variants:

- HTTP `400` with `category: "VALIDATION_ERROR"` and `message` mentioning "duplicate" — older API path.
- `409` from a Company / Deal / Ticket endpoint — same shape, different object type.
- `409` with `subCategory: "PIPELINE_STAGE_DOESNT_EXIST"` — **not** a duplicate; route as `data.validation` instead.

## Signals — what to check

1. **The HubSpot operation invoked:** in `workflow_entity.nodes`, find the HubSpot node and read `parameters.operation`:
   - `"create"` (Contact / Company / Deal) → this is the error-prone path.
   - `"createOrUpdate"` / `"upsert"` → conflicts of this kind shouldn't happen; investigate further.
2. **Match property used:** for `createOrUpdate`, HubSpot needs an explicit unique-property to upsert against (`email` for contacts, `domain` for companies). If the workflow passed `email: ""` or omitted it, HubSpot can't match and falls back to create — causing 409.
3. **Existing record ID:** the error's `context.data.context.id[0]` returns the ID of the existing record. The agent records this for the report; the engineer can inspect the existing record to decide merge vs skip vs update.
4. **Frequency:** how often is this error occurring? A single 409 per day = harmless input dirty data. Ten 409s per hour for the same workflow = the workflow is misconfigured.
5. **Recent association calls:** if the failing HubSpot node is part of a chain that creates contact + company + deal with associations, a duplicate-contact failure may abort the deal too — leaving partial state in HubSpot.

## Correct diagnosis — what it actually is

The workflow is using the **Create** operation when it should be using **Create or Update** (upsert). HubSpot's contacts API is keyed on email; any retry / replay of a workflow that creates a contact for a known email will 409.

Sub-diagnoses:

| Sub-diagnosis | Signal | Engineering action |
|---|---|---|
| Wrong operation chosen | `parameters.operation = "create"` | Switch to `createOrUpdate` |
| Upsert without match property | `parameters.operation = "createOrUpdate"` AND `email` field empty | Set the match property correctly; validate input upstream |
| Duplicate detection from human input | Two different leads → same email (free-mail providers) | Add a dedup `If` node before the HubSpot node |
| HubSpot allows duplicates by domain config | Customer has duplicate-detection disabled in HubSpot settings | Recommend enabling; out-of-scope for the workflow |
| Race: two webhooks for the same lead arrive in parallel | Worker logs show two executions starting within ms | Add idempotency key (lead ID) before the HubSpot call |

## Fix — exact steps to resolve

> **Safety:** No data writes by the agent. The agent only stops the failed execution and posts recommendations. Engineering applies the workflow change.

1. **Stop any retry loop.** If the failed execution has been auto-retried by `decision-trees/recovery-routing`, halt further retries by recording an `auto-retry-suppress` flag for this workflow in the agent's state. **Same payload + same workflow = same 409 forever.**
2. **Recover the existing record's ID** from `error.context.data.context.id[0]`. Add it to the customer's incident timeline so the engineer can inspect the existing contact.
3. **Recommend operation change:**
   - For Contacts: switch the HubSpot node from `Create` to `Create or Update` (n8n calls this `createOrUpdate`); the n8n node accepts an `email` field as the match property.
   - For Companies: switch to `Create or Update` and pass `domain`.
   - For Deals: HubSpot has no native upsert. Use `Search Deal by Name` first; if found, `Update`; if not, `Create`.
4. **Add a dedup gate.** Before the HubSpot node, recommend a `Set` node that normalizes the email (lowercase, trim) and an `If` node that drops empty-email items. Most "duplicates" come from form data with whitespace or capitalization variants.
5. **Reconcile partial chain.** If contact creation was step 1 of a contact→company→deal chain, the deal may be missing. The agent emits `notify-human` with the existing contact ID so engineering can complete the chain.
6. **Decide replay safety.** If the workflow is now changed to `createOrUpdate`, the original failed execution **can** be replayed safely; if not, replaying repeats the 409. The agent must check workflow `versionId` before replaying — only replay if `versionId` advanced after the engineer applied the fix.

## Prevention — how to avoid next time

Add to the customer's `playbooks/report-to-agency` recommendations:

- **Default to `createOrUpdate` for HubSpot Contact and Company nodes.** The `Create` operation should be reserved for cases where duplicate detection is the explicit goal (lead-quality checks).
- **Validate input before HubSpot.** A `Set` + `If` pair that lowercases email, trims whitespace, and drops blanks prevents most "phantom" duplicates from form weirdness.
- **Use idempotency keys for parallel webhooks.** If the same lead can hit n8n twice within seconds (form double-submit, retry storm), guard the HubSpot call with an external lock keyed on lead ID — Postgres advisory lock or Redis SETNX both work.
- **Don't fan out before the dedup point.** A common anti-pattern: split-in-batches, then HubSpot Create per item. If two items in the same batch have the same email, HubSpot 409s on the second. Dedup the batch before the loop.
- **Tag deal-creation workflows with the contact-association requirement.** When a contact 409s and the workflow is non-idempotent, the agent's report must explicitly say "deal/company creation may have skipped" so engineering can reconcile.

## Cross-references

`decision-trees/failure-diagnosis` · `decision-trees/error-classification` (subtype `data.duplicate`) · `decision-trees/recovery-routing` (must NOT auto-retry) · existing knowledge-base/tools/api-hubspot · existing knowledge-base/tools/n8n-node-hubspot
