import { isDuplicate } from '../dedup';
import type { ClientN8nConfig } from '<npm>/lib/client-n8n';
import type { NewAction, WorkflowFailurePayload, UserContext } from '../types';

const FAILURE_THRESHOLD = 3;

type N8nExecution = {
  id: string;
  workflowId: string;
  workflowData?: { name?: string };
  startedAt?: string;
};

type N8nExecutionListResponse = {
  data?: N8nExecution[];
};

export async function evalWorkflowFailures(
  ctx: UserContext,
  n8nConfig: ClientN8nConfig,
): Promise<NewAction[]> {
  if (!n8nConfig.n8nApiKey) return [];

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  let executions: N8nExecution[];
  try {
    const res = await fetch(
      `${n8nConfig.n8nBaseUrl}/api/v1/executions?status=error&limit=100`,
      {
        headers: {
          'X-N8N-API-KEY': n8nConfig.n8nApiKey,
          'Content-Type': 'application/json',
        },
      },
    );
    if (!res.ok) return [];
    const body = (await res.json()) as N8nExecutionListResponse;
    executions = (body.data ?? []).filter(
      (e) => e.startedAt && e.startedAt >= since,
    );
  } catch (err) {
    console.warn('[evalWorkflowFailures] n8n fetch failed:', err);
    return [];
  }

  const byWorkflow = new Map<string, { name: string; count: number; lastAt: string }>();
  for (const ex of executions) {
    const id = ex.workflowId;
    if (!id) continue;
    const name = ex.workflowData?.name ?? 'Unnamed workflow';
    const startedAt = ex.startedAt ?? new Date().toISOString();
    const cur = byWorkflow.get(id) ?? { name, count: 0, lastAt: startedAt };
    cur.count += 1;
    if (startedAt > cur.lastAt) cur.lastAt = startedAt;
    byWorkflow.set(id, cur);
  }

  const actions: NewAction[] = [];

  for (const [workflowId, info] of byWorkflow) {
    if (info.count < FAILURE_THRESHOLD) continue;

    const dup = await isDuplicate(ctx.userId, 'workflow_failure', 'n8n_workflow_id', workflowId);
    if (dup) continue;

    const payload: WorkflowFailurePayload = {
      n8n_workflow_id: workflowId,
      workflow_name: info.name,
      failure_count: info.count,
      last_failed_at: info.lastAt,
      n8n_base_url: n8nConfig.n8nBaseUrl,
    };
    actions.push({ action_type: 'workflow_failure', payload });
  }

  return actions;
}
