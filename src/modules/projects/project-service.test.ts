import { describe, expect, it } from "bun:test";
import { getCredentialPolicy } from "../n8n/credential-policy";
import {
  applyCredentialBindingsToWorkflow,
  collectCredentialRequirements,
  detectNodeCredentialTypes,
  getWorkflowLifecycleCapabilities,
  normalizeWorkflowForDeploy
} from "./project-service";

const EMPTY_WORKFLOW = {
  name: "Test Workflow",
  nodes: [],
  connections: {},
  settings: {}
};

describe("general credential detection", () => {
  it("detects credentials from node.credentials without service-specific defaults", () => {
    const workflow = {
      ...EMPTY_WORKFLOW,
      nodes: [
        {
          id: "trigger_1",
          name: "Trigger",
          type: "n8n-nodes-base.manualTrigger",
          typeVersion: 1,
          position: [200, 200],
          parameters: {}
        },
        {
          id: "action_1",
          name: "Call Partner API",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.2,
          position: [440, 200],
          parameters: {},
          credentials: {
            partnerApiKey: {
              name: "Partner API Key"
            }
          }
        }
      ]
    };

    const types = detectNodeCredentialTypes(
      workflow.nodes[1] as unknown as Record<string, unknown>
    );
    expect(types).toContain("partnerApiKey");
    expect(types).not.toContain("telegramApi");
    expect(types).not.toContain("gmailOAuth2Api");
    expect(types).not.toContain("slackApi");

    const requirements = collectCredentialRequirements({
      workflow: workflow as unknown as {
        nodes: Array<Record<string, unknown>>;
        connections: Record<string, unknown>;
        settings: Record<string, unknown>;
      },
      availableCredentials: [],
      credentialBindings: []
    });

    expect(requirements).toHaveLength(1);
    expect(requirements[0]?.credential_type).toBe("partnerApiKey");
    expect(requirements[0]?.provisioning_mode).toBe("manual");
  });

  it("returns no requirements for credential-free workflow", () => {
    const workflow = {
      ...EMPTY_WORKFLOW,
      nodes: [
        {
          id: "trigger_1",
          name: "Trigger",
          type: "n8n-nodes-base.manualTrigger",
          typeVersion: 1,
          position: [200, 200],
          parameters: {}
        },
        {
          id: "set_1",
          name: "Set Data",
          type: "n8n-nodes-base.set",
          typeVersion: 3,
          position: [440, 200],
          parameters: {}
        }
      ]
    };

    const requirements = collectCredentialRequirements({
      workflow: workflow as unknown as {
        nodes: Array<Record<string, unknown>>;
        connections: Record<string, unknown>;
        settings: Record<string, unknown>;
      },
      availableCredentials: [],
      credentialBindings: []
    });

    expect(requirements).toHaveLength(0);
  });
});

describe("manual credential policy", () => {
  it("always returns manual policy", () => {
    const policy = getCredentialPolicy("anyCustomCredential");
    expect(policy.mode).toBe("manual");
    expect(policy.fields).toHaveLength(0);
    expect(policy.manual_message.length).toBeGreaterThan(0);
  });
});

describe("per-node credential binding", () => {
  it("applies binding only to the exact node", () => {
    const workflow = {
      ...EMPTY_WORKFLOW,
      nodes: [
        {
          id: "node_a",
          name: "Request A",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.2,
          position: [440, 200],
          parameters: {},
          credentials: {
            partnerApiKey: {}
          }
        },
        {
          id: "node_b",
          name: "Request B",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.2,
          position: [700, 200],
          parameters: {},
          credentials: {
            partnerApiKey: {}
          }
        }
      ]
    };

    const bound = applyCredentialBindingsToWorkflow(workflow as unknown as {
      nodes: Array<Record<string, unknown>>;
      connections: Record<string, unknown>;
      settings: Record<string, unknown>;
    }, [
      {
        node_id: "node_a",
        node_name: "Request A",
        credential_type: "partnerApiKey",
        id: "cred-123",
        name: "Partner API Key"
      }
    ]);

    const first = bound.nodes[0]?.credentials as Record<string, unknown>;
    const second = bound.nodes[1]?.credentials as Record<string, unknown>;
    expect((first.partnerApiKey as Record<string, unknown>)?.id).toBe("cred-123");
    expect((second.partnerApiKey as Record<string, unknown>)?.id).toBeUndefined();
  });

  it("supports legacy fallback by credential_type", () => {
    const workflow = {
      ...EMPTY_WORKFLOW,
      nodes: [
        {
          id: "node_a",
          name: "Request A",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.2,
          position: [440, 200],
          parameters: {},
          credentials: {
            partnerApiKey: {}
          }
        },
        {
          id: "node_b",
          name: "Request B",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.2,
          position: [700, 200],
          parameters: {},
          credentials: {
            partnerApiKey: {}
          }
        }
      ]
    };

    const bound = applyCredentialBindingsToWorkflow(workflow as unknown as {
      nodes: Array<Record<string, unknown>>;
      connections: Record<string, unknown>;
      settings: Record<string, unknown>;
    }, [
      {
        node_id: null,
        node_name: null,
        credential_type: "partnerApiKey",
        id: "legacy-cred"
      }
    ]);

    const first = bound.nodes[0]?.credentials as Record<string, unknown>;
    const second = bound.nodes[1]?.credentials as Record<string, unknown>;
    expect((first.partnerApiKey as Record<string, unknown>)?.id).toBe("legacy-cred");
    expect((second.partnerApiKey as Record<string, unknown>)?.id).toBe("legacy-cred");
  });
});

describe("workflow lifecycle capabilities", () => {
  it("rejected cannot deploy-check/deploy/activate", () => {
    const capabilities = getWorkflowLifecycleCapabilities({
      workflowStatus: "rejected",
      missingCredentialsCount: 0,
      credentialsSourceOk: true,
      hasN8nWorkflowId: false
    });

    expect(capabilities.can_deploy_inactive).toBe(false);
    expect(capabilities.can_activate).toBe(false);
    expect(capabilities.can_redeploy).toBe(false);
    expect(capabilities.can_delete).toBe(true);
  });

  it("validated can deploy inactive without credentials", () => {
    const capabilities = getWorkflowLifecycleCapabilities({
      workflowStatus: "validated",
      missingCredentialsCount: 3,
      credentialsSourceOk: true,
      hasN8nWorkflowId: false
    });

    expect(capabilities.can_deploy_inactive).toBe(true);
    expect(capabilities.can_activate).toBe(false);
  });

  it("deployed states can redeploy", () => {
    const inactive = getWorkflowLifecycleCapabilities({
      workflowStatus: "deployed_inactive",
      missingCredentialsCount: 0,
      credentialsSourceOk: true,
      hasN8nWorkflowId: true
    });
    const active = getWorkflowLifecycleCapabilities({
      workflowStatus: "deployed_active",
      missingCredentialsCount: 0,
      credentialsSourceOk: true,
      hasN8nWorkflowId: true
    });

    expect(inactive.can_redeploy).toBe(true);
    expect(active.can_redeploy).toBe(true);
  });

  it("activation is blocked when credentials are missing", () => {
    const capabilities = getWorkflowLifecycleCapabilities({
      workflowStatus: "deployed_inactive",
      missingCredentialsCount: 1,
      credentialsSourceOk: true,
      hasN8nWorkflowId: true
    });

    expect(capabilities.can_activate).toBe(false);
  });
});

describe("deploy payload normalization", () => {
  it("removes internal normalization metadata from workflow settings before n8n deploy", () => {
    const workflow = {
      name: "Metadata Workflow",
      nodes: [
        {
          id: "trigger_1",
          name: "Trigger",
          type: "n8n-nodes-base.manualTrigger",
          typeVersion: 1,
          position: [200, 200],
          parameters: {}
        }
      ],
      connections: {},
      settings: {
        executionOrder: "v1",
        __opsRadarNormalizationWarnings: ["warning-a"]
      }
    };

    const normalized = normalizeWorkflowForDeploy(
      workflow as unknown as import("../../types/workflow").N8nWorkflow,
      "Fallback Name"
    );

    expect(normalized.settings.executionOrder).toBe("v1");
    expect(
      Object.prototype.hasOwnProperty.call(normalized.settings, "__opsRadarNormalizationWarnings")
    ).toBe(false);
  });
});
