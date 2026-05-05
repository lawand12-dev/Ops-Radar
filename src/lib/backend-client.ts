const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

export async function generateWorkflow(prompt: string) {
  return fetch(`${BACKEND_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: prompt }),
  }).then((r) => r.json())
}

export async function getWorkflowHealth(workflowId: string) {
  return fetch(`${BACKEND_URL}/events/${workflowId}`).then((r) => r.json())
}
