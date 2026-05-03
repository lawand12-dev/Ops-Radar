import { Hono } from "hono";
import { z } from "zod";
import { env } from "../../config/env";
import { AppError } from "../../lib/errors";
import { listN8nCredentials } from "./n8n-client";
import { getCredentialPolicy } from "./credential-policy";
import { detectNodeCredentialTypes, getProjectWithWorkflow } from "../projects/project-service";
import { normalizeWorkflowDefinition } from "../workflows/workflow-normalizer";

const n8nRoutes = new Hono();

const createCredentialSchema = z.object({
  name: z.string().min(2),
  type: z.string().min(2),
  data: z.record(z.unknown()),
  project_id: z.string().min(1)
});

n8nRoutes.get("/credentials", async (c) => {
  const credentials = await listN8nCredentials();
  return c.json({
    items: credentials,
    count: credentials.length
  });
});

n8nRoutes.get("/credentials/schema/:credentialType", async (c) => {
  const credentialType = c.req.param("credentialType");
  if (!credentialType) {
    throw new AppError(400, "BAD_REQUEST", "credentialType is required.");
  }

  const policy = getCredentialPolicy(credentialType);
  return c.json({
    credential_type: credentialType,
    label: policy.label,
    provisioning_mode: policy.mode,
    fields: policy.fields,
    manual_message: policy.manual_message ?? null
  });
});

n8nRoutes.post("/credentials", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createCredentialSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "BAD_REQUEST", "Invalid request body.", parsed.error.issues);
  }

  const snapshot = await getProjectWithWorkflow(parsed.data.project_id);
  if (!snapshot.workflow) {
    throw new AppError(400, "WORKFLOW_NOT_FOUND", "Project has no workflow.");
  }
  if (snapshot.workflow.status === "rejected") {
    throw new AppError(
      409,
      "WORKFLOW_REJECTED",
      "Workflow rejected. Fix validation errors first.",
      {
        workflow_id: snapshot.workflow.id,
        validation_errors: snapshot.workflow.validation_errors ?? []
      }
    );
  }
  if (env.CREDENTIAL_PROVISIONING_MODE === "manual_only") {
    throw new AppError(
      409,
      "CREDENTIAL_MANUAL_ONLY",
      "Credential provisioning is manual-only. Create credentials in n8n dashboard and bind by id/name.",
      {
        n8n_credentials_url: `${env.N8N_BASE_URL.replace(/\/+$/, "").replace(/\/api\/v\d+$/i, "")}/credentials`
      }
    );
  }

  const normalizedWorkflow = normalizeWorkflowDefinition(snapshot.workflow.json);
  const requiredCredentialTypes = new Set<string>();
  for (const node of normalizedWorkflow.nodes) {
    const nodeRecord = node as unknown as Record<string, unknown>;
    for (const credentialType of detectNodeCredentialTypes(nodeRecord)) {
      requiredCredentialTypes.add(credentialType);
    }
  }

  if (!requiredCredentialTypes.has(parsed.data.type)) {
    throw new AppError(
      409,
      "CREDENTIAL_TYPE_NOT_REQUIRED",
      "This credential type is not required by the current workflow.",
      {
        workflow_id: snapshot.workflow.id,
        credential_type: parsed.data.type,
        required_credential_types: Array.from(requiredCredentialTypes)
      }
    );
  }

  const policy = getCredentialPolicy(parsed.data.type);
  throw new AppError(
    409,
    "CREDENTIAL_CREATION_MANUAL_REQUIRED",
    "Credential creation is manual-only. Create this credential in n8n, then bind by id/name.",
    {
      credential_type: parsed.data.type,
      manual_message: policy.manual_message,
      n8n_credentials_url: `${env.N8N_BASE_URL.replace(/\/+$/, "").replace(/\/api\/v\d+$/i, "")}/credentials`
    }
  );
});

export default n8nRoutes;
