import { z } from "zod";
import { AppError } from "../../lib/errors";
import { env } from "../../config/env";
import { logDebug, logInfo, logWarn } from "../../lib/logger";
import type {
  AiWorkflowOutput,
  FailureAnalysis,
  N8nConnections,
  N8nConnectionTarget,
  N8nNode,
  N8nWorkflow
} from "../../types/workflow";
import { validateWorkflowStructure } from "../validation/workflow-validator";

const WORKFLOW_SYSTEM_PROMPT = [
  env.AI_SYSTEM_PROMPT,
  "You must return only valid JSON.",
  "Act as a senior n8n automation engineer.",
  "Detect trigger type (schedule/webhook/manual) and proper action nodes.",
  "Use this exact JSON shape:",
  '{ "project_name": "", "description": "", "workflow": { "nodes": [], "connections": {} } }',
  "Every node must include: id (string), name (string), type (string), typeVersion (number), position ([x,y]).",
  "Never include reasoning_content or explanations.",
  "Never omit node.id.",
  "Never return markdown."
].join("\n");

const ANALYSIS_SYSTEM_PROMPT = [
  "You are a senior n8n reliability engineer.",
  "Analyze workflow failures and provide concrete fix suggestions.",
  "Return only JSON with fields: issue, reason, solution.",
  "Do not include markdown."
].join("\n");

const WORKFLOW_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["project_name", "description", "workflow"],
  properties: {
    project_name: { type: "string", minLength: 3, maxLength: 128 },
    description: { type: "string", minLength: 8, maxLength: 2000 },
    workflow: {
      type: "object",
      additionalProperties: false,
      required: ["nodes", "connections"],
      properties: {
        nodes: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            required: ["id", "name", "type"],
            additionalProperties: true
          }
        },
        connections: { type: "object" }
      }
    }
  }
};

const failureAnalysisSchema = z.object({
  issue: z.string().min(3),
  reason: z.string().min(3),
  solution: z.string().min(3)
});

export interface AiRequestContext {
  traceId?: string;
}

function parseJsonFromText(input: string): unknown {
  const cleaned = input
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) {
      throw new AppError(502, "AI_BAD_OUTPUT", "AI output is not valid JSON.");
    }

    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

function extractMessageText(payload: unknown): string {
  const data = payload as {
    output_text?: string;
    output?: Array<{
      content?: Array<{
        text?: string;
      }>;
    }>;
    choices?: Array<{
      message?: {
        content?: string | Array<{ text?: string; type?: string }>;
      };
    }>;
  };

  if (typeof data.output_text === "string" && data.output_text.length > 0) {
    return data.output_text;
  }

  const outputText = data.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => typeof content.text === "string")?.text;
  if (outputText) {
    return outputText;
  }

  const chatContent = data.choices?.[0]?.message?.content;
  if (typeof chatContent === "string") {
    return chatContent;
  }

  if (Array.isArray(chatContent)) {
    const text = chatContent
      .map((part) => (typeof part.text === "string" ? part.text : ""))
      .join("")
      .trim();
    if (text) {
      return text;
    }
  }

  throw new AppError(502, "AI_EMPTY_OUTPUT", "AI returned no text output.");
}

async function callOpenAIResponses(
  input: {
    model: string;
    systemPrompt: string;
    userPrompt: string;
    jsonSchema?: { name: string; schema: Record<string, unknown> };
  },
  context?: AiRequestContext
): Promise<string> {
  logInfo("ai", "Calling OpenAI responses API", { model: input.model }, context?.traceId);
  const response = await fetch(`${env.AI_BASE_URL}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.AI_API_KEY}`
    },
    body: JSON.stringify({
      model: input.model,
      input: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: input.userPrompt }
      ],
      ...(input.jsonSchema
        ? {
            text: {
              format: {
                type: "json_schema",
                name: input.jsonSchema.name,
                strict: true,
                schema: input.jsonSchema.schema
              }
            }
          }
        : {})
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new AppError(502, "AI_REQUEST_FAILED", "AI request failed.", details);
  }

  const payload = await response.json();
  if (env.LOG_AI_RAW_RESPONSE) {
    logDebug("ai", "Raw AI payload (OpenAI responses)", payload, context?.traceId);
  }
  return extractMessageText(payload);
}

async function callDigitalOceanChatCompletions(
  input: {
    model: string;
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
  },
  context?: AiRequestContext
): Promise<string> {
  logInfo("ai", "Calling DigitalOcean chat/completions API", { model: input.model }, context?.traceId);
  const response = await fetch(`${env.AI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.AI_API_KEY}`
    },
    body: JSON.stringify({
      model: input.model,
      messages: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: input.userPrompt }
      ],
      max_tokens: 2000,
      temperature: input.temperature ?? 0.2
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new AppError(502, "AI_REQUEST_FAILED", "AI request failed.", details);
  }

  const payload = await response.json();
  if (env.LOG_AI_RAW_RESPONSE) {
    logDebug("ai", "Raw AI payload (DigitalOcean chat/completions)", payload, context?.traceId);
  }
  return extractMessageText(payload);
}

async function callAiForJson(input: {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  jsonSchema?: { name: string; schema: Record<string, unknown> };
  context?: AiRequestContext;
}): Promise<unknown> {
  if (!env.AI_API_KEY) {
    throw new AppError(500, "AI_CONFIG_ERROR", "AI_API_KEY is required.");
  }

  if (env.AI_PROVIDER === "openai") {
    const text = await callOpenAIResponses(input, input.context);
    if (env.LOG_AI_OUTPUT_TEXT) {
      logDebug("ai", "AI output_text", { text }, input.context?.traceId);
    }
    return parseJsonFromText(text);
  }

  if (env.AI_PROVIDER === "digitalocean") {
    const text = await callDigitalOceanChatCompletions({
      model: input.model,
      systemPrompt: input.systemPrompt,
      userPrompt: input.userPrompt
    }, input.context);
    if (env.LOG_AI_OUTPUT_TEXT) {
      logDebug("ai", "AI output_text", { text }, input.context?.traceId);
    }
    return parseJsonFromText(text);
  }

  throw new AppError(500, "AI_PROVIDER_UNSUPPORTED", `Unsupported provider: ${env.AI_PROVIDER}`);
}

function buildMockWorkflow(message: string): AiWorkflowOutput {
  const lower = message.toLowerCase();
  const wantsEmail = /email|mail/.test(lower);
  const wantsSlack = /slack/.test(lower);
  const wantsCron = /every|daily|weekly|friday|monday|cron|schedule/.test(lower);
  const triggerType = wantsCron ? "n8n-nodes-base.scheduleTrigger" : "n8n-nodes-base.webhook";
  const triggerName = wantsCron ? "Schedule Trigger" : "Webhook Trigger";

  const nodes: N8nNode[] = [
    {
      id: "trigger_1",
      name: triggerName,
      type: triggerType,
      typeVersion: 1,
      position: [220, 300],
      parameters: wantsCron
        ? {
            rule: {
              interval: [{ field: "weeks", triggerAtDay: [5], triggerAtHour: 9 }]
            }
          }
        : {
            path: "automation-event",
            httpMethod: "POST"
          }
    },
    {
      id: "http_1",
      name: "Fetch Report",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [470, 300],
      parameters: {
        method: "GET",
        url: "https://example.com/api/report"
      }
    }
  ];

  const outbound: N8nConnectionTarget[] = [];

  if (wantsEmail) {
    nodes.push({
      id: "email_1",
      name: "Send Email",
      type: "n8n-nodes-base.sendEmail",
      typeVersion: 2.1,
      position: [730, 220],
      parameters: {
        toEmail: "owner@example.com",
        subject: "Automated Report",
        emailType: "text",
        message: "={{ JSON.stringify($json) }}"
      }
    });
    outbound.push({ node: "Send Email", type: "main", index: 0 });
  }

  if (wantsSlack) {
    nodes.push({
      id: "slack_1",
      name: "Send Slack",
      type: "n8n-nodes-base.slack",
      typeVersion: 2.3,
      position: [730, 380],
      parameters: {
        resource: "message",
        operation: "post",
        channel: "#reports",
        text: "={{ JSON.stringify($json) }}"
      }
    });
    outbound.push({ node: "Send Slack", type: "main", index: 0 });
  }

  const connections: N8nWorkflow["connections"] = {
    [triggerName]: {
      main: [[{ node: "Fetch Report", type: "main", index: 0 }]]
    }
  };

  if (outbound.length > 0) {
    connections["Fetch Report"] = { main: [outbound] };
  }

  return {
    project_name: message.slice(0, 120),
    description: `Automation generated from chat: ${message}`,
    workflow: { nodes, connections }
  };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildDefaultConnectionsFromNodes(nodes: Array<Record<string, unknown>>): N8nConnections {
  const connections: N8nConnections = {};
  for (let i = 0; i < nodes.length - 1; i += 1) {
    const source = nodes[i];
    const target = nodes[i + 1];
    if (!source || !target) {
      continue;
    }
    const sourceName = typeof source.name === "string" ? source.name : "";
    const targetName = typeof target.name === "string" ? target.name : "";
    if (!sourceName || !targetName) {
      continue;
    }
    connections[sourceName] = {
      main: [[{ node: targetName, type: "main", index: 0 }]]
    };
  }
  return connections;
}

function normalizeAiWorkflowCandidate(candidate: unknown, traceId?: string): unknown {
  if (!candidate || typeof candidate !== "object") {
    return candidate;
  }

  const root = structuredClone(candidate) as Record<string, unknown>;

  if (typeof root.project_name !== "string") {
    const projectName =
      (typeof root.projectName === "string" ? root.projectName : null) ||
      (typeof root.name === "string" ? root.name : null);
    if (projectName) {
      root.project_name = projectName;
    }
  }

  if (typeof root.description !== "string") {
    const description =
      (typeof root.project_description === "string" ? root.project_description : null) ||
      (typeof root.summary === "string" ? root.summary : null);
    if (description) {
      root.description = description;
    }
  }

  if (!root.workflow && Array.isArray(root.nodes)) {
    root.workflow = {
      nodes: root.nodes,
      connections:
        root.connections && typeof root.connections === "object" ? root.connections : {}
    };
  }

  const workflow = root.workflow;
  if (!workflow || typeof workflow !== "object") {
    return root;
  }

  const workflowObj = workflow as Record<string, unknown>;
  if (!Array.isArray(workflowObj.nodes) && workflowObj.nodes && typeof workflowObj.nodes === "object") {
    workflowObj.nodes = Object.values(workflowObj.nodes as Record<string, unknown>);
  }

  if (!Array.isArray(workflowObj.nodes)) {
    return root;
  }

  const nodes = workflowObj.nodes as Array<Record<string, unknown>>;
  const usedIds = new Set<string>();
  const usedNames = new Set<string>();
  const idToName = new Map<string, string>();
  const lowerNameToName = new Map<string, string>();
  let changed = 0;

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (!node || typeof node !== "object") {
      continue;
    }

    if (typeof node.name !== "string" || node.name.trim() === "") {
      node.name = `Node ${index + 1}`;
      changed += 1;
    }

    const name = String(node.name);
    if (usedNames.has(name)) {
      let suffix = 2;
      let candidateName = `${name} ${suffix}`;
      while (usedNames.has(candidateName)) {
        suffix += 1;
        candidateName = `${name} ${suffix}`;
      }
      node.name = candidateName;
      changed += 1;
    }
    usedNames.add(String(node.name));

    if (typeof node.id === "number" || typeof node.id === "bigint") {
      node.id = String(node.id);
      changed += 1;
    }

    if (typeof node.id !== "string" || node.id.trim() === "") {
      const base = slugify(String(node.name || `node_${index + 1}`)) || `node_${index + 1}`;
      node.id = `${base}_${index + 1}`;
      changed += 1;
    }

    let nodeId = String(node.id);
    if (usedIds.has(nodeId)) {
      let suffix = 2;
      while (usedIds.has(`${nodeId}_${suffix}`)) {
        suffix += 1;
      }
      nodeId = `${nodeId}_${suffix}`;
      node.id = nodeId;
      changed += 1;
    }
    usedIds.add(nodeId);
    idToName.set(nodeId, String(node.name));
    lowerNameToName.set(String(node.name).toLowerCase(), String(node.name));

    if (typeof node.typeVersion === "string") {
      const parsed = Number(node.typeVersion);
      if (!Number.isNaN(parsed)) {
        node.typeVersion = parsed;
        changed += 1;
      }
    }

    if (typeof node.typeVersion !== "number") {
      node.typeVersion = 1;
      changed += 1;
    }

    if (!Array.isArray(node.position) || node.position.length !== 2) {
      node.position = [220 + index * 220, 300];
      changed += 1;
    } else {
      const [x, y] = node.position;
      const nx = Number(x);
      const ny = Number(y);
      if (Number.isNaN(nx) || Number.isNaN(ny)) {
        node.position = [220 + index * 220, 300];
        changed += 1;
      } else if (typeof x !== "number" || typeof y !== "number") {
        node.position = [nx, ny];
        changed += 1;
      }
    }

    if (node.credentials && typeof node.credentials === "object") {
      const credentials = node.credentials as Record<string, unknown>;
      for (const [credentialType, credentialValue] of Object.entries(credentials)) {
        if (typeof credentialValue === "string") {
          credentials[credentialType] = { name: credentialValue };
          changed += 1;
        }
      }
    }
  }

  const resolveNodeName = (reference: unknown): string | null => {
    if (typeof reference !== "string" || reference.trim() === "") {
      return null;
    }

    const trimmed = reference.trim();
    if (idToName.has(trimmed)) {
      return idToName.get(trimmed) ?? null;
    }

    if (usedNames.has(trimmed)) {
      return trimmed;
    }

    const lowered = trimmed.toLowerCase();
    if (lowerNameToName.has(lowered)) {
      return lowerNameToName.get(lowered) ?? null;
    }

    return null;
  };

  if (!workflowObj.connections || typeof workflowObj.connections !== "object") {
    workflowObj.connections = buildDefaultConnectionsFromNodes(nodes);
    changed += 1;
  } else {
    const rawConnections = workflowObj.connections as Record<string, unknown>;
    const normalizedConnections: N8nConnections = {};

    for (const [rawSourceRef, rawSourceValue] of Object.entries(rawConnections)) {
      const sourceName = resolveNodeName(rawSourceRef);
      if (!sourceName) {
        changed += 1;
        continue;
      }

      if (!rawSourceValue || typeof rawSourceValue !== "object") {
        changed += 1;
        continue;
      }

      const rawMain = (rawSourceValue as Record<string, unknown>).main;
      if (!Array.isArray(rawMain)) {
        changed += 1;
        continue;
      }

      const normalizedMain: N8nConnectionTarget[][] = [];

      for (const rawBranch of rawMain) {
        if (!Array.isArray(rawBranch)) {
          changed += 1;
          continue;
        }

        const normalizedBranch: N8nConnectionTarget[] = [];
        for (const rawTarget of rawBranch) {
          if (!rawTarget || typeof rawTarget !== "object") {
            changed += 1;
            continue;
          }

          const targetObj = rawTarget as Record<string, unknown>;
          const targetName = resolveNodeName(targetObj.node);
          if (!targetName) {
            changed += 1;
            continue;
          }

          const type = typeof targetObj.type === "string" && targetObj.type.trim() ? targetObj.type : "main";
          const numericIndex = Number(targetObj.index ?? 0);
          const index = Number.isNaN(numericIndex) ? 0 : numericIndex;
          if (!Number.isInteger(index) || index < 0) {
            changed += 1;
          }

          normalizedBranch.push({
            node: targetName,
            type,
            index: Number.isInteger(index) && index >= 0 ? index : 0
          });

          if (targetObj.node !== targetName) {
            changed += 1;
          }
        }

        if (normalizedBranch.length > 0) {
          normalizedMain.push(normalizedBranch);
        }
      }

      if (normalizedMain.length > 0) {
        normalizedConnections[sourceName] = { main: normalizedMain };
      }

      if (rawSourceRef !== sourceName) {
        changed += 1;
      }
    }

    if (Object.keys(normalizedConnections).length === 0 && nodes.length > 1) {
      workflowObj.connections = buildDefaultConnectionsFromNodes(nodes);
      changed += 1;
    } else {
      workflowObj.connections = normalizedConnections;
    }
  }

  if (changed > 0) {
    logWarn(
      "ai",
      "Normalized AI workflow candidate before validation",
      { changed_fields: changed, node_count: nodes.length },
      traceId
    );
  }

  return root;
}

function parseModelList(input: string | undefined): string[] {
  if (!input) {
    return [];
  }

  return input
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function uniqueModelPlan(models: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const model of models) {
    if (seen.has(model)) {
      continue;
    }
    seen.add(model);
    out.push(model);
  }
  return out;
}

export async function generateWorkflowFromMessage(
  message: string,
  context?: AiRequestContext
): Promise<AiWorkflowOutput> {
  logInfo("ai", "Workflow generation started", { provider: env.AI_PROVIDER }, context?.traceId);
  if (env.AI_PROVIDER === "mock") {
    return buildMockWorkflow(message);
  }

  const modelPlan = uniqueModelPlan([
    env.AI_WORKFLOW_MODEL,
    env.AI_MODEL_PRIMARY,
    ...parseModelList(env.AI_WORKFLOW_FALLBACK_MODELS),
    env.AI_MODEL_FAST,
    env.AI_MODEL_COMPLEX
  ].filter((value): value is string => Boolean(value)));

  const attemptErrors: Array<{ model: string; details: unknown }> = [];

  for (const model of modelPlan) {
    try {
      logInfo("ai", "Workflow generation attempt", { model }, context?.traceId);
      const candidateRaw = await callAiForJson({
        model,
        systemPrompt: WORKFLOW_SYSTEM_PROMPT,
        userPrompt: `USER_REQUEST:\n${message}`,
        jsonSchema:
          env.AI_PROVIDER === "openai"
            ? { name: "workflow_generation", schema: WORKFLOW_OUTPUT_SCHEMA }
            : undefined,
        context
      });

      const candidate = normalizeAiWorkflowCandidate(candidateRaw, context?.traceId);
      const parsed = validateWorkflowStructure(candidate);
      if (!parsed.parsed) {
        attemptErrors.push({ model, details: parsed.errors });
        logWarn(
          "ai",
          "Workflow validation failed for model",
          { model, errors: parsed.errors, candidate },
          context?.traceId
        );
        continue;
      }

      logInfo(
        "ai",
        "Workflow generation finished",
        { model, node_count: parsed.parsed.workflow.nodes.length },
        context?.traceId
      );
      return parsed.parsed;
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      attemptErrors.push({ model, details });
      logWarn("ai", "Workflow generation attempt failed", { model, details }, context?.traceId);
    }
  }

  throw new AppError(
    502,
    "AI_SCHEMA_MISMATCH",
    "All AI models failed to produce a valid workflow JSON.",
    attemptErrors
  );
}

export async function analyzeWorkflowFailure(input: {
  workflowJson: N8nWorkflow;
  errorMessage: string | null;
  recentEvents: Array<Record<string, unknown>>;
}, context?: AiRequestContext): Promise<FailureAnalysis> {
  logInfo("ai", "Failure analysis started", undefined, context?.traceId);
  if (env.AI_PROVIDER === "mock") {
    return {
      issue: "Workflow execution failed.",
      reason: input.errorMessage ?? "Unknown runtime error.",
      solution: "Review credentials, endpoint availability, and required input fields."
    };
  }

  const candidate = await callAiForJson({
    model: env.AI_ANALYSIS_MODEL || env.AI_MODEL_PRIMARY,
    systemPrompt: ANALYSIS_SYSTEM_PROMPT,
    userPrompt: JSON.stringify(
      {
        error_message: input.errorMessage,
        workflow: input.workflowJson,
        recent_events: input.recentEvents
      },
      null,
      2
    ),
    context
  });

  const parsed = failureAnalysisSchema.safeParse(candidate);
  if (!parsed.success) {
    logWarn("ai", "Failure analysis schema mismatch", parsed.error.issues, context?.traceId);
    throw new AppError(502, "AI_ANALYSIS_SCHEMA_MISMATCH", "AI analysis schema mismatch.", parsed.error.issues);
  }

  logInfo("ai", "Failure analysis completed", undefined, context?.traceId);
  return parsed.data;
}
