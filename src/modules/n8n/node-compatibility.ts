import type { N8nNode } from "../../types/workflow";

export interface NodeCompatibilityRegistryEntry {
  max_type_version: number;
  source: "instance_profile";
  updated_at: string;
}

export const NODE_COMPATIBILITY_PROFILE = {
  profile: "ops-radar-n8n-default",
  updated_at: "2026-05-02"
} as const;

// Compatibility profile for the currently targeted n8n instance family.
// Values are intentionally conservative to avoid generating workflows that render as unknown/missing nodes.
export const N8N_NODE_COMPATIBILITY_REGISTRY: Record<string, NodeCompatibilityRegistryEntry> = {
  "n8n-nodes-base.manualTrigger": {
    max_type_version: 1,
    source: "instance_profile",
    updated_at: NODE_COMPATIBILITY_PROFILE.updated_at
  },
  "n8n-nodes-base.scheduleTrigger": {
    max_type_version: 1.2,
    source: "instance_profile",
    updated_at: NODE_COMPATIBILITY_PROFILE.updated_at
  },
  "n8n-nodes-base.webhook": {
    max_type_version: 2.1,
    source: "instance_profile",
    updated_at: NODE_COMPATIBILITY_PROFILE.updated_at
  },
  "n8n-nodes-base.httpRequest": {
    max_type_version: 4.2,
    source: "instance_profile",
    updated_at: NODE_COMPATIBILITY_PROFILE.updated_at
  },
  "n8n-nodes-base.if": {
    max_type_version: 2.3,
    source: "instance_profile",
    updated_at: NODE_COMPATIBILITY_PROFILE.updated_at
  },
  "n8n-nodes-base.switch": {
    max_type_version: 3.4,
    source: "instance_profile",
    updated_at: NODE_COMPATIBILITY_PROFILE.updated_at
  },
  "n8n-nodes-base.set": {
    max_type_version: 3.4,
    source: "instance_profile",
    updated_at: NODE_COMPATIBILITY_PROFILE.updated_at
  },
  "n8n-nodes-base.merge": {
    max_type_version: 3.2,
    source: "instance_profile",
    updated_at: NODE_COMPATIBILITY_PROFILE.updated_at
  },
  "n8n-nodes-base.noOp": {
    max_type_version: 1,
    source: "instance_profile",
    updated_at: NODE_COMPATIBILITY_PROFILE.updated_at
  },
  "n8n-nodes-base.telegram": {
    max_type_version: 1.2,
    source: "instance_profile",
    updated_at: NODE_COMPATIBILITY_PROFILE.updated_at
  },
  "n8n-nodes-base.telegramTrigger": {
    max_type_version: 1.2,
    source: "instance_profile",
    updated_at: NODE_COMPATIBILITY_PROFILE.updated_at
  },
  "n8n-nodes-base.gmailTrigger": {
    max_type_version: 1.4,
    source: "instance_profile",
    updated_at: NODE_COMPATIBILITY_PROFILE.updated_at
  },
  "n8n-nodes-base.gmail": {
    max_type_version: 2.2,
    source: "instance_profile",
    updated_at: NODE_COMPATIBILITY_PROFILE.updated_at
  },
  "n8n-nodes-base.slack": {
    max_type_version: 2.4,
    source: "instance_profile",
    updated_at: NODE_COMPATIBILITY_PROFILE.updated_at
  },
  "n8n-nodes-base.slackTrigger": {
    max_type_version: 1.2,
    source: "instance_profile",
    updated_at: NODE_COMPATIBILITY_PROFILE.updated_at
  }
};

const UNKNOWN_NODE_SAFE_MAX_VERSION = 1;

export interface NodeTypeVersionResolution {
  original_type_version: number | null;
  normalized_type_version: number;
  max_compatible_type_version: number | null;
  known_node_type: boolean;
  rounded: boolean;
  clamped: boolean;
  defaulted: boolean;
  safe_to_deploy: boolean;
  incompatibility_reason: string | null;
  warnings: string[];
}

export interface NormalizedNodeVersionInfo {
  node_id: string | null;
  node_name: string;
  node_type: string;
  original_type_version: number | null;
  normalized_type_version: number;
  max_compatible_type_version: number | null;
  changed: boolean;
  clamped: boolean;
  known_node_type: boolean;
  safe_to_deploy: boolean;
  incompatibility_reason: string | null;
  warnings: string[];
}

export interface IncompatibleNodeInfo {
  node_id: string | null;
  node_name: string;
  node_type: string;
  type_version: number | null;
  max_compatible_type_version: number | null;
  safe_to_deploy: boolean;
  reason: string;
}

function toFinitePositiveNumber(value: unknown): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return numeric;
}

function roundToSingleDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function getCompatibleMaxTypeVersion(nodeType: string): number | null {
  if (typeof nodeType !== "string" || nodeType.trim().length === 0) {
    return null;
  }

  const key = nodeType.trim();
  const entry = N8N_NODE_COMPATIBILITY_REGISTRY[key];
  return entry ? entry.max_type_version : null;
}

export function resolveNodeTypeVersion(
  nodeType: string,
  rawTypeVersion: unknown,
  options?: {
    nodeName?: string;
    warningPrefix?: string;
    defaultTypeVersion?: number;
  }
): NodeTypeVersionResolution {
  const warnings: string[] = [];
  const warningPrefix = options?.warningPrefix ?? "[compatibility]";
  const defaultTypeVersion = options?.defaultTypeVersion ?? 1;
  const nodeName = options?.nodeName ?? "unnamed node";

  const normalizedNodeType = typeof nodeType === "string" ? nodeType.trim() : "";
  const parsed = toFinitePositiveNumber(rawTypeVersion);

  let candidate: number;
  let originalTypeVersion: number | null = parsed;
  let rounded = false;
  let defaulted = false;
  let clamped = false;
  let safeToDeploy = true;
  let incompatibilityReason: string | null = null;

  if (parsed === null) {
    candidate = defaultTypeVersion;
    originalTypeVersion = null;
    defaulted = true;
    warnings.push(`${warningPrefix} node '${nodeName}' missing typeVersion; defaulted to ${defaultTypeVersion}.`);
  } else {
    candidate = parsed;
    const roundedCandidate = roundToSingleDecimal(candidate);
    if (Math.abs(roundedCandidate - candidate) > 0.0001) {
      warnings.push(
        `${warningPrefix} node '${nodeName}' typeVersion '${candidate}' normalized to '${roundedCandidate}'.`
      );
      candidate = roundedCandidate;
      rounded = true;
    }
  }

  const maxCompatible = getCompatibleMaxTypeVersion(normalizedNodeType);
  const knownNodeType = typeof maxCompatible === "number";

  if (knownNodeType && maxCompatible !== null && candidate > maxCompatible) {
    warnings.push(
      `${warningPrefix} node '${nodeName}' typeVersion '${candidate}' is higher than known compatible '${maxCompatible}' for '${normalizedNodeType}'; clamped.`
    );
    candidate = maxCompatible;
    clamped = true;
  }

  if (!knownNodeType && candidate > UNKNOWN_NODE_SAFE_MAX_VERSION) {
    safeToDeploy = false;
    incompatibilityReason =
      "unknown_node_type_high_typeVersion_cannot_be_safely_clamped";
    warnings.push(
      `${warningPrefix} node '${nodeName}' type '${normalizedNodeType}' is unknown to compatibility registry with typeVersion '${candidate}'; cannot guarantee compatibility.`
    );
  }

  return {
    original_type_version: originalTypeVersion,
    normalized_type_version: candidate,
    max_compatible_type_version: maxCompatible,
    known_node_type: knownNodeType,
    rounded,
    clamped,
    defaulted,
    safe_to_deploy: safeToDeploy,
    incompatibility_reason: incompatibilityReason,
    warnings
  };
}

export function buildNodeTypeWithVersionTag(nodeType: string, typeVersion: unknown): string {
  const normalizedType = typeof nodeType === "string" && nodeType.trim().length > 0 ? nodeType.trim() : "unknown";
  const numeric = toFinitePositiveNumber(typeVersion);
  return `${normalizedType}@${numeric ?? "?"}`;
}

export function listNodeTypesWithVersions(
  nodes: Array<Pick<N8nNode, "type" | "typeVersion"> | Record<string, unknown>>
): string[] {
  return nodes
    .map((node) => {
      const typedNode = node as { type?: unknown; typeVersion?: unknown };
      return buildNodeTypeWithVersionTag(
        typeof typedNode.type === "string" ? typedNode.type : "unknown",
        typedNode.typeVersion
      );
    })
    .filter((value, index, list) => value.length > 0 && list.indexOf(value) === index);
}

export function buildNormalizedNodeVersions(
  nodes: Array<Partial<N8nNode>>
): NormalizedNodeVersionInfo[] {
  return nodes.map((node, index) => {
    const nodeName = typeof node.name === "string" && node.name.trim().length > 0 ? node.name.trim() : `Node ${index + 1}`;
    const nodeType = typeof node.type === "string" && node.type.trim().length > 0 ? node.type.trim() : "unknown";
    const resolution = resolveNodeTypeVersion(nodeType, node.typeVersion, {
      nodeName
    });

    const original = resolution.original_type_version;
    const changed = original === null ? true : original !== resolution.normalized_type_version;

    return {
      node_id: typeof node.id === "string" && node.id.trim().length > 0 ? node.id.trim() : null,
      node_name: nodeName,
      node_type: nodeType,
      original_type_version: resolution.original_type_version,
      normalized_type_version: resolution.normalized_type_version,
      max_compatible_type_version: resolution.max_compatible_type_version,
      changed,
      clamped: resolution.clamped,
      known_node_type: resolution.known_node_type,
      safe_to_deploy: resolution.safe_to_deploy,
      incompatibility_reason: resolution.incompatibility_reason,
      warnings: resolution.warnings
    };
  });
}

export function detectIncompatibleNodes(nodes: Array<Partial<N8nNode>>): IncompatibleNodeInfo[] {
  return buildNormalizedNodeVersions(nodes)
    .filter((node) => !node.safe_to_deploy)
    .map((node) => ({
      node_id: node.node_id,
      node_name: node.node_name,
      node_type: node.node_type,
      type_version: node.original_type_version ?? node.normalized_type_version,
      max_compatible_type_version: node.max_compatible_type_version,
      safe_to_deploy: node.safe_to_deploy,
      reason: node.incompatibility_reason ?? "incompatible_node_typeVersion"
    }));
}
