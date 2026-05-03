import { describe, expect, it } from "bun:test";
import { aiServiceInternals } from "./ai-service";
import type { N8nWorkflow } from "../../types/workflow";

describe("AI intent coverage and prompt context", () => {
  it("does not fail weak relation check for multilingual requests with concrete action nodes", () => {
    const workflow: N8nWorkflow = {
      name: "Email to Chat Forwarder",
      nodes: [
        {
          id: "trigger_1",
          name: "Gmail Trigger",
          type: "n8n-nodes-base.gmailTrigger",
          typeVersion: 1,
          position: [220, 300],
          parameters: {}
        },
        {
          id: "set_1",
          name: "Map Payload",
          type: "n8n-nodes-base.set",
          typeVersion: 3,
          position: [460, 300],
          parameters: {}
        },
        {
          id: "action_1",
          name: "Send Telegram Message",
          type: "n8n-nodes-base.telegram",
          typeVersion: 1,
          position: [720, 300],
          parameters: {}
        }
      ],
      connections: {},
      settings: {}
    };

    const errors = aiServiceInternals.validateWorkflowIntentCoverage(
      "\u0627\u0628\u063a\u0649 \u0627\u0648\u062a\u0648\u0645\u064a\u0634\u0646 \u064a\u062d\u0648\u0644 \u0627\u064a\u0645\u064a\u0644\u0627\u062a \u062c\u064a\u0645\u064a\u0644 \u0625\u0644\u0649 \u062a\u064a\u0644\u064a\u062c\u0631\u0627\u0645",
      workflow
    );

    expect(
      errors.includes("Workflow action node names/types are weakly related to the user request.")
    ).toBe(false);
  });

  it("fails when all action nodes are generic transforms", () => {
    const workflow: N8nWorkflow = {
      name: "Generic Transform Flow",
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
          id: "set_1",
          name: "Set Data",
          type: "n8n-nodes-base.set",
          typeVersion: 3,
          position: [460, 300],
          parameters: {}
        },
        {
          id: "if_1",
          name: "If Condition",
          type: "n8n-nodes-base.if",
          typeVersion: 2,
          position: [680, 300],
          parameters: {}
        }
      ],
      connections: {},
      settings: {}
    };

    const errors = aiServiceInternals.validateWorkflowIntentCoverage(
      "Build automation to sync Stripe charges into Notion",
      workflow
    );

    expect(
      errors.includes("Workflow action nodes are too generic. Add at least one concrete business action node.")
    ).toBe(true);
  });

  it("injects knowledge base context into workflow generation prompt", () => {
    const systemPrompt = aiServiceInternals.buildWorkflowGenerationSystemPrompt(
      "Create automation that receives webhook leads and writes to CRM",
      "test-trace-id"
    );

    expect(systemPrompt.includes("<OPS_RADAR_KNOWLEDGE_BASE>")).toBe(true);
    expect(systemPrompt.includes("[FILE: knowledge-base/CLAUDE.md]")).toBe(true);
    expect(systemPrompt.includes("[FILE: knowledge-base/index.md]")).toBe(true);
  });
});
