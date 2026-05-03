export type CredentialProvisioningMode = "manual";

export type CredentialFieldType = "text" | "password" | "number" | "boolean";

export interface CredentialField {
  name: string;
  label: string;
  type: CredentialFieldType;
  required: boolean;
}

export interface CredentialPolicy {
  mode: CredentialProvisioningMode;
  label: string;
  fields: CredentialField[];
  manual_message: string;
}

function humanizeCredentialType(type: string): string {
  const compact = type.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!compact) {
    return "Credential";
  }

  const withCamelSplit = compact.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return withCamelSplit
    .split(" ")
    .map((part) => (part ? part[0]!.toUpperCase() + part.slice(1) : part))
    .join(" ");
}

export function getCredentialPolicy(type: string): CredentialPolicy {
  const normalized = String(type || "").trim();
  return {
    mode: "manual",
    label: humanizeCredentialType(normalized || "credential"),
    fields: [],
    manual_message:
      "Create or complete this credential inside n8n, then bind it here by credential id or name."
  };
}
