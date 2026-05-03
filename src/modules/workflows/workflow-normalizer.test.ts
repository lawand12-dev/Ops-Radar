import { describe, expect, it } from "bun:test";
import { normalizeWorkflowDefinition } from "./workflow-normalizer";

describe("workflow normalizer", () => {
  it("keeps dangerous logic visible and does not replace blocked nodes silently", () => {
    const normalized = normalizeWorkflowDefinition({
      name: "Danger Flow",
      nodes: [
        {
          id: "node_1",
          name: "Manual Trigger",
          type: "n8n-nodes-base.manualTrigger",
          typeVersion: 1,
          position: [220, 300],
          parameters: {}
        },
        {
          id: "node_2",
          name: "Function Node",
          type: "n8n-nodes-base.function",
          typeVersion: 1,
          position: [500, 300],
          parameters: {
            functionCode: "return items;"
          }
        }
      ],
      connections: {
        "Manual Trigger": {
          main: [[{ node: "Function Node", type: "main", index: 0 }]]
        }
      },
      settings: {}
    });

    expect(normalized.nodes[1]?.type).toBe("n8n-nodes-base.function");
  });

  it("normalizes connections that reference node ids instead of names", () => {
    const normalized = normalizeWorkflowDefinition({
      name: "Connection Normalize",
      nodes: [
        {
          id: "trigger-id",
          name: "Webhook Trigger",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1,
          position: [250, 300],
          parameters: {}
        },
        {
          id: "set-id",
          name: "Set Data",
          type: "n8n-nodes-base.set",
          typeVersion: 3,
          position: [450, 300],
          parameters: {}
        }
      ],
      connections: {
        "trigger-id": {
          main: [[{ node: "set-id", type: "main", index: 0 }]]
        }
      },
      settings: {}
    });

    expect(normalized.connections["Webhook Trigger"]).toBeDefined();
    expect(normalized.connections["Webhook Trigger"]?.main?.[0]?.[0]?.node).toBe("Set Data");
  });

  it("ensures workflow.name and settings warnings metadata", () => {
    const normalized = normalizeWorkflowDefinition({
      nodes: [
        {
          id: "trigger_1",
          name: "Manual Trigger",
          type: "n8n-nodes-base.manualTrigger",
          typeVersion: 1,
          position: [220, 300]
        }
      ],
      connections: {}
    });

    expect(typeof normalized.name).toBe("string");
    expect((normalized.name || "").length).toBeGreaterThan(0);
    expect(Array.isArray(normalized.settings.__opsRadarNormalizationWarnings)).toBe(true);
  });

  it("clamps known node type versions to compatible max values", () => {
    const normalized = normalizeWorkflowDefinition({
      name: "Version Clamp",
      nodes: [
        {
          id: "gmail_trigger_1",
          name: "Gmail Trigger",
          type: "n8n-nodes-base.gmailTrigger",
          typeVersion: 2.2,
          position: [80, 300],
          parameters: {}
        },
        {
          id: "trigger_1",
          name: "Telegram Send",
          type: "n8n-nodes-base.telegram",
          typeVersion: 2.1,
          position: [340, 300],
          parameters: {}
        },
        {
          id: "set_1",
          name: "Set Data",
          type: "n8n-nodes-base.set",
          typeVersion: 3.9,
          position: [620, 300],
          parameters: {}
        }
      ],
      connections: {
        "Gmail Trigger": {
          main: [[{ node: "Telegram Send", type: "main", index: 0 }]]
        },
        "Telegram Send": {
          main: [[{ node: "Set Data", type: "main", index: 0 }]]
        }
      },
      settings: {}
    });

    expect(normalized.nodes[0]?.typeVersion).toBe(1.4);
    expect(normalized.nodes[1]?.typeVersion).toBe(1.2);
    expect(normalized.nodes[2]?.typeVersion).toBe(3.4);
    expect(Array.isArray(normalized.settings.__opsRadarNormalizationWarnings)).toBe(true);
  });

  it("keeps unknown high node typeVersion and emits compatibility warning", () => {
    const normalized = normalizeWorkflowDefinition({
      name: "Unknown Version",
      nodes: [
        {
          id: "custom_1",
          name: "Custom Node",
          type: "n8n-nodes-base.someUnknownNode",
          typeVersion: 9,
          position: [220, 300],
          parameters: {}
        }
      ],
      connections: {},
      settings: {}
    });

    expect(normalized.nodes[0]?.typeVersion).toBe(9);
    const warnings = normalized.settings.__opsRadarNormalizationWarnings;
    expect(Array.isArray(warnings)).toBe(true);
    expect((warnings as string[]).some((warning) => warning.includes("unknown to compatibility registry"))).toBe(
      true
    );
  });

  it("resolves connections for duplicate node names after rename", () => {
    const normalized = normalizeWorkflowDefinition({
      name: "Duplicate Names",
      nodes: [
        {
          id: "node_1",
          name: "HTTP Request",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4,
          position: [220, 300],
          parameters: {}
        },
        {
          id: "node_2",
          name: "HTTP Request",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4,
          position: [440, 300],
          parameters: {}
        },
        {
          id: "node_3",
          name: "Set Data",
          type: "n8n-nodes-base.set",
          typeVersion: 3,
          position: [660, 300],
          parameters: {}
        }
      ],
      connections: {
        "HTTP Request": {
          main: [[{ node: "HTTP Request", type: "main", index: 0 }]]
        },
        "node_2": {
          main: [[{ node: "Set Data", type: "main", index: 0 }]]
        }
      },
      settings: {}
    });

    // The second "HTTP Request" should be renamed to "HTTP Request 2"
    expect(normalized.nodes[0]?.name).toBe("HTTP Request");
    expect(normalized.nodes[1]?.name).toBe("HTTP Request 2");
    expect(normalized.nodes[2]?.name).toBe("Set Data");

    // Connection from "HTTP Request" name should resolve to the first node (canonical match)
    expect(normalized.connections["HTTP Request"]).toBeDefined();
    // Connection from "node_2" (ID) should resolve to "HTTP Request 2" (renamed node)
    expect(normalized.connections["HTTP Request 2"]).toBeDefined();
    expect(normalized.connections["HTTP Request 2"]?.main?.[0]?.[0]?.node).toBe("Set Data");
  });

  it("does not silently drop connections when node names are deduplicated", () => {
    const normalized = normalizeWorkflowDefinition({
      name: "Connection Preservation",
      nodes: [
        {
          id: "trigger_1",
          name: "Manual Trigger",
          type: "n8n-nodes-base.manualTrigger",
          typeVersion: 1,
          position: [100, 300],
          parameters: {}
        },
        {
          id: "http_1",
          name: "HTTP Request",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4,
          position: [320, 200],
          parameters: {}
        },
        {
          id: "http_2",
          name: "HTTP Request",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4,
          position: [320, 400],
          parameters: {}
        },
        {
          id: "merge_1",
          name: "Merge",
          type: "n8n-nodes-base.merge",
          typeVersion: 3,
          position: [540, 300],
          parameters: {}
        }
      ],
      connections: {
        "Manual Trigger": {
          main: [
            [
              { node: "http_1", type: "main", index: 0 },
              { node: "http_2", type: "main", index: 0 }
            ]
          ]
        },
        "http_1": {
          main: [[{ node: "Merge", type: "main", index: 0 }]]
        },
        "http_2": {
          main: [[{ node: "Merge", type: "main", index: 1 }]]
        }
      },
      settings: {}
    });

    // Verify all connection sources are preserved (none silently dropped)
    const connectionKeys = Object.keys(normalized.connections);
    expect(connectionKeys.length).toBe(3);

    // Verify the renamed node's connections are present
    expect(normalized.connections["Manual Trigger"]).toBeDefined();
    expect(normalized.connections["HTTP Request"]).toBeDefined();
    expect(normalized.connections["HTTP Request 2"]).toBeDefined();

    // Verify target nodes in the merge connections are correct
    expect(normalized.connections["HTTP Request"]?.main?.[0]?.[0]?.node).toBe("Merge");
    expect(normalized.connections["HTTP Request 2"]?.main?.[0]?.[0]?.node).toBe("Merge");
  });

  it("handles connections keyed by original AI names when nodes are renamed", () => {
    // Simulates an AI that generates connections keyed by the original node name,
    // but the normalizer renames the node due to deduplication.
    const normalized = normalizeWorkflowDefinition({
      name: "AI Original Name Keys",
      nodes: [
        {
          id: "id_1",
          name: "Send Email",
          type: "n8n-nodes-base.gmail",
          typeVersion: 2,
          position: [220, 200],
          parameters: {}
        },
        {
          id: "id_2",
          name: "Send Email",
          type: "n8n-nodes-base.gmail",
          typeVersion: 2,
          position: [220, 400],
          parameters: {}
        }
      ],
      connections: {
        "Send Email": {
          main: [[{ node: "id_2", type: "main", index: 0 }]]
        }
      },
      settings: {}
    });

    // "Send Email" should map to first node, "id_2" should resolve to "Send Email 2"
    expect(normalized.nodes[0]?.name).toBe("Send Email");
    expect(normalized.nodes[1]?.name).toBe("Send Email 2");
    expect(normalized.connections["Send Email"]).toBeDefined();
    expect(normalized.connections["Send Email"]?.main?.[0]?.[0]?.node).toBe("Send Email 2");
  });

  it("sets __opsRadarConnectionErrors when a connection source cannot be resolved", () => {
    const normalized = normalizeWorkflowDefinition({
      name: "Unresolvable Source",
      nodes: [
        {
          id: "node_1",
          name: "Manual Trigger",
          type: "n8n-nodes-base.manualTrigger",
          typeVersion: 1,
          position: [220, 300],
          parameters: {}
        },
        {
          id: "node_2",
          name: "Set Data",
          type: "n8n-nodes-base.set",
          typeVersion: 3,
          position: [440, 300],
          parameters: {}
        }
      ],
      connections: {
        "Nonexistent Node": {
          main: [[{ node: "Set Data", type: "main", index: 0 }]]
        }
      },
      settings: {}
    });

    const connectionErrors = normalized.settings.__opsRadarConnectionErrors;
    expect(Array.isArray(connectionErrors)).toBe(true);
    expect((connectionErrors as string[]).length).toBeGreaterThan(0);
    expect((connectionErrors as string[]).some((e) => e.includes("could not be resolved"))).toBe(true);
  });

  it("sets __opsRadarConnectionErrors when a connection target cannot be resolved", () => {
    const normalized = normalizeWorkflowDefinition({
      name: "Unresolvable Target",
      nodes: [
        {
          id: "node_1",
          name: "Manual Trigger",
          type: "n8n-nodes-base.manualTrigger",
          typeVersion: 1,
          position: [220, 300],
          parameters: {}
        },
        {
          id: "node_2",
          name: "Set Data",
          type: "n8n-nodes-base.set",
          typeVersion: 3,
          position: [440, 300],
          parameters: {}
        }
      ],
      connections: {
        "Manual Trigger": {
          main: [[{ node: "Ghost Node", type: "main", index: 0 }]]
        }
      },
      settings: {}
    });

    const connectionErrors = normalized.settings.__opsRadarConnectionErrors;
    expect(Array.isArray(connectionErrors)).toBe(true);
    expect((connectionErrors as string[]).length).toBeGreaterThan(0);
    expect((connectionErrors as string[]).some((e) => e.includes("could not be resolved"))).toBe(true);
  });

  it("sets __opsRadarConnectionErrors when multi-node workflow has empty connections", () => {
    const normalized = normalizeWorkflowDefinition({
      name: "No Connections",
      nodes: [
        {
          id: "node_1",
          name: "Manual Trigger",
          type: "n8n-nodes-base.manualTrigger",
          typeVersion: 1,
          position: [220, 300],
          parameters: {}
        },
        {
          id: "node_2",
          name: "Set Data",
          type: "n8n-nodes-base.set",
          typeVersion: 3,
          position: [440, 300],
          parameters: {}
        }
      ],
      connections: {},
      settings: {}
    });

    const connectionErrors = normalized.settings.__opsRadarConnectionErrors;
    expect(Array.isArray(connectionErrors)).toBe(true);
    expect((connectionErrors as string[]).length).toBeGreaterThan(0);
    expect(
      (connectionErrors as string[]).some((e) => e.includes("0 connections after normalization"))
    ).toBe(true);
  });
});

// Integration: validate that the security validator rejects workflows with connection errors
import { validateWorkflowSecurity } from "../validation/workflow-validator";

describe("workflow validator + normalizer integration", () => {
  it("rejects a normalized workflow that has connection errors", () => {
    const normalized = normalizeWorkflowDefinition({
      name: "Should Be Rejected",
      nodes: [
        {
          id: "node_1",
          name: "Manual Trigger",
          type: "n8n-nodes-base.manualTrigger",
          typeVersion: 1,
          position: [220, 300],
          parameters: {}
        },
        {
          id: "node_2",
          name: "HTTP Request",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4,
          position: [440, 300],
          parameters: {}
        }
      ],
      connections: {
        "Nonexistent Source": {
          main: [[{ node: "Nonexistent Target", type: "main", index: 0 }]]
        }
      },
      settings: {}
    });

    // The normalizer should have flagged connection errors
    expect(Array.isArray(normalized.settings.__opsRadarConnectionErrors)).toBe(true);

    // The validator should reject the workflow
    const validation = validateWorkflowSecurity(normalized);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes("could not be resolved") || e.includes("was dropped"))).toBe(true);
  });

  it("rejects a multi-node workflow with no connections provided", () => {
    const normalized = normalizeWorkflowDefinition({
      name: "Empty Connections Rejected",
      nodes: [
        {
          id: "node_1",
          name: "Schedule Trigger",
          type: "n8n-nodes-base.scheduleTrigger",
          typeVersion: 1,
          position: [220, 300],
          parameters: {}
        },
        {
          id: "node_2",
          name: "HTTP Request",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4,
          position: [440, 300],
          parameters: {}
        }
      ],
      connections: {},
      settings: {}
    });

    const validation = validateWorkflowSecurity(normalized);
    expect(validation.valid).toBe(false);
    expect(
      validation.errors.some((e) => e.includes("0 connections after normalization"))
    ).toBe(true);
  });
});
