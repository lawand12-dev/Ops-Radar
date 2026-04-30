const state = {
  projects: [],
  selectedProjectId: null,
  latestGeneratedProjectId: null,
  builderPayload: null,
  deployPreflightByProject: {},
  credentialBindingsByProject: {},
  credentialSchemaCache: {}
};

const el = {
  healthBadge: document.getElementById("healthBadge"),
  globalRefreshBtn: document.getElementById("globalRefreshBtn"),
  navButtons: Array.from(document.querySelectorAll(".nav-btn")),
  views: {
    builder: document.getElementById("view-builder"),
    projects: document.getElementById("view-projects"),
    workflow: document.getElementById("view-workflow"),
    analytics: document.getElementById("view-analytics"),
    events: document.getElementById("view-events")
  },
  toast: document.getElementById("toast"),

  chatForm: document.getElementById("chatForm"),
  chatInput: document.getElementById("chatInput"),
  generateBtn: document.getElementById("generateBtn"),
  builderOutput: document.getElementById("builderOutput"),
  builderProjectId: document.getElementById("builderProjectId"),
  builderValidation: document.getElementById("builderValidation"),
  copyBuilderJsonBtn: document.getElementById("copyBuilderJsonBtn"),
  deployFromBuilderBtn: document.getElementById("deployFromBuilderBtn"),

  projectSearchInput: document.getElementById("projectSearchInput"),
  refreshProjectsBtn: document.getElementById("refreshProjectsBtn"),
  projectsList: document.getElementById("projectsList"),
  projectDetails: document.getElementById("projectDetails"),
  projectWorkflowJson: document.getElementById("projectWorkflowJson"),
  projectMessages: document.getElementById("projectMessages"),
  deployProjectBtn: document.getElementById("deployProjectBtn"),
  deployActivateInput: document.getElementById("deployActivateInput"),
  checkDeployBtn: document.getElementById("checkDeployBtn"),
  saveCredentialsBtn: document.getElementById("saveCredentialsBtn"),
  deployCheckSummary: document.getElementById("deployCheckSummary"),
  deployCredentialsForm: document.getElementById("deployCredentialsForm"),
  quickCredentialTypeInput: document.getElementById("quickCredentialTypeInput"),
  quickCredentialNameInput: document.getElementById("quickCredentialNameInput"),
  quickCredentialDataInput: document.getElementById("quickCredentialDataInput"),
  loadCredentialSchemaBtn: document.getElementById("loadCredentialSchemaBtn"),
  createCredentialBtn: document.getElementById("createCredentialBtn"),
  credentialSchemaOutput: document.getElementById("credentialSchemaOutput"),

  workflowIdInput: document.getElementById("workflowIdInput"),
  loadWorkflowStatusBtn: document.getElementById("loadWorkflowStatusBtn"),
  workflowStatusSummary: document.getElementById("workflowStatusSummary"),
  workflowStatusJson: document.getElementById("workflowStatusJson"),

  refreshAnalyticsBtn: document.getElementById("refreshAnalyticsBtn"),
  analyticsCards: document.getElementById("analyticsCards"),
  analyticsTableBody: document.querySelector("#analyticsTable tbody"),

  eventForm: document.getElementById("eventForm"),
  eventWorkflowIdInput: document.getElementById("eventWorkflowIdInput"),
  eventN8nWorkflowIdInput: document.getElementById("eventN8nWorkflowIdInput"),
  eventRunIdInput: document.getElementById("eventRunIdInput"),
  eventNodeNameInput: document.getElementById("eventNodeNameInput"),
  eventTypeInput: document.getElementById("eventTypeInput"),
  eventStatusInput: document.getElementById("eventStatusInput"),
  eventDurationInput: document.getElementById("eventDurationInput"),
  eventErrorInput: document.getElementById("eventErrorInput"),
  eventMetaInput: document.getElementById("eventMetaInput"),
  eventResponseJson: document.getElementById("eventResponseJson")
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ar-IQ");
}

function setToast(message, tone = "ok") {
  el.toast.textContent = message;
  el.toast.style.borderColor =
    tone === "error" ? "rgba(239,71,111,0.64)" : "rgba(60,201,174,0.55)";
  el.toast.style.color = tone === "error" ? "#ffc3d1" : "#98f3e1";
  el.toast.classList.add("show");
  window.clearTimeout(setToast.timer);
  setToast.timer = window.setTimeout(() => el.toast.classList.remove("show"), 3800);
}

async function apiFetch(path, options = {}) {
  const response = await fetch(path, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = payload?.error?.details;
    const code = payload?.error?.code ? `[${payload.error.code}] ` : "";
    const detailsText =
      details === undefined
        ? ""
        : typeof details === "string"
          ? `\n${details}`
          : `\n${JSON.stringify(details, null, 2)}`;
    const msg = `${code}${payload?.error?.message ?? `Request failed (${response.status})`}${detailsText}`;
    throw new Error(msg);
  }
  return payload;
}

function setActiveView(view) {
  el.navButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.view === view));
  Object.entries(el.views).forEach(([name, node]) => {
    node.classList.toggle("view-active", name === view);
  });
}

async function refreshHealth() {
  try {
    await apiFetch("/health");
    el.healthBadge.textContent = "API healthy";
    el.healthBadge.className = "badge badge-ok";
  } catch {
    el.healthBadge.textContent = "API down";
    el.healthBadge.className = "badge badge-bad";
  }
}

function validationBadge(valid) {
  if (valid === true) {
    return `<span class="badge badge-ok">valid</span>`;
  }
  if (valid === false) {
    return `<span class="badge badge-bad">invalid</span>`;
  }
  return `<span class="badge badge-muted">unknown</span>`;
}

function healthPill(isWorking, status) {
  const label = isWorking ? "working" : status || "issue";
  return `<span class="pill ${isWorking ? "pill-success" : "pill-failure"}">${escapeHtml(label)}</span>`;
}

function getProjectCredentialBindings(projectId) {
  if (!projectId) return {};
  if (!state.credentialBindingsByProject[projectId]) {
    state.credentialBindingsByProject[projectId] = {};
  }
  return state.credentialBindingsByProject[projectId];
}

function setProjectCredentialBinding(projectId, credentialType, binding) {
  const bindings = getProjectCredentialBindings(projectId);
  if (!binding || (!binding.id && !binding.name)) {
    delete bindings[credentialType];
    return;
  }
  bindings[credentialType] = binding;
}

function currentCredentialBindingsPayload(projectId) {
  const bindings = getProjectCredentialBindings(projectId);
  const output = {};
  Object.entries(bindings).forEach(([type, binding]) => {
    if (!binding || (typeof binding !== "object")) return;
    const item = {};
    if (typeof binding.id === "string" && binding.id.trim()) {
      item.id = binding.id.trim();
    }
    if (typeof binding.name === "string" && binding.name.trim()) {
      item.name = binding.name.trim();
    }
    if (item.id || item.name) {
      output[type] = item;
    }
  });
  return output;
}

function normalizeCredentialType(value) {
  return String(value || "").trim();
}

function defaultJsonValueFromSchemaProperty(property) {
  if (!property || typeof property !== "object") return "";
  if ("default" in property) return property.default;

  const type = property.type;
  if (type === "boolean") return false;
  if (type === "number" || type === "integer") return 0;
  if (type === "array") return [];
  if (type === "object") return {};
  return "";
}

function buildDataTemplateFromCredentialSchema(schema) {
  const properties = schema?.properties;
  if (!properties || typeof properties !== "object") {
    return {};
  }

  const template = {};
  Object.entries(properties).forEach(([key, property]) => {
    template[key] = defaultJsonValueFromSchemaProperty(property);
  });

  return template;
}

function quickCredentialDataPayload() {
  const raw = (el.quickCredentialDataInput.value || "").trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

function applyQuickCredentialType(type) {
  const normalized = normalizeCredentialType(type);
  el.quickCredentialTypeInput.value = normalized;
  if (!el.quickCredentialNameInput.value.trim()) {
    el.quickCredentialNameInput.value = `${normalized}-credential`;
  }
}

async function fetchCredentialSchema(credentialType) {
  const normalizedType = normalizeCredentialType(credentialType);
  if (!normalizedType) {
    throw new Error("Credential type is required.");
  }

  if (state.credentialSchemaCache[normalizedType]) {
    return state.credentialSchemaCache[normalizedType];
  }

  const schema = await apiFetch(`/n8n/credentials/schema/${encodeURIComponent(normalizedType)}`);
  state.credentialSchemaCache[normalizedType] = schema;
  return schema;
}

async function createN8nCredentialFromUi(input) {
  const payload = await apiFetch("/n8n/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return payload;
}

async function loadProjectCredentialBindings(projectId) {
  const payload = await apiFetch(`/projects/${projectId}/credential-bindings`);
  state.credentialBindingsByProject[projectId] = payload.credential_bindings || {};
  return state.credentialBindingsByProject[projectId];
}

async function saveProjectCredentialBindings(projectId) {
  const payload = currentCredentialBindingsPayload(projectId);
  const response = await apiFetch(`/projects/${projectId}/credential-bindings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential_bindings: payload })
  });
  state.credentialBindingsByProject[projectId] = response.credential_bindings || {};
  return response;
}

async function loadProjects() {
  const result = await apiFetch("/projects?limit=50&offset=0");
  state.projects = Array.isArray(result.items) ? result.items : [];
  renderProjects();
}

function renderProjects() {
  const filter = (el.projectSearchInput.value || "").toLowerCase().trim();
  const items = state.projects.filter((item) =>
    String(item?.project?.name || "")
      .toLowerCase()
      .includes(filter)
  );

  if (items.length === 0) {
    el.projectsList.innerHTML = `<div class="details-box">No projects found.</div>`;
    return;
  }

  el.projectsList.innerHTML = items
    .map((item) => {
      const isActive = state.selectedProjectId === item.project.id;
      return `
        <article class="project-card ${isActive ? "active" : ""}" data-project-id="${item.project.id}">
          <h4 class="project-name">${escapeHtml(item.project.name)}</h4>
          <div class="project-line">
            status: ${escapeHtml(item.project.status)} |
            workflow: ${escapeHtml(item.workflow?.status || "-")}
          </div>
          <div class="project-line">
            ${healthPill(Boolean(item.health?.is_working), item.health?.last_run_status)} |
            alerts: ${Number(item.health?.unresolved_alerts || 0)}
          </div>
          <div class="project-line">created: ${formatDate(item.project.created_at)}</div>
        </article>
      `;
    })
    .join("");

  Array.from(document.querySelectorAll(".project-card[data-project-id]")).forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.getAttribute("data-project-id");
      if (id) {
        selectProject(id).catch((error) => setToast(error.message, "error"));
      }
    });
  });
}

function renderProjectDetails(snapshot, messagesResponse) {
  const project = snapshot.project;
  const workflow = snapshot.workflow;
  const health = snapshot.health;

  el.projectDetails.innerHTML = `
    <div><strong>${escapeHtml(project.name)}</strong></div>
    <div>${escapeHtml(project.description)}</div>
    <div>project_id: ${escapeHtml(project.id)}</div>
    <div>project_status: ${escapeHtml(project.status)}</div>
    <div>created_at: ${formatDate(project.created_at)}</div>
    <hr />
    <div>is_working: ${health?.is_working ? "yes" : "no"}</div>
    <div>last_run_status: ${escapeHtml(health?.last_run_status || "-")}</div>
    <div>last_run_at: ${formatDate(health?.last_run_at)}</div>
    <div>errors: ${Number(health?.recent_errors?.length || 0)}</div>
    <div>ai_solution: ${escapeHtml(health?.ai_suggestion?.solution || "-")}</div>
  `;

  el.projectWorkflowJson.textContent = workflow ? JSON.stringify(workflow.json, null, 2) : "No workflow";

  const messages = Array.isArray(messagesResponse?.messages) ? messagesResponse.messages : [];
  if (messages.length === 0) {
    el.projectMessages.innerHTML = "No chat messages";
  } else {
    el.projectMessages.innerHTML = messages
      .map(
        (msg) => `
          <div class="message">
            <div class="message-head">
              <span>${escapeHtml(msg.role)}</span>
              <span>${formatDate(msg.created_at)}</span>
            </div>
            <div>${escapeHtml(msg.content)}</div>
          </div>
        `
      )
      .join("");
  }
}

async function selectProject(projectId) {
  state.selectedProjectId = projectId;
  el.deployProjectBtn.disabled = false;
  el.checkDeployBtn.disabled = false;
  el.saveCredentialsBtn.disabled = false;
  el.loadCredentialSchemaBtn.disabled = false;
  el.createCredentialBtn.disabled = false;
  renderProjects();

  const [snapshot, messages] = await Promise.all([
    apiFetch(`/projects/${projectId}`),
    apiFetch(`/projects/${projectId}/messages`)
  ]);

  renderProjectDetails(snapshot, messages);
  await loadProjectCredentialBindings(projectId);
  await loadDeployPreflight(projectId);
}

function renderDeployPreflight(projectId, preflight) {
  state.deployPreflightByProject[projectId] = preflight;

  const missingCount = Array.isArray(preflight.missing_credentials)
    ? preflight.missing_credentials.length
    : 0;

  const actionHint = preflight.can_activate
    ? "Ready to deploy and activate."
    : !preflight.deployable
      ? "Workflow is not deployable. Regenerate/fix workflow validation first."
      : missingCount > 0
      ? "Please enter missing credentials, save them, then deploy."
      : "Deployment blocked. Check source error and workflow status.";

  el.deployCheckSummary.innerHTML = `
    <div>workflow_status: ${escapeHtml(preflight.workflow_status || "-")}</div>
    <div>deployable: ${preflight.deployable ? "yes" : "no"}</div>
    <div>credentials_source_ok: ${preflight.credentials_source_ok ? "yes" : "no"}</div>
    <div>missing_credentials: ${missingCount}</div>
    <div>can_activate: ${preflight.can_activate ? "yes" : "no"}</div>
    <div>n8n_workflow_id: ${escapeHtml(preflight.n8n_workflow_id || "-")}</div>
    <div>source_error: ${escapeHtml(preflight.credentials_source_error || "-")}</div>
    <div>action: ${escapeHtml(actionHint)}</div>
  `;

  const requirements = Array.isArray(preflight.requirements) ? preflight.requirements : [];
  if (requirements.length === 0) {
    el.deployCredentialsForm.innerHTML = `<div class="details-box">No credentials required for this workflow.</div>`;
    return;
  }

  const currentBindings = getProjectCredentialBindings(projectId);

  el.deployCredentialsForm.innerHTML = requirements
    .map((requirement) => {
      const credentialType = String(requirement.credential_type || "");
      const nodes = Array.isArray(requirement.nodes) ? requirement.nodes : [];
      const options = Array.isArray(requirement.available_credentials)
        ? requirement.available_credentials
        : [];

      const existingBinding =
        currentBindings[credentialType] ||
        requirement.resolved_binding ||
        requirement.provided_binding ||
        null;

      const selectedId = existingBinding?.id || "";
      const selectedName = existingBinding?.name || "";

      return `
        <div class="credential-row">
          <div class="credential-head">
            <div class="credential-type">${escapeHtml(credentialType)}</div>
            <div class="row">
              <button class="btn btn-ghost use-credential-type-btn" data-credential-type="${escapeHtml(credentialType)}" type="button">Use Type</button>
              ${requirement.resolved ? '<span class="badge badge-ok">bound</span>' : '<span class="badge badge-bad">missing</span>'}
            </div>
          </div>
          <div class="credential-meta">nodes: ${escapeHtml(nodes.join(", "))}</div>
          <div class="row">
            <select class="input credential-select" data-credential-type="${escapeHtml(credentialType)}">
              <option value="">Select from n8n credentials</option>
              ${options
                .map((option) => {
                  const isSelected = selectedId && selectedId === option.id;
                  return `<option value="${escapeHtml(option.id)}" data-name="${escapeHtml(option.name)}" ${isSelected ? "selected" : ""}>${escapeHtml(option.name)} (${escapeHtml(option.id)})</option>`;
                })
                .join("")}
            </select>
          </div>
          <div class="credential-meta">
            ${options.length > 0 ? `${options.length} credential(s) available in n8n` : "No credentials found in n8n for this type."}
          </div>
          <div class="row two-col">
            <input
              class="input credential-id-input"
              data-credential-type="${escapeHtml(credentialType)}"
              placeholder="Credential ID"
              value="${escapeHtml(selectedId)}"
            />
            <input
              class="input credential-name-input"
              data-credential-type="${escapeHtml(credentialType)}"
              placeholder="Credential Name (optional)"
              value="${escapeHtml(selectedName)}"
            />
          </div>
        </div>
      `;
    })
    .join("");

  Array.from(document.querySelectorAll(".credential-select[data-credential-type]")).forEach((select) => {
    select.addEventListener("change", (event) => {
      const target = event.target;
      const credentialType = target.getAttribute("data-credential-type");
      if (!credentialType) return;
      const selectedOption = target.options[target.selectedIndex];
      const id = target.value || "";
      const name = selectedOption?.getAttribute("data-name") || "";
      const idInput = document.querySelector(`.credential-id-input[data-credential-type="${credentialType}"]`);
      const nameInput = document.querySelector(`.credential-name-input[data-credential-type="${credentialType}"]`);
      if (idInput) idInput.value = id;
      if (nameInput) nameInput.value = name;
      setProjectCredentialBinding(projectId, credentialType, id || name ? { id, name } : null);
    });
  });

  Array.from(document.querySelectorAll(".credential-id-input[data-credential-type]")).forEach((input) => {
    input.addEventListener("input", (event) => {
      const target = event.target;
      const credentialType = target.getAttribute("data-credential-type");
      if (!credentialType) return;
      const nameInput = document.querySelector(`.credential-name-input[data-credential-type="${credentialType}"]`);
      const id = target.value.trim();
      const name = nameInput ? nameInput.value.trim() : "";
      setProjectCredentialBinding(projectId, credentialType, id || name ? { id, name } : null);
    });
  });

  Array.from(document.querySelectorAll(".credential-name-input[data-credential-type]")).forEach((input) => {
    input.addEventListener("input", (event) => {
      const target = event.target;
      const credentialType = target.getAttribute("data-credential-type");
      if (!credentialType) return;
      const idInput = document.querySelector(`.credential-id-input[data-credential-type="${credentialType}"]`);
      const id = idInput ? idInput.value.trim() : "";
      const name = target.value.trim();
      setProjectCredentialBinding(projectId, credentialType, id || name ? { id, name } : null);
    });
  });

  Array.from(document.querySelectorAll(".use-credential-type-btn[data-credential-type]")).forEach((btn) => {
    btn.addEventListener("click", () => {
      const credentialType = btn.getAttribute("data-credential-type");
      if (!credentialType) return;
      applyQuickCredentialType(credentialType);
      setToast(`Credential type selected: ${credentialType}`);
    });
  });
}

async function loadDeployPreflight(projectId) {
  const credentialBindings = currentCredentialBindingsPayload(projectId);
  const payload = await apiFetch(`/projects/${projectId}/deploy-check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential_bindings: credentialBindings })
  });

  renderDeployPreflight(projectId, payload);
  return payload;
}

async function deployProject(projectId, activate, credentialBindings = {}) {
  const result = await apiFetch(`/projects/${projectId}/deploy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      activate,
      credential_bindings: credentialBindings
    })
  });
  return result;
}

async function handleChatSubmit(event) {
  event.preventDefault();
  const message = (el.chatInput.value || "").trim();
  if (!message) {
    setToast("Please type a message first.", "error");
    return;
  }

  el.generateBtn.disabled = true;
  try {
    const payload = await apiFetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    state.builderPayload = payload;
    state.latestGeneratedProjectId = payload.project_id;
    el.deployFromBuilderBtn.disabled = false;
    el.builderProjectId.textContent = `Project: ${payload.project_id}`;
    el.builderValidation.innerHTML = `Validation: ${validationBadge(payload.validation?.valid)}`;
    el.builderOutput.textContent = JSON.stringify(payload, null, 2);
    el.chatInput.value = "";

    await loadProjects();
    if (payload.project_id) {
      setActiveView("projects");
      await selectProject(payload.project_id);
    }
    setToast("Project created successfully.");
  } catch (error) {
    setToast(error.message, "error");
  } finally {
    el.generateBtn.disabled = false;
  }
}

async function handleDeployFromBuilder() {
  const projectId = state.latestGeneratedProjectId;
  if (!projectId) {
    setToast("No generated project to deploy.", "error");
    return;
  }

  try {
    const preflight = await loadDeployPreflight(projectId);
    if (!preflight.can_activate) {
      setToast("Fill required credentials first, then deploy.", "error");
      return;
    }
    const result = await deployProject(projectId, true, currentCredentialBindingsPayload(projectId));
    setToast(`Deployed to n8n (${result.n8n_workflow_id}).`);
    await loadProjects();
  } catch (error) {
    setToast(error.message, "error");
  }
}

async function handleDeploySelectedProject() {
  if (!state.selectedProjectId) {
    setToast("Select a project first.", "error");
    return;
  }

  el.deployProjectBtn.disabled = true;
  try {
    const activate = Boolean(el.deployActivateInput.checked);
    const preflight = await loadDeployPreflight(state.selectedProjectId);
    if (activate && !preflight.can_activate) {
      setToast("Activation blocked: missing credentials. Fill bindings first.", "error");
      return;
    }

    const result = await deployProject(
      state.selectedProjectId,
      activate,
      currentCredentialBindingsPayload(state.selectedProjectId)
    );
    setToast(`Deploy success (${result.n8n_workflow_id}).`);
    await loadProjects();
    await selectProject(state.selectedProjectId);
  } catch (error) {
    setToast(error.message, "error");
  } finally {
    el.deployProjectBtn.disabled = false;
  }
}

async function handleLoadCredentialSchema() {
  const credentialType = normalizeCredentialType(el.quickCredentialTypeInput.value);
  if (!credentialType) {
    setToast("Enter credential type first.", "error");
    return;
  }

  el.loadCredentialSchemaBtn.disabled = true;
  try {
    const schema = await fetchCredentialSchema(credentialType);
    const template = buildDataTemplateFromCredentialSchema(schema);
    el.quickCredentialDataInput.value = JSON.stringify(template, null, 2);
    el.credentialSchemaOutput.textContent = JSON.stringify(schema, null, 2);
    if (!el.quickCredentialNameInput.value.trim()) {
      el.quickCredentialNameInput.value = `${credentialType}-credential`;
    }
    setToast("Credential schema loaded.");
  } catch (error) {
    setToast(error.message, "error");
  } finally {
    el.loadCredentialSchemaBtn.disabled = false;
  }
}

async function handleCreateCredential() {
  if (!state.selectedProjectId) {
    setToast("Select a project first.", "error");
    return;
  }

  const credentialType = normalizeCredentialType(el.quickCredentialTypeInput.value);
  const credentialName = String(el.quickCredentialNameInput.value || "").trim();
  if (!credentialType || !credentialName) {
    setToast("Credential type and name are required.", "error");
    return;
  }

  let data;
  try {
    data = quickCredentialDataPayload();
  } catch {
    setToast("Credential data JSON is invalid.", "error");
    return;
  }

  el.createCredentialBtn.disabled = true;
  try {
    const created = await createN8nCredentialFromUi({
      type: credentialType,
      name: credentialName,
      data
    });

    setProjectCredentialBinding(state.selectedProjectId, credentialType, {
      id: created.id,
      name: created.name || credentialName
    });
    await saveProjectCredentialBindings(state.selectedProjectId);
    await loadDeployPreflight(state.selectedProjectId);
    setToast(`Credential created (${created.id}).`);
  } catch (error) {
    setToast(error.message, "error");
  } finally {
    el.createCredentialBtn.disabled = false;
  }
}

async function loadWorkflowStatus() {
  const id = (el.workflowIdInput.value || "").trim();
  if (!id) {
    setToast("Enter workflow ID.", "error");
    return;
  }

  try {
    const payload = await apiFetch(`/workflows/${id}/status`);
    el.workflowStatusJson.textContent = JSON.stringify(payload, null, 2);
    el.workflowStatusSummary.innerHTML = `
      <div>is_working: ${payload.health?.is_working ? "yes" : "no"}</div>
      <div>last_run_status: ${escapeHtml(payload.health?.last_run_status || "-")}</div>
      <div>total_runs: ${Number(payload.metrics?.total_runs || 0)}</div>
      <div>failed_runs: ${Number(payload.metrics?.failed_runs || 0)}</div>
      <div>success_rate: ${Number(payload.metrics?.success_rate || 0)}%</div>
      <div>ai_solution: ${escapeHtml(payload.ai_suggestion?.solution || "-")}</div>
    `;
  } catch (error) {
    setToast(error.message, "error");
  }
}

function renderAnalyticsCards(overview) {
  const metrics = [
    ["Total Projects", overview.total_projects],
    ["Total Workflows", overview.total_workflows],
    ["Total Runs", overview.total_runs],
    ["Failed Runs", overview.failed_runs],
    ["Success Rate %", overview.success_rate],
    ["Avg Duration ms", overview.average_duration_ms],
    ["Unresolved Alerts", overview.unresolved_alerts],
    ["Healthy Workflows", overview.healthy_workflows]
  ];

  el.analyticsCards.innerHTML = metrics
    .map(
      ([title, value]) => `
        <div class="metric-card">
          <div class="metric-title">${escapeHtml(title)}</div>
          <div class="metric-value">${escapeHtml(value)}</div>
        </div>
      `
    )
    .join("");
}

function renderAnalyticsTable(rows) {
  if (!rows || rows.length === 0) {
    el.analyticsTableBody.innerHTML = `<tr><td colspan="6">No data</td></tr>`;
    return;
  }

  el.analyticsTableBody.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.project_name)}</td>
          <td>${healthPill(Boolean(row.is_working), row.last_run_status)}</td>
          <td>${Number(row.total_runs)}</td>
          <td>${Number(row.failed_runs)}</td>
          <td>${Number(row.unresolved_alerts)}</td>
          <td>${escapeHtml(row.workflow_id)}</td>
        </tr>
      `
    )
    .join("");
}

async function loadAnalytics() {
  const payload = await apiFetch("/analytics");
  renderAnalyticsCards(payload.overview || {});
  renderAnalyticsTable(payload.workflows_health || []);
}

async function handleSendEvent(event) {
  event.preventDefault();
  let metadata = undefined;
  const metaRaw = (el.eventMetaInput.value || "").trim();
  if (metaRaw) {
    try {
      metadata = JSON.parse(metaRaw);
    } catch {
      setToast("metadata JSON is invalid.", "error");
      return;
    }
  }

  const durationRaw = (el.eventDurationInput.value || "").trim();
  const payload = {
    workflow_id: (el.eventWorkflowIdInput.value || "").trim() || undefined,
    n8n_workflow_id: (el.eventN8nWorkflowIdInput.value || "").trim() || undefined,
    run_id: (el.eventRunIdInput.value || "").trim() || undefined,
    node_name: (el.eventNodeNameInput.value || "").trim() || undefined,
    event_type: el.eventTypeInput.value,
    status: (el.eventStatusInput.value || "").trim() || undefined,
    duration_ms: durationRaw ? Number(durationRaw) : undefined,
    error_message: (el.eventErrorInput.value || "").trim() || undefined,
    metadata
  };

  try {
    const response = await apiFetch("/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    el.eventResponseJson.textContent = JSON.stringify(response, null, 2);
    setToast("Event ingested.");
    await loadAnalytics();
  } catch (error) {
    setToast(error.message, "error");
  }
}

async function copyBuilderJson() {
  const text = el.builderOutput.textContent || "";
  try {
    await navigator.clipboard.writeText(text);
    setToast("Copied JSON.");
  } catch {
    setToast("Copy failed.", "error");
  }
}

async function refreshCurrentView() {
  await refreshHealth();
  const activeView = el.navButtons.find((btn) => btn.classList.contains("active"))?.dataset.view;

  if (activeView === "projects") {
    await loadProjects();
    if (state.selectedProjectId) {
      await selectProject(state.selectedProjectId);
    }
    return;
  }

  if (activeView === "analytics") {
    await loadAnalytics();
    return;
  }

  if (activeView === "workflow") {
    if ((el.workflowIdInput.value || "").trim()) {
      await loadWorkflowStatus();
    }
    return;
  }

  if (activeView === "builder") {
    await loadProjects();
  }
}

function bindEvents() {
  el.navButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const view = btn.dataset.view;
      if (!view || !el.views[view]) return;

      setActiveView(view);
      if (view === "projects") {
        await loadProjects().catch((error) => setToast(error.message, "error"));
      }
      if (view === "analytics") {
        await loadAnalytics().catch((error) => setToast(error.message, "error"));
      }
    });
  });

  el.chatForm.addEventListener("submit", handleChatSubmit);
  el.copyBuilderJsonBtn.addEventListener("click", copyBuilderJson);
  el.deployFromBuilderBtn.addEventListener("click", handleDeployFromBuilder);

  el.projectSearchInput.addEventListener("input", renderProjects);
  el.refreshProjectsBtn.addEventListener("click", () =>
    loadProjects().catch((error) => setToast(error.message, "error"))
  );
  el.checkDeployBtn.addEventListener("click", async () => {
    if (!state.selectedProjectId) {
      setToast("Select a project first.", "error");
      return;
    }
    try {
      await loadDeployPreflight(state.selectedProjectId);
      setToast("Deploy check updated.");
    } catch (error) {
      setToast(error.message, "error");
    }
  });
  el.saveCredentialsBtn.addEventListener("click", async () => {
    if (!state.selectedProjectId) {
      setToast("Select a project first.", "error");
      return;
    }

    el.saveCredentialsBtn.disabled = true;
    try {
      await saveProjectCredentialBindings(state.selectedProjectId);
      await loadDeployPreflight(state.selectedProjectId);
      setToast("Credentials saved for this project.");
    } catch (error) {
      setToast(error.message, "error");
    } finally {
      el.saveCredentialsBtn.disabled = false;
    }
  });
  el.loadCredentialSchemaBtn.addEventListener("click", handleLoadCredentialSchema);
  el.createCredentialBtn.addEventListener("click", handleCreateCredential);
  el.deployProjectBtn.addEventListener("click", handleDeploySelectedProject);

  el.loadWorkflowStatusBtn.addEventListener("click", loadWorkflowStatus);
  el.refreshAnalyticsBtn.addEventListener("click", () =>
    loadAnalytics().catch((error) => setToast(error.message, "error"))
  );
  el.eventForm.addEventListener("submit", handleSendEvent);

  el.globalRefreshBtn.addEventListener("click", () =>
    refreshCurrentView().catch((error) => setToast(error.message, "error"))
  );
}

async function boot() {
  bindEvents();
  await refreshHealth();
  await loadProjects();
  await loadAnalytics();
}

boot().catch((error) => setToast(error.message, "error"));
