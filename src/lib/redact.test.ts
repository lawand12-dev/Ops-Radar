import { describe, expect, it } from "bun:test";
import { redactSecrets } from "./redact";

describe("redactSecrets", () => {
  it("redacts sensitive object keys", () => {
    const output = redactSecrets({
      accessToken: "abc",
      nested: {
        password: "p@ss"
      },
      safe: "ok"
    });

    expect(output.accessToken).toBe("[REDACTED]");
    expect(output.nested.password).toBe("[REDACTED]");
    expect(output.safe).toBe("ok");
  });

  it("redacts sensitive patterns in plain text", () => {
    const output = redactSecrets("authorization=Bearer abc.def.ghi token: my-token");
    expect(output).toContain("[REDACTED]");
    expect(output).not.toContain("abc.def.ghi");
    expect(output).not.toContain("my-token");
  });
});

