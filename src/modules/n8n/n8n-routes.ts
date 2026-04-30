import { Hono } from "hono";
import { z } from "zod";
import { AppError } from "../../lib/errors";
import { createN8nCredential, getN8nCredentialSchema, listN8nCredentials } from "./n8n-client";

const n8nRoutes = new Hono();

const createCredentialSchema = z.object({
  name: z.string().min(2),
  type: z.string().min(2),
  data: z.record(z.unknown())
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

  const schema = await getN8nCredentialSchema(credentialType);
  return c.json(schema);
});

n8nRoutes.post("/credentials", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createCredentialSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "BAD_REQUEST", "Invalid request body.", parsed.error.issues);
  }

  const created = await createN8nCredential(parsed.data);
  return c.json(created, 201);
});

export default n8nRoutes;
