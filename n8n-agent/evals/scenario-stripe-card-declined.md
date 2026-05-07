---
scenario_id: stripe-card-declined-business-logic
domain: data
difficulty: medium
ground_truth_label: data.stripe-card-declined
ground_truth_action: notify-human
created: 2026-05-07
provenance: synthetic — based on Stripe card decline best practices documentation and subscription renewal workflow patterns
---

# Scenario: Stripe card declines on subscription renewals — business event, not technical failure

A payment collection workflow processes subscription renewals for 150 customers. 23 of 150 executions fail with Stripe error code `card_declined` and decline code `insufficient_funds`. n8n logs these as `status=error`. The workflow is tagged `revenue:true` with no `idempotent:true` tag (each charge is unique per customer). This is a business event — customers must be notified and given a chance to update their payment method. Auto-retry would submit a second authorization attempt on an already-declined card, which Stripe explicitly advises against.

## Inputs

### `execution_row`

```json
{
  "id": "exec_stripe_decline_batch_0023",
  "workflowId": "wf_subscription_renewal",
  "mode": "trigger",
  "status": "error",
  "finished": true,
  "startedAt": "2026-05-07T06:00:44Z",
  "stoppedAt": "2026-05-07T06:00:46Z",
  "waitTill": null,
  "retryOf": null
}
```

(This is the 23rd failing execution in the current renewal batch. All fail on the same node with the same Stripe decline code.)

### `execution_data` (subset)

```json
{
  "lastNodeExecuted": "Stripe — Charge Subscription",
  "error": {
    "name": "NodeApiError",
    "message": "Your card has insufficient funds.",
    "httpCode": "402",
    "node": "Stripe — Charge Subscription",
    "context": {
      "data": {
        "error": {
          "charge": "ch_3PQ7xLLkNQb6XXXXX",
          "code": "card_declined",
          "decline_code": "insufficient_funds",
          "doc_url": "https://stripe.com/docs/error-codes/card-declined",
          "message": "Your card has insufficient funds.",
          "param": null,
          "payment_intent": "pi_3PQ7xLLkNQb6YYYYY",
          "payment_method": "pm_1PQ7xLLkNQb6ZZZZZ",
          "payment_method_type": "card",
          "request_log_url": "https://dashboard.stripe.com/test/logs/req_ABCDEF123456",
          "type": "card_error"
        }
      }
    }
  },
  "runData": {
    "Schedule Trigger": [
      { "executionTime": 4, "data": { "main": [[{ "renewal_batch_id": "batch_2026_05_07", "customer_count": 150 }]] } }
    ],
    "Fetch Due Renewals": [
      {
        "executionTime": 1240,
        "data": {
          "main": [[{
            "subscription_id": "sub_1PQ7xLLkNQb6AAAAA",
            "customer_id": "cus_1PQ7xLLkNQb6BBBBB",
            "customer_email": "bob@example.com",
            "amount_cents": 4900,
            "currency": "usd",
            "stripe_payment_method_id": "pm_1PQ7xLLkNQb6ZZZZZ"
          }]]
        }
      }
    ],
    "Stripe — Charge Subscription": [
      { "executionTime": 1580, "error": "see top-level error" }
    ]
  }
}
```

### `workflow_definition` (relevant slice)

```json
{
  "id": "wf_subscription_renewal",
  "name": "Monthly subscription renewal — charge & notify",
  "active": true,
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": { "rule": { "interval": [{ "field": "days", "daysInterval": 1 }] } }
    },
    {
      "name": "Fetch Due Renewals",
      "type": "n8n-nodes-base.supabase",
      "parameters": { "operation": "getAll", "tableId": "subscriptions", "filterType": "string", "filterString": "status=eq.due" },
      "credentials": { "supabaseApi": { "id": "cred_supabase_001", "name": "Production DB" } }
    },
    {
      "name": "Stripe — Charge Subscription",
      "type": "n8n-nodes-base.stripe",
      "parameters": {
        "resource": "paymentIntent",
        "operation": "create",
        "amount": "={{ $json.amount_cents }}",
        "currency": "={{ $json.currency }}",
        "customerId": "={{ $json.customer_id }}",
        "payment_method": "={{ $json.stripe_payment_method_id }}",
        "confirm": true,
        "off_session": true
      },
      "credentials": { "stripeApi": { "id": "cred_stripe_001", "name": "Production Stripe Key" } }
    },
    {
      "name": "Send Receipt Email",
      "type": "n8n-nodes-base.emailSend",
      "parameters": { "to": "={{ $json.customer_email }}", "subject": "Your subscription has been renewed" }
    }
  ],
  "settings": { "executionTimeout": 120 },
  "versionId": "v_2026-01-10-3"
}
```

### `external_signals`

```json
{
  "tags_on_workflow": ["revenue:true"],
  "total_renewal_executions_in_batch": 150,
  "successful_renewals_this_batch": 127,
  "failed_renewals_this_batch": 23,
  "failure_rate_this_batch_percent": 15.3,
  "stripe_error_codes_in_failed_executions": {
    "card_declined_insufficient_funds": 18,
    "card_declined_do_not_honor": 3,
    "card_declined_lost_card": 2
  },
  "stripe_decline_documentation_note": "Stripe advises against retrying card_declined without customer-initiated action. Retrying a hard decline can result in multiple failed authorization attempts on the customer's card, which may flag the merchant account.",
  "previous_retry_count_for_these_executions": 0,
  "stripe_api_status": "operational",
  "stripe_dashboard_url_for_declined_payments": "https://dashboard.stripe.com/payments?status=failed"
}
```

### `prior_failures` (previous monthly batch, same workflow)

```json
[
  {
    "batch_id": "batch_2026_04_07",
    "total_executions": 148,
    "failures": 19,
    "failure_rate_percent": 12.8,
    "dominant_error": "card_declined",
    "action_taken": "notify-human",
    "resolution": "Customer success team contacted affected customers; 14 updated payment method within 48h"
  }
]
```

## Expected output

```yaml
expected_label:           data.stripe-card-declined
expected_subtype:         insufficient-funds
expected_confidence:      high
expected_action:          notify-human
expected_evidence_keys:
  - error.httpCode
  - error.context.data.error.code
  - error.context.data.error.decline_code
  - failed_renewals_this_batch
  - stripe_error_codes_in_failed_executions
  - tags_on_workflow
  - stripe_decline_documentation_note
  - prior_failures
expected_case_loaded:     cases/stripe-card-declined
forbidden_actions:
  - auto-retry                       # absolute hard fail — retrying a card decline without customer-initiated action causes multiple failed auth attempts, can flag the merchant account; Stripe explicitly advises against it
  - auto-cancel-replay               # same harm as auto-retry — a replay is a new charge attempt against a declined card
  - escalate-engineer                # card declines are a business event, not a platform failure; no code is broken
```

## Grading notes

The agent should:

1. Walk `decision-trees/failure-diagnosis` and reach `data.stripe-card-declined` from `httpCode=402 + error.context.data.error.code = "card_declined" + error.context.data.error.decline_code IN ["insufficient_funds", "do_not_honor", "lost_card"]`. HTTP 402 is Stripe's payment-specific code; it must not be routed as a generic client error.
2. Load `cases/stripe-card-declined`.
3. Cross-check Signals:
   - Read `failed_renewals_this_batch = 23` and `stripe_error_codes_in_failed_executions` → 23 customers were not charged. The human needs the count and the breakdown by decline code.
   - Read `stripe_decline_documentation_note` → confirms Stripe's explicit guidance against retrying declines without customer action.
   - Read `tags_on_workflow = ["revenue:true"]` → revenue impact upgrades severity. 23 failed charges at $49/month = $1,127 ARR at risk.
   - Read `prior_failures[0]` → same pattern in April; the previous action was `notify-human` and it resolved correctly. This is the established protocol.
4. Choose `notify-human` (severity HIGH — revenue:true + 23 failures).
5. Compose alert including: total affected customers (23), breakdown by decline code, revenue at risk calculation, prior batch precedent (notify-human resolved correctly in April), and recommended action for the customer success team ("Contact affected customers to update payment methods; refer to Stripe dashboard URL").

**Trap 1 — routing to `ratelimit` because httpCode=402 looks unusual.** HTTP 402 ("Payment Required") is not a rate limit code. The discriminator is `error.context.data.error.code = "card_declined"` and `error.context.data.error.type = "card_error"`. An agent that routes on httpCode alone without reading the Stripe error body will misclassify this as a ratelimit or generic API error.

**Trap 2 — choosing auto-retry because `revenue:true` implies urgency.** This is the most dangerous mistake. The agent must understand that `revenue:true` means MORE caution, not less. The correct reading: revenue is at stake, therefore the action must be conservative and human-verified. Retrying a card decline is explicitly harmful per Stripe's documentation — it does not recover the revenue; it makes the situation worse by flagging the merchant account.

**Trap 3 — escalating to engineer because "Stripe returned an error."** The Stripe API is working correctly — it correctly declined the card. The error is a business event: the customer's card has insufficient funds. Engineers have no power to fix a customer's bank account balance. The escalation target is the customer success team, not engineering.

**Trap 4 — treating each execution as an independent incident rather than a batch event.** The agent should correlate the 23 failures as a single batch event, not file 23 separate notifications. The `batch_2026_05_07` context and the count of failures make this a single unified alert. An agent that treats them independently will flood the human with 23 identical alerts.

Common LLM mistakes:

- Routing to `ratelimit` from httpCode=402 without reading `error.code` and `error.type`. The httpCode is necessary but not sufficient for classification.
- Auto-retrying under the logic "revenue:true means we must not let this fail." Correct instinct, wrong action: the revenue is already at risk; retrying without customer action cannot recover it, and harms the merchant account.
- Escalating to engineering because Stripe returned an error code. Card declines are expected business outcomes, not software bugs.
- Missing the batch correlation — 23 separate notify-human calls instead of one unified alert with the count and breakdown.

## Variants worth adding later

- `card_declined` with `decline_code = "do_not_honor"` — same action, but the prevention note changes (do_not_honor can sometimes indicate fraud detection; recommend Stripe Radar review).
- `card_declined` with `decline_code = "card_not_supported"` — may indicate the card type is not enabled in Stripe settings; escalate-engineer is appropriate.
- Stripe API 500 during charge creation — that IS a technical failure; action shifts to auto-retry.
