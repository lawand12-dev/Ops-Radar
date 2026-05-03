import { describe, expect, it } from "bun:test";
import { validateWorkflowStructure } from "../validation/workflow-validator";

describe("AI workflow schema", () => {
  it("accepts product output with required_credentials and workflow.name", () => {
    const payload = {
      project_name: "Lead Intake Automation",
      description: "Capture webhook leads and normalize payload.",
      required_credentials: [],
      workflow: {
        name: "Lead Intake Flow",
        nodes: [
          {
            id: "trigger_1",
            name: "Webhook Trigger",
            type: "n8n-nodes-base.webhook",
            typeVersion: 1,
            position: [220, 300],
            parameters: {}
          },
          {
            id: "set_1",
            name: "Normalize",
            type: "n8n-nodes-base.set",
            typeVersion: 3,
            position: [480, 300],
            parameters: {}
          }
        ],
        connections: {
          "Webhook Trigger": {
            main: [[{ node: "Normalize", type: "main", index: 0 }]]
          }
        },
        settings: {}
      }
    };

    const result = validateWorkflowStructure(payload);
    expect(result.parsed).not.toBeNull();
    expect(result.errors).toHaveLength(0);
  });

  it("rejects payload missing required_credentials", () => {
    const payload = {
      project_name: "Lead Intake Automation",
      description: "Capture webhook leads and normalize payload.",
      workflow: {
        name: "Lead Intake Flow",
        nodes: [
          {
            id: "trigger_1",
            name: "Webhook Trigger",
            type: "n8n-nodes-base.webhook",
            typeVersion: 1,
            position: [220, 300],
            parameters: {}
          }
        ],
        connections: {},
        settings: {}
      }
    };

    const result = validateWorkflowStructure(payload);
    expect(result.parsed).toBeNull();
    expect(result.errors.some((error) => error.includes("required_credentials"))).toBe(true);
  });
});
