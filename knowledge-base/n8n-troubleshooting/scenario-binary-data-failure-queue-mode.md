---
scenario_id: binary-data-failure-queue-mode
domain: infra
difficulty: easy
ground_truth_label: infra.binary-data-failure
ground_truth_action: notify-human
created: 2026-05-07
provenance: synthetic — based on n8n queue-mode binary handoff limitation documented in n8n community forum and n8n docs (N8N_DEFAULT_BINARY_DATA_MODE)
---

# Scenario: Binary data lost across queue-mode workers (PDF report processor)

A customer migrated their PDF report processing workflow from main mode (single process) to queue mode with 3 workers to handle increased load. The workflow was working perfectly before the migration. Immediately after migration, executions that reach the Code node that reads the PDF binary fail with `ENOENT` errors referencing paths on a different worker's `/tmp` directory. The env var `N8N_DEFAULT_BINARY_DATA_MODE` was never updated from its default value.

## Inputs

### `execution_row`

```json
{
  "id": "exec_pdf_2026_05_07_0814",
  "workflowId": "wf_pdf_report_processor",
  "mode": "trigger",
  "status": "error",
  "finished": true,
  "startedAt": "2026-05-07T08:14:02Z",
  "stoppedAt": "2026-05-07T08:14:09Z",
  "waitTill": null,
  "retryOf": null
}
```

### `execution_data` (subset of `data.resultData`)

```json
{
  "lastNodeExecuted": "Extract PDF Text",
  "error": {
    "name": "NodeOperationError",
    "message": "ENOENT: no such file or directory, open '/tmp/n8n-binary-data/0/1746604442318-pdf-report-q7x2p'",
    "node": "Extract PDF Text",
    "context": {
      "nodeCause": "Binary data not found. The binary file referenced by this item does not exist on this worker.",
      "itemIndex": 0
    }
  },
  "runData": {
    "Webhook": [
      {
        "executionTime": 8,
        "source": [{ "previousNode": null }],
        "data": {
          "main": [[{
            "json": { "filename": "monthly-report-may-2026.pdf", "clientId": "c_8821" },
            "binary": {
              "data": {
                "mimeType": "application/pdf",
                "fileExtension": "pdf",
                "fileSize": 2184302,
                "id": "0/1746604442318-pdf-report-q7x2p",
                "directory": "/tmp/n8n-binary-data"
              }
            }
          }]]
        }
      }
    ],
    "Validate File Type": [
      {
        "executionTime": 3,
        "data": { "main": [[{ "json": { "valid": true } }]] }
      }
    ],
    "Extract PDF Text": [
      {
        "executionTime": 6201,
        "error": "see top-level error"
      }
    ]
  }
}
```

### `workflow_definition` (relevant slice)

```json
{
  "id": "wf_pdf_report_processor",
  "name": "PDF Report Processor — Queue Mode",
  "active": true,
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "httpMethod": "POST",
        "path": "pdf-upload",
        "responseMode": "onReceived",
        "options": { "binaryPropertyName": "data" }
      }
    },
    {
      "name": "Validate File Type",
      "type": "n8n-nodes-base.if",
      "parameters": {
        "conditions": {
          "string": [{ "value1": "={{ $binary.data.mimeType }}", "value2": "application/pdf", "operation": "equal" }]
        }
      }
    },
    {
      "name": "Extract PDF Text",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "const fs = require('fs');\nconst binaryId = $input.first().binary.data.id;\nconst binaryDir = $input.first().binary.data.directory;\nconst filePath = `${binaryDir}/${binaryId}`;\nconst buffer = fs.readFileSync(filePath);\n// ... pdf parsing logic\nreturn [{ json: { text: buffer.toString('base64') } }];"
      }
    },
    {
      "name": "OpenAI — Summarise Report",
      "type": "n8n-nodes-base.openAi",
      "parameters": { "operation": "text", "model": "gpt-4o" }
    },
    {
      "name": "Save to Google Sheets",
      "type": "n8n-nodes-base.googleSheets",
      "credentials": { "googleApi": { "id": "cred_g_002", "name": "Agency Sheets" } }
    }
  ],
  "settings": {
    "executionMode": "queue",
    "timezone": "America/Chicago",
    "executionTimeout": 300
  },
  "tags": ["binary:heavy", "client-facing"],
  "versionId": "v_2026-05-06-2"
}
```

### `external_signals`

```json
{
  "n8n_instance_config": {
    "N8N_DEFAULT_BINARY_DATA_MODE": "default",
    "N8N_BINARY_DATA_STORAGE_PATH": "/tmp/n8n-binary-data",
    "N8N_CONCURRENCY_PRODUCTION_LIMIT": 10,
    "EXECUTIONS_MODE": "queue",
    "QUEUE_BULL_REDIS_HOST": "redis-prod.internal"
  },
  "worker_count": 3,
  "worker_ids": ["worker-1", "worker-2", "worker-3"],
  "worker_health": {
    "worker-1": "healthy",
    "worker-2": "healthy",
    "worker-3": "healthy"
  },
  "migration_history": {
    "previous_mode": "regular",
    "migrated_at": "2026-05-06T18:00:00Z",
    "first_failure_at": "2026-05-06T18:03:21Z"
  },
  "failure_rate_before_migration": 0.0,
  "failure_rate_after_migration": 1.0,
  "filesystem_permissions": {
    "/tmp/n8n-binary-data": { "owner": "node", "mode": "0755", "all_workers_can_read": false, "note": "each worker has its own /tmp; not shared" }
  },
  "recent_errors_same_workflow_last_24h": 47
}
```

### `prior_failures` (last 24 h, same workflow)

```json
[
  { "executionId": "exec_pdf_prev_1", "startedAt": "2026-05-07T07:58:11Z", "status": "error", "error.message": "ENOENT: no such file or directory, open '/tmp/n8n-binary-data/0/1746604042119-pdf-report-a3k9m'" },
  { "executionId": "exec_pdf_prev_2", "startedAt": "2026-05-07T07:44:33Z", "status": "error", "error.message": "ENOENT: no such file or directory, open '/tmp/n8n-binary-data/0/1746603273881-pdf-report-b1j7r'" },
  { "executionId": "exec_pdf_prev_3", "startedAt": "2026-05-07T07:31:09Z", "status": "error", "error.message": "ENOENT: no such file or directory, open '/tmp/n8n-binary-data/0/1746602469554-pdf-report-c5n0w'" },
  { "executionId": "exec_pdf_prev_4", "startedAt": "2026-05-06T18:03:21Z", "status": "error", "error.message": "ENOENT: no such file or directory, open '/tmp/n8n-binary-data/0/1746563001244-pdf-report-d8p4v'" }
]
```

## Expected output

```yaml
expected_label:           infra.binary-data-failure
expected_subtype:         queue-worker-handoff
expected_confidence:      high
expected_action:          notify-human
expected_evidence_keys:
  - N8N_DEFAULT_BINARY_DATA_MODE
  - EXECUTIONS_MODE
  - worker_count
  - error.message
  - error.context.nodeCause
  - migration_history.migrated_at
  - failure_rate_after_migration
  - filesystem_permissions
expected_case_loaded:     cases/binary-data-failure
forbidden_actions:
  - auto-retry              # will fail identically — the binary file from worker-1 is not accessible on worker-2 or worker-3; no amount of retrying changes that
  - auto-cancel-replay      # replay resubmits the same payload; binary is written to whichever worker picks up the job, then read on whichever worker picks up the next node — 2-in-3 chance of a different worker, same ENOENT
```

## Grading notes

The agent should:

1. Walk `decision-trees/failure-diagnosis` and arrive at `infra.binary-data-failure` via the path: `error.name=NodeOperationError + error.message matches /ENOENT|binary data not found/i + EXECUTIONS_MODE=queue`. The `ENOENT` with a `/tmp/n8n-binary-data/` path in queue mode is the canonical fingerprint of a worker-handoff binary loss.

2. Load `cases/binary-data-failure`. Under **Signals — what to check**, item 1 is `N8N_DEFAULT_BINARY_DATA_MODE`. The case file states explicitly: `default` (in-memory, serialized into execution JSON) is **lost across worker handoff**. `external_signals.n8n_instance_config.N8N_DEFAULT_BINARY_DATA_MODE = "default"` — this is the smoking gun.

3. Cross-check the migration history. `migrated_at = 2026-05-06T18:00:00Z`; `first_failure_at = 2026-05-06T18:03:21Z`. The 3-minute gap is a direct causal link. `failure_rate_before_migration = 0.0`, `failure_rate_after_migration = 1.0`. 100% failure rate, started exactly at migration time = not a transient, not a permissions issue.

4. Confirm the binary path structure. `binary.data.id = "0/1746604442318-pdf-report-q7x2p"`, `directory = "/tmp/n8n-binary-data"`. The `/tmp/` prefix is per-container — each worker has its own isolated `/tmp`. Confirming the `filesystem_permissions` note: "each worker has its own /tmp; not shared." The file was written by the worker that handled the Webhook node; the worker that ran Extract PDF Text has a separate `/tmp`.

5. Choose `notify-human` because the fix requires an engineering environment variable change (`N8N_DEFAULT_BINARY_DATA_MODE=s3` for multi-worker, or `filesystem` on a shared NFS mount, per the case file's sub-diagnosis table: "Binary lost across queue workers → switch to S3 if the customer has multi-pod / multi-host workers"). The agent cannot modify env vars.

6. Compose an alert that names the env var (`N8N_DEFAULT_BINARY_DATA_MODE=default`), the sub-diagnosis ("binary data lost on worker handoff in queue mode"), the specific path from the error (`/tmp/n8n-binary-data/0/1746604442318-pdf-report-q7x2p`), the recommended fix (`N8N_DEFAULT_BINARY_DATA_MODE=s3` with S3 bucket configured, or `filesystem` if workers share a PVC), and a note that all 47 failures in the past 24 h are the same root cause.

**Common LLM mistakes on this scenario:**

- **Diagnosing as a file permission error.** The `ENOENT` (no such file or directory) looks like a permissions problem at first glance. A model that doesn't read the binary data mode signal will recommend `chmod` or running workers as the same user — neither of which fixes the cross-worker isolation. The key discriminator: ENOENT for a `/tmp/n8n-binary-data/` path in queue mode with `N8N_DEFAULT_BINARY_DATA_MODE=default` is always a worker-handoff loss, not a permission denied. A permission problem would produce `EACCES`, not `ENOENT`.

- **Treating ENOENT as transient.** Some models see a filesystem error and conclude the file was in the middle of being written (race condition) and recommend `auto-retry`. The prior_failures list showing 47 consecutive failures from the moment of migration rules out transience. If the ENOENT were random (e.g., 30% failure rate), a race condition would be plausible. 100% failure rate = structural.

- **Misidentifying the sub-diagnosis as infra.worker-oom.** Workers are all marked healthy; there is no exit code 137, no heap limit message, no RSS spike. The error is a clean ENOENT, not a crash. The agent should not load `cases/n8n-worker-oom` — the correct case is `cases/binary-data-failure`.

- **Recommending filesystem mode when workers are multi-host.** `cases/binary-data-failure` is explicit: `filesystem` mode only works if workers share the same filesystem. With 3 separate worker containers (each with their own `/tmp`), `filesystem` mode is just as broken as `default` mode — files written to worker-1's `/tmp` are still invisible on worker-2 and worker-3. The correct recommendation for multi-container queue mode is `s3`. An agent that recommends `filesystem` without noting the shared-mount requirement is partially correct at best.

## Variants worth adding later

- Single-worker queue mode (ENOENT with `N8N_DEFAULT_BINARY_DATA_MODE=filesystem`) — in this case the fix is to verify `N8N_BINARY_DATA_STORAGE_PATH` is writable by the worker process, not a multi-worker issue.
- Multi-worker with `N8N_DEFAULT_BINARY_DATA_MODE=filesystem` and a shared NFS PVC — the env var is correct but NFS mount latency causes intermittent ENOENT (file not yet visible on mount). ~30% failure rate, not 100%.
- Binary data mode set to `s3` but S3 credentials expired — ENOENT at the S3 layer, error message differs: `NoSuchKey` from the AWS SDK instead of a POSIX ENOENT.
