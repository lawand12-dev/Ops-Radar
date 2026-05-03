import { logWarn } from "../../lib/logger";
import { resolveNodeTypeVersion } from "../n8n/node-compatibility";
import type { N8nConnections, N8nConnectionTarget, N8nNode, N8nWorkflow } from "../../types/workflow";

function normalizeNodeTypeVersion(
  nodeType: string,
  nodeName: string,
  rawValue: unknown,
  warnings: string[]
): number {
  const resolution = resolveNodeTypeVersion(nodeType, rawValue, {
    nodeName,
    warningPrefix: "[normalizer]",
    defaultTypeVersion: 1
  });
  warnings.push(...resolution.warnings);
  return resolution.normalized_type_version;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeNodeName(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
}

function normalizeNodeType(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return "n8n-nodes-base.unknown";
}

function buildWarningMessage(raw: string): string {
  return `[normalizer] ${raw}`;
}

function normalizeConnections(
  rawConnections: unknown,
  idToName: Map<string, string>,
  nameLookup: Map<string, string>,
  originalNameToCanonical: Map<string, string>,
  warnings: string[]
): N8nConnections {
  const resolveNodeName = (reference: unknown): string | null => {
    if (typeof reference !== "string" || reference.trim() === "") {
      return null;
    }
    const trimmed = reference.trim();
    // 1. Try resolving as a node ID
    if (idToName.has(trimmed)) {
      return idToName.get(trimmed) ?? null;
    }
    // 2. Try resolving as a canonical node name (case-insensitive)
    if (nameLookup.has(trimmed.toLowerCase())) {
      return nameLookup.get(trimmed.toLowerCase()) ?? null;
    }
    // 3. Try resolving as an original (pre-rename) node name that was renamed during deduplication
    if (originalNameToCanonical.has(trimmed.toLowerCase())) {
      return originalNameToCanonical.get(trimmed.toLowerCase()) ?? null;
    }
    return null;
  };

  if (!rawConnections || typeof rawConnections !== "object") {
    warnings.push(buildWarningMessage("connections missing or invalid; defaulted to empty object."));
    return {};
  }

  const normalized: N8nConnections = {};
  for (const [rawSourceRef, rawEntry] of Object.entries(rawConnections as Record<string, unknown>)) {
    const sourceName = resolveNodeName(rawSourceRef);
    if (!sourceName || !rawEntry || typeof rawEntry !== "object") {
      warnings.push(
        buildWarningMessage(`connection source '${String(rawSourceRef)}' could not be resolved and was dropped.`)
      );
      continue;
    }

    const rawMain = (rawEntry as Record<string, unknown>).main;
    if (!Array.isArray(rawMain)) {
      warnings.push(buildWarningMessage(`connection source '${sourceName}' had invalid 'main' payload.`));
      continue;
    }

    const normalizedMain: N8nConnectionTarget[][] = [];
    for (const rawBranch of rawMain) {
      if (!Array.isArray(rawBranch)) {
        warnings.push(buildWarningMessage(`connection source '${sourceName}' had non-array branch.`));
        continue;
      }
      const normalizedBranch: N8nConnectionTarget[] = [];
      for (const rawTarget of rawBranch) {
        if (!rawTarget || typeof rawTarget !== "object") {
          warnings.push(buildWarningMessage(`connection target under '${sourceName}' is invalid.`));
          continue;
        }
        const targetObj = rawTarget as Record<string, unknown>;
        const targetName = resolveNodeName(targetObj.node);
        if (!targetName) {
          warnings.push(
            buildWarningMessage(
              `connection target '${String(targetObj.node ?? "")}' under '${sourceName}' could not be resolved.`
            )
          );
          continue;
        }
        const candidateType =
          typeof targetObj.type === "string" && targetObj.type.trim().length > 0
            ? targetObj.type.trim()
            : "main";
        const candidateIndex = Number(targetObj.index ?? 0);
        const index = Number.isInteger(candidateIndex) && candidateIndex >= 0 ? candidateIndex : 0;
        normalizedBranch.push({ node: targetName, type: candidateType, index });
      }
      if (normalizedBranch.length > 0) {
        normalizedMain.push(normalizedBranch);
      }
    }

    if (normalizedMain.length > 0) {
      normalized[sourceName] = { main: normalizedMain };
    } else {
      warnings.push(buildWarningMessage(`connection source '${sourceName}' had no valid targets and was dropped.`));
    }
  }

  return normalized;
}

function appendWarningsToSettings(
  settings: Record<string, unknown>,
  warnings: string[]
): Record<string, unknown> {
  if (warnings.length === 0) {
    return settings;
  }

  const existing = Array.isArray(settings.__opsRadarNormalizationWarnings)
    ? settings.__opsRadarNormalizationWarnings.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0
      )
    : [];

  return {
    ...settings,
    __opsRadarNormalizationWarnings: [...existing, ...warnings]
  };
}

export function normalizeWorkflowDefinition(workflow: unknown, traceId?: string): N8nWorkflow {
  const raw =
    workflow && typeof workflow === "object"
      ? (structuredClone(workflow) as Record<string, unknown>)
      : ({} as Record<string, unknown>);

  const warnings: string[] = [];

  if (!Array.isArray(raw.nodes) && raw.nodes && typeof raw.nodes === "object") {
    raw.nodes = Object.values(raw.nodes as Record<string, unknown>);
    warnings.push(buildWarningMessage("nodes object was converted to nodes array."));
  }

  const rawNodes = Array.isArray(raw.nodes) ? raw.nodes : [];
  if (!Array.isArray(raw.nodes)) {
    warnings.push(buildWarningMessage("nodes missing or invalid; defaulted to empty array."));
  }

  const usedNodeIds = new Set<string>();
  const usedNodeNames = new Set<string>();
  const idToName = new Map<string, string>();
  const nameLookup = new Map<string, string>();
  // Tracks original (pre-rename) node names → final canonical names.
  // This allows connections referencing the AI-generated name to resolve
  // even after the normalizer renames duplicates.
  const originalNameToCanonical = new Map<string, string>();

  const nodes: N8nNode[] = rawNodes.map((entry, index) => {
    const nodeObject =
      entry && typeof entry === "object" ? (entry as Record<string, unknown>) : ({} as Record<string, unknown>);
    if (nodeObject !== entry) {
      warnings.push(buildWarningMessage(`node at index ${index} was not an object and was normalized.`));
    }

    const fallbackName = `Node ${index + 1}`;
    const rawName = normalizeNodeName(nodeObject.name, fallbackName);
    let name = rawName;
    if (usedNodeNames.has(name)) {
      let suffix = 2;
      let candidate = `${name} ${suffix}`;
      while (usedNodeNames.has(candidate)) {
        suffix += 1;
        candidate = `${name} ${suffix}`;
      }
      warnings.push(buildWarningMessage(`duplicate node name '${name}' renamed to '${candidate}'.`));
      // Track the original name so connections referencing it can be resolved to the renamed node.
      originalNameToCanonical.set(name.toLowerCase(), candidate);
      name = candidate;
    }
    usedNodeNames.add(name);

    let idValue: string;
    if (typeof nodeObject.id === "string" && nodeObject.id.trim().length > 0) {
      idValue = nodeObject.id.trim();
    } else if (typeof nodeObject.id === "number" || typeof nodeObject.id === "bigint") {
      idValue = String(nodeObject.id);
      warnings.push(buildWarningMessage(`numeric node id for '${name}' was converted to string.`));
    } else {
      idValue = `${slugify(name) || "node"}_${index + 1}`;
      warnings.push(buildWarningMessage(`node '${name}' was missing id; generated '${idValue}'.`));
    }

    if (usedNodeIds.has(idValue)) {
      let suffix = 2;
      while (usedNodeIds.has(`${idValue}_${suffix}`)) {
        suffix += 1;
      }
      const deduped = `${idValue}_${suffix}`;
      warnings.push(buildWarningMessage(`duplicate node id '${idValue}' renamed to '${deduped}'.`));
      idValue = deduped;
    }
    usedNodeIds.add(idValue);

    const typeValue = normalizeNodeType(nodeObject.type);
    if (typeValue !== nodeObject.type) {
      warnings.push(buildWarningMessage(`node '${name}' missing type; defaulted to '${typeValue}'.`));
    }

    const typeVersion = normalizeNodeTypeVersion(typeValue, name, nodeObject.typeVersion, warnings);

    const positionRaw = Array.isArray(nodeObject.position) ? nodeObject.position : null;
    const fallbackPosition: [number, number] = [220 + index * 220, 300];
    const positionX = Number(positionRaw?.[0]);
    const positionY = Number(positionRaw?.[1]);
    const position: [number, number] =
      Number.isFinite(positionX) && Number.isFinite(positionY)
        ? [positionX, positionY]
        : fallbackPosition;
    if (
      !positionRaw ||
      positionRaw.length !== 2 ||
      !Number.isFinite(positionRaw[0] as number) ||
      !Number.isFinite(positionRaw[1] as number)
    ) {
      warnings.push(
        buildWarningMessage(
          `node '${name}' missing/invalid position; defaulted to [${fallbackPosition[0]}, ${fallbackPosition[1]}].`
        )
      );
    }

    let credentials: Record<string, unknown> | undefined;
    if (nodeObject.credentials && typeof nodeObject.credentials === "object") {
      const credentialRecord = nodeObject.credentials as Record<string, unknown>;
      credentials = {};
      for (const [credentialType, credentialValue] of Object.entries(credentialRecord)) {
        if (typeof credentialValue === "string") {
          credentials[credentialType] = { name: credentialValue };
          warnings.push(
            buildWarningMessage(
              `node '${name}' credential '${credentialType}' string value converted to { name } reference.`
            )
          );
          continue;
        }
        credentials[credentialType] = credentialValue;
      }
    }

    const normalizedParameters =
      nodeObject.parameters && typeof nodeObject.parameters === "object"
        ? (nodeObject.parameters as Record<string, unknown>)
        : {};
    if (!nodeObject.parameters || typeof nodeObject.parameters !== "object") {
      warnings.push(buildWarningMessage(`node '${name}' missing parameters; defaulted to empty object.`));
    }

    const normalized: N8nNode = {
      id: idValue,
      name,
      type: typeValue,
      typeVersion,
      position,
      parameters: normalizedParameters,
      ...(credentials ? { credentials } : {})
    };

    idToName.set(normalized.id, normalized.name);
    nameLookup.set(normalized.name.toLowerCase(), normalized.name);
    // Also register the raw node name from AI output as an ID-based lookup
    // so connections keyed by original AI node name (before any ID/name changes) resolve.
    const rawNodeName = typeof nodeObject.name === "string" ? nodeObject.name.trim() : "";
    if (rawNodeName.length > 0 && !idToName.has(rawNodeName)) {
      idToName.set(rawNodeName, normalized.name);
    }
    return normalized;
  });

  const connections = normalizeConnections(raw.connections, idToName, nameLookup, originalNameToCanonical, warnings);

  // Detect connection errors that MUST cause workflow rejection.
  // Connections are NEVER silently dropped — any unresolvable source or target is a fatal error.
  const connectionErrors: string[] = [];
  for (const warning of warnings) {
    if (
      warning.includes("could not be resolved") ||
      warning.includes("was dropped")
    ) {
      connectionErrors.push(warning);
    }
  }

  // Strict validation: multi-node workflows must have at least one connection.
  if (nodes.length > 1 && Object.keys(connections).length === 0) {
    const rawConnectionKeys = raw.connections && typeof raw.connections === "object"
      ? Object.keys(raw.connections as Record<string, unknown>)
      : [];
    connectionErrors.push(
      buildWarningMessage(
        `workflow has ${nodes.length} nodes but 0 connections after normalization` +
        (rawConnectionKeys.length > 0
          ? ` (${rawConnectionKeys.length} raw connection source(s) were all dropped: ${rawConnectionKeys.join(", ")})`
          : ` (no connections were provided)`) +
        `. Workflow will appear empty in n8n.`
      )
    );
  }

  const settings =
    raw.settings && typeof raw.settings === "object"
      ? (raw.settings as Record<string, unknown>)
      : {};
  if (!raw.settings || typeof raw.settings !== "object") {
    warnings.push(buildWarningMessage("settings missing or invalid; defaulted to empty object."));
  }

  let name: string | undefined;
  if (typeof raw.name === "string" && raw.name.trim().length > 0) {
    name = raw.name.trim();
  } else {
    name = nodes[0]?.name ? `${nodes[0].name} Workflow` : "Generated Workflow";
    warnings.push(buildWarningMessage(`workflow name missing; defaulted to '${name}'.`));
  }

  let normalizedSettings = appendWarningsToSettings(settings, warnings);

  // Persist connection errors so downstream validation (validateWorkflowSecurity)
  // can detect them and reject the workflow instead of deploying it empty.
  if (connectionErrors.length > 0) {
    normalizedSettings = {
      ...normalizedSettings,
      __opsRadarConnectionErrors: connectionErrors
    };
  }

  if (warnings.length > 0) {
    logWarn(
      "workflow-normalizer",
      "Workflow normalized before validation",
      {
        warnings,
        connection_errors: connectionErrors.length > 0 ? connectionErrors : undefined,
        node_count: nodes.length
      },
      traceId
    );
  }

  return {
    name,
    nodes,
    connections,
    settings: normalizedSettings
  };
}

export function normalizeAiWorkflowCandidate(candidate: unknown, traceId?: string): unknown {
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

  if (!Array.isArray(root.required_credentials)) {
    root.required_credentials = [];
  }

  if (!root.workflow && Array.isArray(root.nodes)) {
    root.workflow = {
      name: typeof root.project_name === "string" ? root.project_name : "Generated Workflow",
      nodes: root.nodes,
      connections:
        root.connections && typeof root.connections === "object" ? root.connections : {},
      settings: root.settings && typeof root.settings === "object" ? root.settings : {}
    };
  }

  if (root.workflow && typeof root.workflow === "object") {
    root.workflow = normalizeWorkflowDefinition(root.workflow, traceId);
    if (!Array.isArray(root.required_credentials)) {
      root.required_credentials = [];
    }
  }

  return root;
}
