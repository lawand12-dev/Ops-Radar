import { redactSecrets } from "../../lib/redact";
import type { N8nNode } from "../../types/workflow";

export interface MonitoringErrorClassification {
  error_type: string;
  human_message: string;
  recommended_action: string;
  severity: "low" | "medium" | "high";
}

function toText(input: unknown): string {
  if (!input) {
    return "";
  }
  if (typeof input === "string") {
    return input;
  }
  try {
    return JSON.stringify(input);
  } catch {
    return String(input);
  }
}

function containsAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function classifyByMessage(message: string): MonitoringErrorClassification {
  if (
    containsAny(message, [/missing required credential/i, /\bcredentials?\b/i, /credential.*missing/i])
  ) {
    return {
      error_type: "missing_credentials",
      human_message:
        "This workflow failed because a required credential is missing or not connected.",
      recommended_action:
        "Open credential requirements, create or bind the missing credential, then redeploy and activate.",
      severity: "high"
    };
  }

  if (containsAny(message, [/\b401\b/, /unauthorized/i, /invalid token/i, /authentication failed/i])) {
    return {
      error_type: "auth_failed",
      human_message: "The workflow failed because authentication with an external service was rejected.",
      recommended_action: "The credential exists but is invalid or expired. Recreate or update the credential.",
      severity: "high"
    };
  }

  if (containsAny(message, [/\b403\b/, /forbidden/i, /missing_scope/i, /not[_\s-]?allowed/i])) {
    return {
      error_type: "permission_denied",
      human_message: "The workflow failed because the credential lacks required permissions.",
      recommended_action:
        "The credential does not have enough permissions. Add required scopes/permissions and reconnect.",
      severity: "high"
    };
  }

  if (containsAny(message, [/\b429\b/, /rate limit/i, /too many requests/i])) {
    return {
      error_type: "rate_limited",
      human_message: "The workflow hit an external API rate limit.",
      recommended_action: "Reduce workflow frequency or add retry/backoff.",
      severity: "medium"
    };
  }

  if (
    containsAny(message, [
      /ECONNRESET/i,
      /ETIMEDOUT/i,
      /ENOTFOUND/i,
      /\b5\d{2}\b/,
      /service unavailable/i
    ])
  ) {
    return {
      error_type: "external_service_unavailable",
      human_message: "The workflow failed because the external service appears unavailable.",
      recommended_action: "External service may be down. Retry later or add error handling.",
      severity: "medium"
    };
  }

  if (containsAny(message, [/\b400\b/, /bad request/i, /required parameter/i, /invalid parameter/i])) {
    return {
      error_type: "configuration_error",
      human_message: "The workflow failed due to invalid or missing node configuration.",
      recommended_action:
        "A node is missing a required parameter. Open workflow configuration and fix the highlighted node.",
      severity: "high"
    };
  }

  if (containsAny(message, [/expression/i, /cannot read property/i, /undefined/i, /\$json/i])) {
    return {
      error_type: "expression_error",
      human_message: "The workflow failed because an expression referenced missing data.",
      recommended_action:
        "A node expression references missing data. Add a Set/IF node or adjust the expression.",
      severity: "medium"
    };
  }

  return {
    error_type: "unknown_error",
    human_message: "The workflow failed with an unclassified error.",
    recommended_action: "Open the failed execution in n8n and inspect the failed node.",
    severity: "low"
  };
}

export function classifyExecutionError(input: {
  executionError: unknown;
  failedNodeName?: string | null;
  workflowNodes?: N8nNode[];
  executionStatus?: string | null;
}): MonitoringErrorClassification {
  const rawMessage = toText(input.executionError);
  const message = toText(redactSecrets(rawMessage)).trim();
  const base = classifyByMessage(message);

  if (input.failedNodeName && base.error_type === "configuration_error") {
    return {
      ...base,
      human_message: `Node '${input.failedNodeName}' has an invalid or missing parameter configuration.`
    };
  }

  return base;
}
