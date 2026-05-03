import { describe, expect, it } from "bun:test";
import { classifyExecutionError } from "./error-classifier";

describe("monitoring error classifier", () => {
  it("classifies missing credentials errors", () => {
    const result = classifyExecutionError({
      executionError: "Node \"Send Telegram\": Missing required credential: telegramApi"
    });
    expect(result.error_type).toBe("missing_credentials");
    expect(result.severity).toBe("high");
  });

  it("classifies authentication failures", () => {
    const result = classifyExecutionError({
      executionError: "HTTP 401 unauthorized: invalid token"
    });
    expect(result.error_type).toBe("auth_failed");
  });

  it("classifies permission errors", () => {
    const result = classifyExecutionError({
      executionError: "403 forbidden missing_scope chat:write"
    });
    expect(result.error_type).toBe("permission_denied");
  });

  it("classifies rate limits", () => {
    const result = classifyExecutionError({
      executionError: "429 too many requests, rate limit exceeded"
    });
    expect(result.error_type).toBe("rate_limited");
  });

  it("classifies expression errors", () => {
    const result = classifyExecutionError({
      executionError: "Expression error: cannot read property 'id' of undefined from $json"
    });
    expect(result.error_type).toBe("expression_error");
  });

  it("falls back to unknown error", () => {
    const result = classifyExecutionError({
      executionError: "something very custom and unrecognized happened"
    });
    expect(result.error_type).toBe("unknown_error");
  });
});

