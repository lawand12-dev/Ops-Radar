import { z } from "zod";
import type { AiWorkflowOutput, N8nConnections, N8nNode, N8nWorkflow } from "../../types/workflow";

const nodeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  typeVersion: z.number().optional(),
  position: z.tuple([z.number(), z.number()]).optional(),
  parameters: z.record(z.unknown()).optional(),
  credentials: z.record(z.unknown()).optional()
});

const connectionTargetSchema = z.object({
  node: z.string().min(1),
  type: z.string().min(1),
  index: z.number().int().nonnegative()
});

const connectionEntrySchema = z.object({
  main: z.array(z.array(connectionTargetSchema)).optional()
});

const connectionsSchema: z.ZodType<N8nConnections> = z.record(connectionEntrySchema);

const workflowSchema: z.ZodType<N8nWorkflow> = z.object({
  nodes: z.array(nodeSchema).min(1),
  connections: connectionsSchema,
  settings: z.record(z.unknown()).optional()
});

export const aiWorkflowOutputSchema: z.ZodType<AiWorkflowOutput> = z.object({
  project_name: z.string().min(3).max(128),
  description: z.string().min(8).max(2000),
  workflow: workflowSchema
});

const SAFE_NODE_PREFIXES = ["n8n-nodes-base.", "n8n-nodes-"];
const UNSAFE_NODE_TYPES = new Set([
  "n8n-nodes-base.executeCommand",
  "n8n-nodes-base.readWriteFile",
  "n8n-nodes-base.writeBinaryFile",
  "n8n-nodes-base.readBinaryFile",
  "n8n-nodes-base.code",
  "n8n-nodes-base.function",
  "n8n-nodes-base.functionItem",
  "n8n-nodes-base.ssh"
]);

const TRIGGER_NODE_TYPES = new Set([
  "n8n-nodes-base.scheduleTrigger",
  "n8n-nodes-base.webhook",
  "n8n-nodes-base.manualTrigger",
  "n8n-nodes-base.errorTrigger",
  "n8n-nodes-base.n8nTrigger"
]);

const SENSITIVE_KEYS = /(password|secret|token|api[-_]?key|authorization|auth)/i;
const EXPRESSION_PREFIX = "=";

export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
}

function isLikelySafeNodeType(type: string): boolean {
  return SAFE_NODE_PREFIXES.some((prefix) => type.startsWith(prefix));
}

function collectOutgoingConnections(connections: N8nConnections): Array<{ source: string; target: string }> {
  const edges: Array<{ source: string; target: string }> = [];

  for (const [source, value] of Object.entries(connections)) {
    const main = value?.main;
    if (!main) {
      continue;
    }

    for (const branch of main) {
      for (const item of branch) {
        if (item?.node) {
          edges.push({ source, target: item.node });
        }
      }
    }
  }

  return edges;
}

function containsSensitiveLiteral(input: unknown): boolean {
  if (input === null || input === undefined) {
    return false;
  }

  if (Array.isArray(input)) {
    return input.some((item) => containsSensitiveLiteral(item));
  }

  if (typeof input === "object") {
    const object = input as Record<string, unknown>;
    return Object.entries(object).some(([key, value]) => {
      if (SENSITIVE_KEYS.test(key) && typeof value === "string") {
        return !value.startsWith(EXPRESSION_PREFIX);
      }
      return containsSensitiveLiteral(value);
    });
  }

  return false;
}

function validateConnections(workflow: N8nWorkflow, nodesByName: Map<string, N8nNode>): string[] {
  const errors: string[] = [];
  const incomingByNode = new Map<string, number>();

  for (const node of workflow.nodes) {
    incomingByNode.set(node.name, 0);
  }

  const edges = collectOutgoingConnections(workflow.connections);
  for (const edge of edges) {
    if (!nodesByName.has(edge.source)) {
      errors.push(`Connection source node '${edge.source}' does not exist.`);
    }

    if (!nodesByName.has(edge.target)) {
      errors.push(`Connection target node '${edge.target}' does not exist.`);
      continue;
    }

    if (edge.source === edge.target) {
      errors.push(`Self-loop is not allowed on node '${edge.source}'.`);
    }

    incomingByNode.set(edge.target, (incomingByNode.get(edge.target) ?? 0) + 1);
  }

  for (const node of workflow.nodes) {
    const isTrigger = TRIGGER_NODE_TYPES.has(node.type);
    const incoming = incomingByNode.get(node.name) ?? 0;
    if (!isTrigger && incoming === 0) {
      errors.push(`Node '${node.name}' has no incoming connection.`);
    }
  }

  return errors;
}

export function validateWorkflowStructure(candidate: unknown): {
  parsed: AiWorkflowOutput | null;
  errors: string[];
} {
  const parsedResult = aiWorkflowOutputSchema.safeParse(candidate);
  if (!parsedResult.success) {
    return {
      parsed: null,
      errors: parsedResult.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    };
  }

  return { parsed: parsedResult.data, errors: [] };
}

export function validateWorkflowSecurity(workflow: N8nWorkflow): WorkflowValidationResult {
  const errors: string[] = [];

  const nodeNames = new Set<string>();
  const nodeIds = new Set<string>();
  const nodesByName = new Map<string, N8nNode>();
  let triggerCount = 0;

  for (const node of workflow.nodes) {
    if (nodeNames.has(node.name)) {
      errors.push(`Duplicate node name '${node.name}'.`);
    }
    nodeNames.add(node.name);

    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node id '${node.id}'.`);
    }
    nodeIds.add(node.id);

    if (!isLikelySafeNodeType(node.type)) {
      errors.push(`Node '${node.name}' has unsupported type '${node.type}'.`);
    }

    if (UNSAFE_NODE_TYPES.has(node.type)) {
      errors.push(`Node '${node.name}' uses blocked type '${node.type}'.`);
    }

    if (containsSensitiveLiteral(node.parameters)) {
      errors.push(`Node '${node.name}' appears to contain inline credentials/secrets.`);
    }

    if (TRIGGER_NODE_TYPES.has(node.type)) {
      triggerCount += 1;
    }

    nodesByName.set(node.name, node);
  }

  if (triggerCount === 0) {
    errors.push("Workflow must include at least one trigger node.");
  }

  errors.push(...validateConnections(workflow, nodesByName));

  return {
    valid: errors.length === 0,
    errors
  };
}
