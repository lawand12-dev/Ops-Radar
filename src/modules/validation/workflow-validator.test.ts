import { describe, expect, it } from "bun:test";
import { validateWorkflowSecurity } from "./workflow-validator";

describe("workflow trigger validation", () => {
  it("accepts safe trigger nodes by *Trigger suffix", () => {
    const result = validateWorkflowSecurity({
      name: "Generic Trigger Flow",
      nodes: [
        {
          id: "custom_trigger",
          name: "CRM Trigger",
          type: "@n8n/nodes-crm.crmTrigger",
          typeVersion: 1,
          position: [220, 300],
          parameters: {}
        },
        {
          id: "set_1",
          name: "Normalize Payload",
          type: "n8n-nodes-base.set",
          typeVersion: 3,
          position: [480, 300],
          parameters: {}
        }
      ],
      connections: {
        "CRM Trigger": {
          main: [[{ node: "Normalize Payload", type: "main", index: 0 }]]
        }
      },
      settings: {}
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("requires incoming edges for non-trigger nodes", () => {
    const result = validateWorkflowSecurity({
      name: "Missing Edge Flow",
      nodes: [
        {
          id: "trigger_1",
          name: "Webhook",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1,
          position: [220, 300],
          parameters: {}
        },
        {
          id: "set_1",
          name: "Normalize Payload",
          type: "n8n-nodes-base.set",
          typeVersion: 3,
          position: [480, 300],
          parameters: {}
        }
      ],
      connections: {},
      settings: {}
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes("has no incoming connection"))).toBe(true);
  });
});

describe("workflow blocked nodes and secrets", () => {
  it("allows known high node typeVersion values that can be safely clamped by normalizer", () => {
    const result = validateWorkflowSecurity({
      name: "Incompatible Version Flow",
      nodes: [
        {
          id: "trigger_1",
          name: "Gmail Trigger",
          type: "n8n-nodes-base.gmailTrigger",
          typeVersion: 2.2,
          position: [220, 300],
          parameters: {}
        },
        {
          id: "set_1",
          name: "Normalize Payload",
          type: "n8n-nodes-base.set",
          typeVersion: 3.4,
          position: [480, 300],
          parameters: {}
        }
      ],
      connections: {
        "Gmail Trigger": {
          main: [[{ node: "Normalize Payload", type: "main", index: 0 }]]
        }
      },
      settings: {}
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects unknown node types with high typeVersion that cannot be safely normalized", () => {
    const result = validateWorkflowSecurity({
      name: "Unknown High Version",
      nodes: [
        {
          id: "trigger_1",
          name: "Webhook Trigger",
          type: "n8n-nodes-base.webhook",
          typeVersion: 2.1,
          position: [220, 300],
          parameters: {}
        },
        {
          id: "custom_1",
          name: "Unknown Custom",
          type: "n8n-nodes-base.someUnknownNode",
          typeVersion: 9,
          position: [520, 300],
          parameters: {}
        }
      ],
      connections: {
        "Webhook Trigger": {
          main: [[{ node: "Unknown Custom", type: "main", index: 0 }]]
        }
      },
      settings: {}
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes("cannot be safely normalized"))).toBe(true);
  });

  it("rejects blocked dangerous nodes", () => {
    const result = validateWorkflowSecurity({
      name: "Dangerous Flow",
      nodes: [
        {
          id: "trigger_1",
          name: "Manual Trigger",
          type: "n8n-nodes-base.manualTrigger",
          typeVersion: 1,
          position: [220, 300],
          parameters: {}
        },
        {
          id: "danger_1",
          name: "Run Command",
          type: "n8n-nodes-base.executeCommand",
          typeVersion: 1,
          position: [480, 300],
          parameters: {
            command: "cat /etc/passwd"
          }
        }
      ],
      connections: {
        "Manual Trigger": {
          main: [[{ node: "Run Command", type: "main", index: 0 }]]
        }
      },
      settings: {}
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes("blocked type"))).toBe(true);
  });

  it("rejects inline secrets", () => {
    const result = validateWorkflowSecurity({
      name: "Secret Leak Flow",
      nodes: [
        {
          id: "trigger_1",
          name: "Manual Trigger",
          type: "n8n-nodes-base.manualTrigger",
          typeVersion: 1,
          position: [220, 300],
          parameters: {}
        },
        {
          id: "http_1",
          name: "Call API",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.2,
          position: [480, 300],
          parameters: {
            headers: {
              authorization: "Bearer real-secret"
            }
          }
        }
      ],
      connections: {
        "Manual Trigger": {
          main: [[{ node: "Call API", type: "main", index: 0 }]]
        }
      },
      settings: {}
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes("inline credentials/secrets"))).toBe(true);
  });
});
