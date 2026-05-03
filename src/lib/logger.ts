import { env } from "../config/env";
import { redactSecrets } from "./redact";

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

function shouldLog(level: Level): boolean {
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[env.LOG_LEVEL];
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(redactSecrets(value), null, 2);
  } catch {
    return String(value);
  }
}

export function logEvent(
  level: Level,
  scope: string,
  message: string,
  meta?: unknown,
  traceId?: string
): void {
  if (!shouldLog(level)) {
    return;
  }

  const parts = [`[${new Date().toISOString()}]`, `[${level.toUpperCase()}]`, `[${scope}]`];
  if (traceId) {
    parts.push(`[trace:${traceId}]`);
  }

  const prefix = parts.join(" ");
  if (meta === undefined) {
    console.log(`${prefix} ${message}`);
    return;
  }

  console.log(`${prefix} ${message}\n${safeStringify(meta)}`);
}

export function logDebug(scope: string, message: string, meta?: unknown, traceId?: string): void {
  logEvent("debug", scope, message, meta, traceId);
}

export function logInfo(scope: string, message: string, meta?: unknown, traceId?: string): void {
  logEvent("info", scope, message, meta, traceId);
}

export function logWarn(scope: string, message: string, meta?: unknown, traceId?: string): void {
  logEvent("warn", scope, message, meta, traceId);
}

export function logError(scope: string, message: string, meta?: unknown, traceId?: string): void {
  logEvent("error", scope, message, meta, traceId);
}

