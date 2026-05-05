const REDACTED_VALUE = "[REDACTED]";

const SENSITIVE_KEY_PARTS = [
  "token",
  "accesstoken",
  "refreshtoken",
  "password",
  "secret",
  "apikey",
  "authorization",
  "cookie",
  "credential",
  "privatekey"
];

const SENSITIVE_TEXT_PATTERNS: RegExp[] = [
  /\b(token|authorization|access[_\s-]?token|refresh[_\s-]?token|api[_\s-]?key|password|secret|cookie|private[_\s-]?key)\b\s*[:=]\s*(?:Bearer\s+)?([^\s,'"`]+)/gi,
  /\bBearer\s+[A-Za-z0-9\-._~+/]+=*\b/gi
];

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isSensitiveKey(key: string): boolean {
  const normalized = normalizeKey(key);
  return SENSITIVE_KEY_PARTS.some((part) => normalized.includes(part));
}

function redactSensitiveText(value: string): string {
  let output = value;
  for (const pattern of SENSITIVE_TEXT_PATTERNS) {
    output = output.replace(pattern, (match, key) => {
      if (typeof key === "string") {
        return `${key}: ${REDACTED_VALUE}`;
      }
      return REDACTED_VALUE;
    });
  }
  return output;
}

function redactInternal(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return redactSensitiveText(value);
  }

  if (typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    return "[CIRCULAR]";
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((entry) => redactInternal(entry, seen));
  }

  const out: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      out[key] = REDACTED_VALUE;
      continue;
    }
    out[key] = redactInternal(nestedValue, seen);
  }
  return out;
}

export function redactSecrets<T>(value: T): T {
  return redactInternal(value, new WeakSet<object>()) as T;
}

export function redactJsonTextIfPossible(input: string): string {
  try {
    const parsed = JSON.parse(input) as unknown;
    return JSON.stringify(redactSecrets(parsed));
  } catch {
    return input;
  }
}
