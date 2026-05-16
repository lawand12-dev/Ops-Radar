import type { DeliveryTask, DeliveryData } from '<npm>/lib/integrations/delivery-types';

export type AdapterValidation =
  | { ok: true; externalAccountId: string }
  | { ok: false; reason: 'invalid_key' | 'permission' | 'network'; message: string };

const ENDPOINT = 'https://api.monday.com/v2';

async function gql<T>(token: string, query: string): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '<no body>');
      return { ok: false, status: res.status, error: text };
    }
    const body = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
    if (body.errors?.length) {
      return { ok: false, status: 400, error: body.errors.map((e) => e.message).join('; ') };
    }
    return { ok: true, status: res.status, data: body.data };
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : 'network' };
  }
}

export async function validateMondayToken(token: string): Promise<AdapterValidation> {
  const r = await gql<{ me?: { id?: string; name?: string } }>(token, '{ me { id name } }');
  if (!r.ok) {
    if (r.status === 401 || /authentic|unauthor/i.test(r.error ?? '')) {
      return { ok: false, reason: 'invalid_key', message: 'Monday rejected the token.' };
    }
    if (r.status === 403) {
      return { ok: false, reason: 'permission', message: 'Token lacks permissions.' };
    }
    return { ok: false, reason: 'network', message: r.error ?? `Monday returned ${r.status}` };
  }
  const id = r.data?.me?.id;
  if (!id) {
    return { ok: false, reason: 'network', message: 'Monday response missing user id.' };
  }
  return { ok: true, externalAccountId: id };
}

type MondayBoard = {
  id: string;
  name: string;
  items_page?: { items?: MondayItem[] };
};
type MondayItem = {
  id: string;
  name: string;
  state: string;
  column_values?: Array<{ id: string; type?: string; text?: string | null; value?: string | null }>;
};

export async function fetchMondayDeliveryData(token: string): Promise<DeliveryData> {
  const query = `
    query {
      boards(limit: 10, state: active) {
        id
        name
        items_page(limit: 50) {
          items {
            id
            name
            state
            column_values { id type text value }
          }
        }
      }
    }
  `;
  const r = await gql<{ boards?: MondayBoard[] }>(token, query);
  if (!r.ok) throw new Error(`Monday boards fetch failed: ${r.status} ${r.error ?? ''}`);
  const boards = r.data?.boards ?? [];

  const today = new Date().toISOString().slice(0, 10);
  const tasks: DeliveryTask[] = [];
  for (const board of boards) {
    const items = board.items_page?.items ?? [];
    for (const item of items) {
      if (item.state !== 'active') continue;
      const dateCol = item.column_values?.find(
        (c) => c.type === 'date' || /due/i.test(c.id),
      );
      const dueText = dateCol?.text?.trim() || null;
      const due = dueText && /^\d{4}-\d{2}-\d{2}/.test(dueText) ? dueText.slice(0, 10) : null;
      const overdue = due !== null && due < today;
      const statusCol = item.column_values?.find(
        (c) => c.type === 'status' || /status/i.test(c.id),
      );
      tasks.push({
        id: item.id,
        name: item.name,
        status: statusCol?.text || 'open',
        due_date: due,
        overdue,
        project_name: board.name,
        source: 'monday',
      });
    }
  }
  const slice = tasks.slice(0, 50);
  const overdue_tasks = slice.filter((t) => t.overdue).length;
  const active_projects = new Set(slice.map((t) => t.project_name)).size;
  return { active_projects, overdue_tasks, tasks: slice };
}
