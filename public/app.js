const state = {
  health: {
    api: false,
    n8n: false,
    monitoring: false
  },
  projects: [],
  report: null,
  analytics: null,
  selectedProjectId: null,
  selectedProjectSnapshot: null,
  preflightByProject: {},
  credentialBindingsByProject: {},
  healthByProject: {},
  executionsByProject: {},
  activityByProject: {},
  executionDetailByProject: {},
  chatStream: [],
  builderTimelineState: "workflow_generated",
  deletingProjectId: null
};

const DEBUG_UI = (() => {
  const host = String(window.location.hostname || "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
})();

const el = {
  apiStatusPill: document.getElementById("apiStatusPill"),
  n8nStatusPill: document.getElementById("n8nStatusPill"),
  monitorStatusPill: document.getElementById("monitorStatusPill"),
  refreshAllBtn: document.getElementById("refreshAllBtn"),
  toggleSidebarBtn: document.getElementById("toggleSidebarBtn"),
  projectsSidebar: document.getElementById("projectsSidebar"),
  mainCenter: document.getElementById("mainCenter"),
  detailPanel: document.getElementById("detailPanel"),

  projectSearchInput: document.getElementById("projectSearchInput"),
  newReportBtn: document.getElementById("newReportBtn"),
  projectStatsCards: document.getElementById("projectStatsCards"),
  projectsList: document.getElementById("projectsList"),

  chatForm: document.getElementById("chatForm"),
  chatInput: document.getElementById("chatInput"),
  generateBtn: document.getElementById("generateBtn"),
  retryFixBtn: document.getElementById("retryFixBtn"),
  chatStream: document.getElementById("chatStream"),
  builderTimeline: document.getElementById("builderTimeline"),

  reportSearchInput: document.getElementById("reportSearchInput"),
  reportFilterSelect: document.getElementById("reportFilterSelect"),
  refreshReportBtn: document.getElementById("refreshReportBtn"),
  reportTotalsCards: document.getElementById("reportTotalsCards"),
  reportTableBody: document.getElementById("reportTableBody"),

  detailProjectTitle: document.getElementById("detailProjectTitle"),
  detailLifecycleBadge: document.getElementById("detailLifecycleBadge"),
  tabButtons: Array.from(document.querySelectorAll(".tab-btn")),
  tabPanels: Array.from(document.querySelectorAll(".tab-panel")),

  overviewCards: document.getElementById("overviewCards"),
  deployInactiveBtn: document.getElementById("deployInactiveBtn"),
  activateBtn: document.getElementById("activateBtn"),
  redeployBtn: document.getElementById("redeployBtn"),
  deactivateBtn: document.getElementById("deactivateBtn"),
  openN8nWorkflowBtn: document.getElementById("openN8nWorkflowBtn"),
  refreshHealthBtn: document.getElementById("refreshHealthBtn"),
  workflowJsonBox: document.getElementById("workflowJsonBox"),

  credentialsSummary: document.getElementById("credentialsSummary"),
  credentialsCards: document.getElementById("credentialsCards"),
  checkRequirementsBtn: document.getElementById("checkRequirementsBtn"),
  saveBindingsBtn: document.getElementById("saveBindingsBtn"),
  openN8nCredentialsBtn: document.getElementById("openN8nCredentialsBtn"),

  monitoringSummary: document.getElementById("monitoringSummary"),
  loadExecutionsBtn: document.getElementById("loadExecutionsBtn"),
  executionsTableBody: document.getElementById("executionsTableBody"),
  executionDetailBox: document.getElementById("executionDetailBox"),

  refreshActivityBtn: document.getElementById("refreshActivityBtn"),
  activityFeed: document.getElementById("activityFeed"),

  deleteAutomationBtn: document.getElementById("deleteAutomationBtn"),
  deleteWarningsBox: document.getElementById("deleteWarningsBox"),
  deleteModal: document.getElementById("deleteModal"),
  cancelDeleteBtn: document.getElementById("cancelDeleteBtn"),
  confirmDeleteBtn: document.getElementById("confirmDeleteBtn"),

  mobileNavButtons: Array.from(document.querySelectorAll(".mobile-nav button")),
  toast: document.getElementById("toast")
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

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function isFailureStatus(status) {
  const normalized = String(status || "").toLowerCase();
  return ["failing", "failure", "failed", "error", "crashed"].includes(normalized);
}

function lifecycleLabel(value) {
  const normalized = String(value || "unknown").toLowerCase();
  const map = {
    draft: "draft",
    validated: "validated",
    rejected: "rejected",
    deployed_inactive: "deployed inactive",
    deployed_active: "active",
    failed: "failed",
    missing_in_n8n: "missing in n8n",
    n8n_check_failed: "n8n check failed",
    no_workflow: "no workflow"
  };
  return map[normalized] || normalized;
}

function healthLabel(value) {
  const normalized = String(value || "unknown").toLowerCase();
  return ["healthy", "warning", "failing", "unknown", "inactive"].includes(normalized)
    ? normalized
    : "unknown";
}

function badgeClassForLifecycle(lifecycle) {
  const normalized = String(lifecycle || "").toLowerCase();
  if (normalized === "deployed_active") return "status-ok";
  if (normalized === "validated" || normalized === "deployed_inactive") return "status-warn";
  if (normalized === "rejected" || normalized === "failed" || normalized === "missing_in_n8n") {
    return "status-bad";
  }
  return "status-neutral";
}

function badgeClassForHealth(status) {
  const normalized = healthLabel(status);
  if (normalized === "healthy") return "status-ok";
  if (normalized === "warning" || normalized === "inactive") return "status-warn";
  if (normalized === "failing") return "status-bad";
  return "status-neutral";
}

function setToast(message, tone = "neutral") {
  if (!el.toast) return;
  el.toast.textContent = message;
  el.toast.className = "toast show";
  if (tone === "error") {
    el.toast.style.borderColor = "rgba(255, 92, 122, 0.45)";
    el.toast.style.color = "#ffd6df";
  } else if (tone === "success") {
    el.toast.style.borderColor = "rgba(92, 255, 177, 0.45)";
    el.toast.style.color = "#c9ffe6";
  } else {
    el.toast.style.borderColor = "rgba(255,255,255,0.16)";
    el.toast.style.color = "#e5ecf6";
  }
  clearTimeout(setToast.timer);
  setToast.timer = setTimeout(() => {
    el.toast.className = "toast";
  }, 3600);
}

async function apiFetch(path, options = {}) {
  const response = await fetch(path, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = payload?.error?.code ? `[${payload.error.code}] ` : "";
    const message = payload?.error?.message || `Request failed (${response.status})`;
    throw new Error(`${code}${message}`);
  }
  return payload;
}

function getReportItems() {
  return Array.isArray(state.report?.items) ? state.report.items : [];
}

function getReportItem(projectId) {
  return getReportItems().find((item) => item.project_id === projectId) || null;
}

function uiDebug(step, meta = {}) {
  if (!DEBUG_UI) return;
  const stamp = new Date().toISOString();
  console.info(`[ops-radar-ui] ${stamp} ${step}`, meta);
}

function debugWorkflowLinkContext(stage) {
  if (!DEBUG_UI) return;

  const projectId = state.selectedProjectId;
  const snapshot = projectId ? getProjectSnapshot(projectId) : null;
  const reportItem = projectId ? getReportItem(projectId) : null;

  console.info("[ops-radar-debug] workflow-link", {
    stage,
    project_id: projectId || null,
    workflow_id: snapshot?.workflow?.id || null,
    n8n_workflow_id: snapshot?.workflow?.n8n_workflow_id || null,
    n8n_workflow_url: reportItem?.n8n_workflow_url || null
  });
}

function getProjectSnapshot(projectId) {
  return state.selectedProjectId === projectId ? state.selectedProjectSnapshot : null;
}

function getPreflight(projectId) {
  return state.preflightByProject[projectId] || null;
}

function getBindings(projectId) {
  if (!state.credentialBindingsByProject[projectId]) {
    state.credentialBindingsByProject[projectId] = [];
  }
  return state.credentialBindingsByProject[projectId];
}

function bindingKey(binding) {
  return `${binding.node_id || ""}|${binding.credential_type}`;
}

function findBindingForRequirement(projectId, requirement) {
  const list = getBindings(projectId);
  return (
    list.find(
      (binding) =>
        String(binding.node_id || "") === String(requirement.node_id || "") &&
        String(binding.credential_type || "") === String(requirement.credential_type || "")
    ) || null
  );
}

function upsertBinding(projectId, nextBinding) {
  const list = getBindings(projectId);
  const key = bindingKey(nextBinding);
  const existingIndex = list.findIndex((item) => bindingKey(item) === key);
  if (existingIndex === -1) {
    list.push(nextBinding);
  } else {
    list[existingIndex] = nextBinding;
  }
}

function cleanupBindings(projectId) {
  const list = getBindings(projectId).filter((binding) => {
    const id = String(binding.id || "").trim();
    const name = String(binding.name || "").trim();
    return id.length > 0 || name.length > 0;
  });
  state.credentialBindingsByProject[projectId] = list;
  return list;
}

function updateStatusPill(node, label, className) {
  node.textContent = label;
  node.className = `status-pill ${className}`;
}

async function refreshSystemHealth() {
  try {
    const health = await apiFetch("/health");
    state.health.api = true;
    state.health.monitoring = Boolean(health.monitoring_enabled);
    updateStatusPill(el.apiStatusPill, "API healthy", "status-ok");
    updateStatusPill(
      el.monitorStatusPill,
      state.health.monitoring ? "monitoring active" : "monitoring off",
      state.health.monitoring ? "status-ok" : "status-warn"
    );
  } catch {
    state.health.api = false;
    updateStatusPill(el.apiStatusPill, "API down", "status-bad");
    updateStatusPill(el.monitorStatusPill, "monitoring unknown", "status-neutral");
  }

  try {
    await apiFetch("/n8n/credentials");
    state.health.n8n = true;
    updateStatusPill(el.n8nStatusPill, "n8n connected", "status-ok");
  } catch {
    state.health.n8n = false;
    updateStatusPill(el.n8nStatusPill, "n8n unavailable", "status-bad");
  }
}

async function loadProjects() {
  uiDebug("loadProjects:start");
  const payload = await apiFetch("/projects?limit=200&offset=0&verify_n8n=1");
  state.projects = Array.isArray(payload.items) ? payload.items : [];
  uiDebug("loadProjects:done", { count: state.projects.length });
}

async function loadReport() {
  uiDebug("loadReport:start");
  state.report = await apiFetch("/projects/report?limit=500&offset=0&verify_n8n=1");
  uiDebug("loadReport:done", { count: Array.isArray(state.report?.items) ? state.report.items.length : 0 });
}

async function loadAnalytics() {
  try {
    state.analytics = await apiFetch("/analytics");
  } catch {
    state.analytics = null;
  }
}

function renderBuilderTimeline() {
  const steps = Array.from(el.builderTimeline?.querySelectorAll("span") || []);
  steps.forEach((step) => step.classList.remove("active"));

  const stateValue = String(state.builderTimelineState || "");
  const isRejected = stateValue === "rejected";
  const order = ["workflow_generated", "validated", "deployed_inactive", "deployed_active"];
  const targetIndex = order.indexOf(stateValue);

  if (isRejected) {
    steps.forEach((step) => {
      if (step.dataset.step === "workflow_generated" || step.dataset.step === "rejected") {
        step.classList.add("active");
      }
    });
    return;
  }

  steps.forEach((step) => {
    const index = order.indexOf(step.dataset.step || "");
    if (index !== -1 && targetIndex !== -1 && index <= targetIndex) {
      step.classList.add("active");
    }
  });
}

function pushChatItem(kind, payload) {
  state.chatStream.push({
    kind,
    payload,
    created_at: new Date().toISOString()
  });
  if (state.chatStream.length > 30) {
    state.chatStream = state.chatStream.slice(-30);
  }
}

function renderChatStream() {
  if (!el.chatStream) return;
  if (state.chatStream.length === 0) {
    el.chatStream.innerHTML = `<div class="card-message"><h5>Ready</h5><p>ابدأ بطلب automation عام وسيقوم النظام ببناء workflow قابل للنشر على n8n.</p></div>`;
    return;
  }

  el.chatStream.innerHTML = state.chatStream
    .map((entry) => {
      if (entry.kind === "user") {
        return `<div class="bubble user">${escapeHtml(entry.payload.message)}</div>`;
      }
      if (entry.kind === "ai-summary") {
        return `
          <div class="bubble ai">
            <div class="card-message">
              <h5>Workflow Summary</h5>
              <p>${escapeHtml(entry.payload.summary)}</p>
            </div>
          </div>
        `;
      }
      if (entry.kind === "validation") {
        return `
          <div class="bubble ai">
            <div class="card-message">
              <h5>Validation</h5>
              <p>${escapeHtml(entry.payload.message)}</p>
            </div>
          </div>
        `;
      }
      if (entry.kind === "next-action") {
        return `
          <div class="bubble ai">
            <div class="card-message">
              <h5>Next Action</h5>
              <p>${escapeHtml(entry.payload.message)}</p>
            </div>
          </div>
        `;
      }
      if (entry.kind === "loading") {
        return `<div class="bubble ai">Generating workflow...</div>`;
      }
      return "";
    })
    .join("");
  el.chatStream.scrollTop = el.chatStream.scrollHeight;
}

function buildSidebarStats() {
  const report = state.report;
  const totals = report?.totals || {};
  const overview = state.analytics?.overview || {};
  const cards = [
    ["Total", toNumber(totals.projects)],
    ["Active", toNumber(totals.deployed_active)],
    ["Inactive", toNumber(totals.deployed_inactive)],
    ["Failing", toNumber(totals.failing)],
    ["Warning", toNumber(totals.warnings)],
    ["Success Exec", toNumber(overview.total_runs) - toNumber(overview.failed_runs)],
    ["Failed Exec", toNumber(overview.failed_runs)],
    ["Open Alerts", toNumber(overview.unresolved_alerts)],
    ["Last Check", formatDate(report?.generated_at)]
  ];

  return cards
    .map(
      ([label, value]) => `
        <div class="stat">
          <div class="label">${escapeHtml(label)}</div>
          <div class="value">${escapeHtml(value)}</div>
        </div>
      `
    )
    .join("");
}

function renderSidebar() {
  el.projectStatsCards.innerHTML = buildSidebarStats();
  const search = String(el.projectSearchInput.value || "").trim().toLowerCase();
  const reportMap = new Map(getReportItems().map((item) => [item.project_id, item]));

  const rows = state.projects.filter((item) => {
    const name = String(item.project?.name || "").toLowerCase();
    return !search || name.includes(search);
  });

  if (rows.length === 0) {
    el.projectsList.innerHTML = `<div class="summary-strip">No projects found.</div>`;
    return;
  }

  el.projectsList.innerHTML = rows
    .map((row) => {
      const project = row.project || {};
      const workflow = row.workflow || {};
      const lifecycle = reportMap.get(project.id)?.lifecycle_state || row.lifecycle_state || "unknown";
      const active = state.selectedProjectId === project.id;
      return `
        <article class="project-card ${active ? "active" : ""}" data-project-id="${escapeHtml(project.id)}">
          <h4>${escapeHtml(project.name || "Untitled Project")}</h4>
          <div class="project-meta">
            lifecycle: ${escapeHtml(lifecycleLabel(lifecycle))}
          </div>
          <div class="project-meta">
            workflow: ${escapeHtml(workflow.id || "-")}
          </div>
        </article>
      `;
    })
    .join("");
}

function filterReportItems() {
  const search = String(el.reportSearchInput.value || "").trim().toLowerCase();
  const filter = String(el.reportFilterSelect.value || "all");
  return getReportItems().filter((item) => {
    const nameMatches = String(item.project_name || "").toLowerCase().includes(search);
    if (!nameMatches) return false;

    if (filter === "all") return true;
    if (filter === "failing") return item.health_status === "failing";
    if (filter === "warning") return item.health_status === "warning";
    return String(item.lifecycle_state || "") === filter;
  });
}

function renderReport() {
  const totals = state.report?.totals || {};
  const cards = [
    ["Total Projects", toNumber(totals.projects)],
    ["Validated", toNumber(totals.validated)],
    ["Rejected", toNumber(totals.rejected)],
    ["Deployed Active", toNumber(totals.deployed_active)],
    ["Deployed Inactive", toNumber(totals.deployed_inactive)],
    ["Failing", toNumber(totals.failing)],
    ["Warning", toNumber(totals.warnings)],
    ["Generated At", formatDate(state.report?.generated_at)]
  ];
  el.reportTotalsCards.innerHTML = cards
    .map(
      ([label, value]) => `
        <div class="stat-card">
          <div class="label">${escapeHtml(label)}</div>
          <div class="value">${escapeHtml(value)}</div>
        </div>
      `
    )
    .join("");

  const rows = filterReportItems();
  if (rows.length === 0) {
    el.reportTableBody.innerHTML = `<tr><td colspan="7">No items.</td></tr>`;
    return;
  }

  el.reportTableBody.innerHTML = rows
    .map((item) => {
      const lifecycle = lifecycleLabel(item.lifecycle_state);
      const health = healthLabel(item.health_status);
      return `
        <tr>
          <td>${escapeHtml(item.project_name)}</td>
          <td><span class="status-pill ${badgeClassForLifecycle(item.lifecycle_state)}">${escapeHtml(lifecycle)}</span></td>
          <td><span class="status-pill ${badgeClassForHealth(item.health_status)}">${escapeHtml(health)}</span></td>
          <td>${toNumber(item.missing_credentials_count)} / ${toNumber(item.required_credentials_count)}</td>
          <td>${item.n8n_exists === null ? "-" : item.n8n_exists ? "exists" : "missing"}</td>
          <td>${escapeHtml(item.recommended_action || "-")}</td>
          <td><button class="btn btn-ghost btn-sm open-project-btn" data-project-id="${escapeHtml(item.project_id)}">Open</button></td>
        </tr>
      `;
    })
    .join("");
}

function renderOverview() {
  const projectId = state.selectedProjectId;
  if (!projectId) {
    el.detailProjectTitle.textContent = "Project Details";
    el.detailLifecycleBadge.className = "status-pill status-neutral";
    el.detailLifecycleBadge.textContent = "-";
    el.overviewCards.innerHTML = `<div class="summary-strip">Select a project.</div>`;
    el.workflowJsonBox.textContent = "Select a project.";
    return;
  }

  const snapshot = state.selectedProjectSnapshot;
  const reportItem = getReportItem(projectId);
  const preflight = getPreflight(projectId);
  const health = state.healthByProject[projectId] || null;

  const lifecycleState = reportItem?.lifecycle_state || snapshot?.workflow?.status || "unknown";
  debugWorkflowLinkContext("before_render_overview");
  el.detailProjectTitle.textContent = snapshot?.project?.name || "Project";
  el.detailLifecycleBadge.className = `status-pill ${badgeClassForLifecycle(lifecycleState)}`;
  el.detailLifecycleBadge.textContent = lifecycleLabel(lifecycleState);

  const cards = [
    ["Workflow Status", snapshot?.workflow?.status || "-"],
    ["n8n Workflow ID", snapshot?.workflow?.n8n_workflow_id || "-"],
    ["n8n Exists", reportItem?.n8n_exists === null ? "-" : reportItem?.n8n_exists ? "yes" : "no"],
    ["n8n Active", reportItem?.n8n_active === null ? "-" : reportItem?.n8n_active ? "yes" : "no"],
    ["Can Deploy", reportItem?.can_deploy_inactive ? "yes" : "no"],
    ["Can Activate", reportItem?.can_activate ? "yes" : "no"],
    ["Can Redeploy", reportItem?.can_redeploy ? "yes" : "no"],
    ["Health", healthLabel(reportItem?.health_status || health?.health_status)],
    ["Last Run", formatDate(snapshot?.health?.last_run_at)],
    ["Last Success", formatDate(health?.last_success_at)],
    ["Last Failure", formatDate(health?.last_failure_at)],
    ["Missing Credentials", toNumber(reportItem?.missing_credentials_count)],
    ["Manual Credentials", toNumber(reportItem?.manual_credentials_count)],
    ["Recommended", reportItem?.recommended_action || "-"]
  ];

  el.overviewCards.innerHTML = cards
    .map(
      ([label, value]) => `
        <div class="stat-card">
          <div class="label">${escapeHtml(label)}</div>
          <div class="value">${escapeHtml(value)}</div>
        </div>
      `
    )
    .join("");

  el.workflowJsonBox.textContent = JSON.stringify(snapshot?.workflow?.json || {}, null, 2);
}

function setOverviewButtonsState() {
  const projectId = state.selectedProjectId;
  const reportItem = projectId ? getReportItem(projectId) : null;
  const lifecycle = String(reportItem?.lifecycle_state || "");
  const hasProject = Boolean(projectId);

  el.deployInactiveBtn.disabled = !hasProject || !reportItem?.can_deploy_inactive;
  el.activateBtn.disabled = !hasProject || !reportItem?.can_activate;
  el.redeployBtn.disabled = !hasProject || !reportItem?.can_redeploy;
  el.deactivateBtn.disabled = !(hasProject && lifecycle === "deployed_active");
  el.openN8nWorkflowBtn.disabled = !(hasProject && reportItem?.n8n_workflow_url);
  el.refreshHealthBtn.disabled = !hasProject;
  el.retryFixBtn.disabled = !(hasProject && lifecycle === "rejected");
  el.deleteAutomationBtn.disabled = !hasProject;
}

function renderCredentials() {
  const projectId = state.selectedProjectId;
  if (!projectId) {
    el.credentialsSummary.textContent = "Select a project.";
    el.credentialsCards.innerHTML = "";
    el.checkRequirementsBtn.disabled = true;
    el.saveBindingsBtn.disabled = true;
    el.openN8nCredentialsBtn.disabled = true;
    return;
  }

  const preflight = getPreflight(projectId);
  el.checkRequirementsBtn.disabled = false;
  el.saveBindingsBtn.disabled = false;
  el.openN8nCredentialsBtn.disabled = !(preflight && preflight.n8n_credentials_url);

  if (!preflight) {
    el.credentialsSummary.textContent = "No deploy-check data. Click Check Requirements.";
    el.credentialsCards.innerHTML = "";
    return;
  }

  const required = Array.isArray(preflight.requirements) ? preflight.requirements : [];
  const missingCount = Array.isArray(preflight.missing_credentials)
    ? preflight.missing_credentials.length
    : 0;
  el.credentialsSummary.textContent = `required: ${required.length} | missing: ${missingCount} | manual: ${preflight.manual_credentials?.length || 0}`;

  if (required.length === 0) {
    el.credentialsCards.innerHTML = `<div class="summary-strip">No credentials required by this workflow.</div>`;
    return;
  }

  el.credentialsCards.innerHTML = required
    .map((item) => {
      const binding = findBindingForRequirement(projectId, item) || {};
      const resolved = Boolean(item.resolved);
      return `
        <article class="credential-card">
          <h4>${escapeHtml(item.node_name)} · ${escapeHtml(item.credential_type)}</h4>
          <div class="meta">placeholder: ${escapeHtml(item.placeholder_credential_name)}</div>
          <div class="meta">status: <span class="status-pill ${resolved ? "status-ok" : "status-warn"}">${resolved ? "resolved" : "unresolved"}</span></div>
          <div class="meta">Create or complete this credential inside n8n, then bind it here.</div>
          <div class="bind-row">
            <input class="input bind-id-input" data-node-id="${escapeHtml(item.node_id)}" data-credential-type="${escapeHtml(item.credential_type)}" placeholder="credential id" value="${escapeHtml(binding.id || "")}" />
            <input class="input bind-name-input" data-node-id="${escapeHtml(item.node_id)}" data-credential-type="${escapeHtml(item.credential_type)}" placeholder="credential name" value="${escapeHtml(binding.name || "")}" />
          </div>
        </article>
      `;
    })
    .join("");

  bindCredentialInputs();
}

function bindCredentialInputs() {
  const projectId = state.selectedProjectId;
  if (!projectId) return;

  const handle = (target, field) => {
    const nodeId = target.dataset.nodeId || null;
    const credentialType = target.dataset.credentialType || "";
    const value = String(target.value || "").trim();
    const existing = getBindings(projectId).find(
      (item) => String(item.node_id || "") === String(nodeId || "") && item.credential_type === credentialType
    ) || {
      node_id: nodeId,
      node_name: null,
      credential_type: credentialType,
      id: "",
      name: ""
    };
    const next = { ...existing, [field]: value };
    upsertBinding(projectId, next);
  };

  document.querySelectorAll(".bind-id-input").forEach((input) => {
    input.addEventListener("input", (event) => handle(event.target, "id"));
  });
  document.querySelectorAll(".bind-name-input").forEach((input) => {
    input.addEventListener("input", (event) => handle(event.target, "name"));
  });
}

function renderMonitoring() {
  const projectId = state.selectedProjectId;
  if (!projectId) {
    el.monitoringSummary.textContent = "Select a project.";
    el.executionsTableBody.innerHTML = `<tr><td colspan="7">-</td></tr>`;
    el.executionDetailBox.textContent = "-";
    el.loadExecutionsBtn.disabled = true;
    return;
  }

  const health = state.healthByProject[projectId] || null;
  const executions = state.executionsByProject[projectId] || [];
  el.loadExecutionsBtn.disabled = false;

  if (!health) {
    el.monitoringSummary.textContent = "Health data not loaded yet.";
  } else {
    el.monitoringSummary.textContent =
      `health: ${healthLabel(health.health_status)} | last success: ${formatDate(health.last_success_at)} | last failure: ${formatDate(health.last_failure_at)}`;
  }

  if (!Array.isArray(executions) || executions.length === 0) {
    el.executionsTableBody.innerHTML = `<tr><td colspan="7">No executions.</td></tr>`;
    return;
  }

  el.executionsTableBody.innerHTML = executions
    .map((item) => `
      <tr>
        <td>${escapeHtml(formatDate(item.started_at || item.stopped_at))}</td>
        <td><span class="status-pill ${isFailureStatus(item.status) ? "status-bad" : "status-ok"}">${escapeHtml(item.status || "-")}</span></td>
        <td>${escapeHtml(item.duration_ms ?? "-")}</td>
        <td>${escapeHtml(item.mode || "-")}</td>
        <td>${escapeHtml(item.failed_node || "-")}</td>
        <td>${escapeHtml(item.error_type || "-")}</td>
        <td><button class="btn btn-ghost btn-sm execution-detail-btn" data-execution-id="${escapeHtml(item.id)}">Details</button></td>
      </tr>
    `)
    .join("");

  document.querySelectorAll(".execution-detail-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const details = await apiFetch(`/projects/${projectId}/executions/${encodeURIComponent(button.dataset.executionId)}`);
        state.executionDetailByProject[projectId] = details;
        el.executionDetailBox.textContent = JSON.stringify(details, null, 2);
      } catch (error) {
        setToast(error.message, "error");
      }
    });
  });
}

function renderActivity() {
  const projectId = state.selectedProjectId;
  if (!projectId) {
    el.activityFeed.innerHTML = `<div class="summary-strip">Select a project.</div>`;
    el.refreshActivityBtn.disabled = true;
    return;
  }

  el.refreshActivityBtn.disabled = false;
  const payload = state.activityByProject[projectId];
  const items = Array.isArray(payload?.items) ? payload.items : [];
  if (items.length === 0) {
    el.activityFeed.innerHTML = `<div class="summary-strip">No activity events.</div>`;
    return;
  }

  el.activityFeed.innerHTML = items
    .map((item) => {
      const severityClass =
        item.severity === "high" ? "status-bad" : item.severity === "medium" ? "status-warn" : "status-ok";
      return `
        <article class="activity-item">
          <div class="head">
            <span>${escapeHtml(formatDate(item.event_time))}</span>
            <span class="status-pill ${severityClass}">${escapeHtml(item.severity)}</span>
          </div>
          <div class="msg"><strong>${escapeHtml(item.event_type)}</strong> · ${escapeHtml(item.message || "-")}</div>
          <div class="meta">
            n8n: ${escapeHtml(item.n8n_workflow_id || "-")} |
            execution: ${escapeHtml(item.execution_id || "-")} |
            failed node: ${escapeHtml(item.failed_node || "-")}
          </div>
          <div class="meta">recommended: ${escapeHtml(item.recommended_action || "-")}</div>
        </article>
      `;
    })
    .join("");
}

function renderDeleteWarnings() {
  const projectId = state.selectedProjectId;
  if (!projectId) {
    el.deleteWarningsBox.textContent = "";
    return;
  }
  const warnings = state.deleteWarningsByProject?.[projectId] || [];
  if (warnings.length === 0) {
    el.deleteWarningsBox.textContent = "";
    return;
  }
  el.deleteWarningsBox.textContent = `Cleanup warnings: ${warnings
    .map((item) => `${item.operation}:${item.n8n_workflow_id}`)
    .join(", ")}`;
}

function renderAll() {
  renderBuilderTimeline();
  renderChatStream();
  renderSidebar();
  renderReport();
  renderOverview();
  renderCredentials();
  renderMonitoring();
  renderActivity();
  renderDeleteWarnings();
  setOverviewButtonsState();
}

async function loadProjectRelatedData(projectId) {
  uiDebug("loadProjectRelatedData:start", { project_id: projectId });
  const snapshot = await apiFetch(`/projects/${projectId}`);
  state.selectedProjectSnapshot = snapshot;
  uiDebug("loadProjectRelatedData:snapshot", {
    project_id: projectId,
    workflow_id: snapshot?.workflow?.id || null,
    workflow_status: snapshot?.workflow?.status || null,
    n8n_workflow_id: snapshot?.workflow?.n8n_workflow_id || null
  });

  const bindingsPayload = await apiFetch(`/projects/${projectId}/credential-bindings`);
  const bindings = Array.isArray(bindingsPayload.credential_bindings)
    ? bindingsPayload.credential_bindings
    : [];
  state.credentialBindingsByProject[projectId] = bindings;

  if (snapshot.workflow && snapshot.workflow.status !== "rejected") {
    try {
      state.preflightByProject[projectId] = await apiFetch(`/projects/${projectId}/deploy-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential_bindings: bindings })
      });
    } catch {
      state.preflightByProject[projectId] = null;
    }
  } else {
    state.preflightByProject[projectId] = null;
  }

  try {
    state.healthByProject[projectId] = await apiFetch(`/projects/${projectId}/health`);
  } catch {
    state.healthByProject[projectId] = null;
  }

  try {
    state.activityByProject[projectId] = await apiFetch(`/projects/${projectId}/events?limit=100`);
  } catch {
    state.activityByProject[projectId] = { items: [] };
  }
  uiDebug("loadProjectRelatedData:done", { project_id: projectId });
}

async function selectProject(projectId) {
  uiDebug("selectProject:start", { project_id: projectId });
  state.selectedProjectId = projectId;
  await loadProjectRelatedData(projectId);
  const reportItem = getReportItem(projectId);
  state.builderTimelineState = reportItem?.lifecycle_state || "workflow_generated";
  uiDebug("selectProject:done", {
    project_id: projectId,
    lifecycle_state: state.builderTimelineState,
    report_n8n_workflow_id: reportItem?.n8n_workflow_id || null,
    report_n8n_workflow_url: reportItem?.n8n_workflow_url || null
  });
  renderAll();
}

async function saveCredentialBindings() {
  const projectId = state.selectedProjectId;
  if (!projectId) return;
  const payload = cleanupBindings(projectId);
  await apiFetch(`/projects/${projectId}/credential-bindings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential_bindings: payload })
  });
}

async function loadPreflight() {
  const projectId = state.selectedProjectId;
  if (!projectId) return;
  const payload = cleanupBindings(projectId);
  state.preflightByProject[projectId] = await apiFetch(`/projects/${projectId}/deploy-check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential_bindings: payload })
  });
}

async function deploySelected(activate) {
  const projectId = state.selectedProjectId;
  if (!projectId) return;

  // Disable deploy buttons to prevent double-click race conditions
  const deployButtons = [el.deployInactiveBtn, el.activateBtn, el.redeployBtn];
  deployButtons.forEach((btn) => { if (btn) btn.disabled = true; });

  const bindings = cleanupBindings(projectId);
  uiDebug("deploySelected:start", {
    project_id: projectId,
    activate,
    credential_bindings_count: bindings.length
  });
  try {
    await apiFetch(`/projects/${projectId}/deploy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        activate,
        credential_bindings: bindings
      })
    });
    uiDebug("deploySelected:done", { project_id: projectId, activate });
  } finally {
    // Re-enable buttons (renderAll will set the correct disabled state anyway)
    deployButtons.forEach((btn) => { if (btn) btn.disabled = false; });
  }
}

function openInNewTab(url) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

async function refreshCurrentProjectAfterMutation() {
  if (!state.selectedProjectId) return;
  uiDebug("refreshCurrentProjectAfterMutation:start", { project_id: state.selectedProjectId });
  await loadProjects();
  await loadReport();
  await loadAnalytics();
  await selectProject(state.selectedProjectId);
  uiDebug("refreshCurrentProjectAfterMutation:done", { project_id: state.selectedProjectId });
}

async function handleChatSubmit(event) {
  event.preventDefault();
  const message = String(el.chatInput.value || "").trim();
  if (!message) {
    setToast("اكتب طلب automation أولًا.", "error");
    return;
  }

  el.generateBtn.disabled = true;
  pushChatItem("user", { message });
  pushChatItem("loading", {});
  renderAll();

  try {
    uiDebug("chatSubmit:start", { message_length: message.length });
    const payload = await apiFetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    state.chatStream = state.chatStream.filter((entry) => entry.kind !== "loading");
    const workflowStatus = payload?.validation?.valid ? "validated" : "rejected";
    state.builderTimelineState = workflowStatus;

    pushChatItem("ai-summary", {
      summary: `Project: ${payload.project_name || "-"} | nodes: ${payload.workflow?.nodes?.length || 0}`
    });
    pushChatItem("validation", {
      message: payload?.validation?.valid
        ? "Workflow validated and ready for deploy as inactive."
        : `Workflow rejected: ${(payload?.validation?.errors || []).join(" | ") || "validation failed"}`
    });
    pushChatItem("next-action", {
      message: payload?.validation?.valid
        ? "Select project and click Deploy to n8n as Inactive."
        : "Use Fix Workflow to regenerate a valid workflow."
    });

    el.chatInput.value = "";
    await loadProjects();
    await loadReport();
    await loadAnalytics();
    if (payload.project_id) {
      await selectProject(payload.project_id);
    }
    uiDebug("chatSubmit:done", {
      project_id: payload.project_id || null,
      node_count: payload?.workflow?.nodes?.length || 0
    });
    setToast("Workflow generated.", "success");
  } catch (error) {
    uiDebug("chatSubmit:error", { error: error?.message || String(error) });
    state.chatStream = state.chatStream.filter((entry) => entry.kind !== "loading");
    setToast(error.message, "error");
  } finally {
    el.generateBtn.disabled = false;
    renderAll();
  }
}

async function handleFixWorkflow() {
  const projectId = state.selectedProjectId;
  if (!projectId) return;
  try {
    await apiFetch(`/projects/${projectId}/fix-workflow`, { method: "POST" });
    await refreshCurrentProjectAfterMutation();
    setToast("Workflow fix attempt completed.", "success");
  } catch (error) {
    setToast(error.message, "error");
  }
}

async function handleDeployInactive() {
  try {
    await deploySelected(false);
    await refreshCurrentProjectAfterMutation();
    setToast("Deployed as inactive.", "success");
  } catch (error) {
    setToast(error.message, "error");
  }
}

async function handleActivate() {
  try {
    await deploySelected(true);
    await refreshCurrentProjectAfterMutation();
    setToast("Workflow activated.", "success");
  } catch (error) {
    setToast(error.message, "error");
  }
}

async function handleRedeploy() {
  const projectId = state.selectedProjectId;
  if (!projectId) return;
  const lifecycle = String(getReportItem(projectId)?.lifecycle_state || "");
  const activate = lifecycle === "deployed_active";
  try {
    await deploySelected(activate);
    await refreshCurrentProjectAfterMutation();
    setToast("Workflow redeployed.", "success");
  } catch (error) {
    setToast(error.message, "error");
  }
}

async function handleRefreshHealth() {
  const projectId = state.selectedProjectId;
  if (!projectId) return;
  try {
    state.healthByProject[projectId] = await apiFetch(`/projects/${projectId}/health/refresh`, {
      method: "POST"
    });
    await loadReport();
    renderAll();
    setToast("Health refreshed.", "success");
  } catch (error) {
    setToast(error.message, "error");
  }
}

async function handleLoadExecutions() {
  const projectId = state.selectedProjectId;
  if (!projectId) return;
  try {
    const payload = await apiFetch(`/projects/${projectId}/executions?limit=20`);
    state.executionsByProject[projectId] = Array.isArray(payload.executions)
      ? payload.executions
      : [];
    renderMonitoring();
    setToast("Executions loaded.", "success");
  } catch (error) {
    setToast(error.message, "error");
  }
}

async function handleRefreshActivity() {
  const projectId = state.selectedProjectId;
  if (!projectId) return;
  try {
    state.activityByProject[projectId] = await apiFetch(`/projects/${projectId}/events?limit=120`);
    renderActivity();
    setToast("Activity refreshed.", "success");
  } catch (error) {
    setToast(error.message, "error");
  }
}

function openDeleteModal() {
  state.deletingProjectId = state.selectedProjectId;
  el.deleteModal.classList.remove("hidden");
}

function closeDeleteModal() {
  state.deletingProjectId = null;
  el.deleteModal.classList.add("hidden");
}

async function confirmDeleteAutomation() {
  const projectId = state.deletingProjectId;
  if (!projectId) return;
  el.confirmDeleteBtn.disabled = true;
  try {
    const payload = await apiFetch(`/projects/${projectId}`, { method: "DELETE" });
    state.deleteWarningsByProject = state.deleteWarningsByProject || {};
    state.deleteWarningsByProject[projectId] = Array.isArray(payload.cleanup_warnings)
      ? payload.cleanup_warnings
      : [];

    await loadProjects();
    await loadReport();
    await loadAnalytics();

    if (state.selectedProjectId === projectId) {
      state.selectedProjectId = null;
      state.selectedProjectSnapshot = null;
    }
    closeDeleteModal();
    renderAll();
    if (state.deleteWarningsByProject[projectId].length > 0) {
      setToast("Deleted with cleanup warnings.", "neutral");
    } else {
      setToast("Automation deleted.", "success");
    }
  } catch (error) {
    setToast(error.message, "error");
  } finally {
    el.confirmDeleteBtn.disabled = false;
  }
}

function switchTab(tab) {
  el.tabButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tab));
  el.tabPanels.forEach((panel) => panel.classList.toggle("active", panel.id === `tab-${tab}`));
}

function applyMobileLayout(view) {
  const mobile = window.matchMedia("(max-width: 1060px)").matches;
  if (!mobile) {
    el.projectsSidebar.style.display = "";
    el.mainCenter.style.display = "";
    el.detailPanel.style.display = "";
    return;
  }

  el.projectsSidebar.style.display = view === "projects" ? "" : "none";
  el.mainCenter.style.display = view === "builder" ? "" : "none";
  el.detailPanel.style.display = view === "details" ? "" : "none";
}

async function refreshEverything() {
  await Promise.all([refreshSystemHealth(), loadProjects(), loadReport(), loadAnalytics()]);
  if (state.selectedProjectId) {
    await loadProjectRelatedData(state.selectedProjectId);
  }
  renderAll();
}

function bindEvents() {
  el.chatForm.addEventListener("submit", handleChatSubmit);
  el.retryFixBtn.addEventListener("click", handleFixWorkflow);
  el.refreshAllBtn.addEventListener("click", () =>
    refreshEverything().catch((error) => setToast(error.message, "error"))
  );
  el.refreshReportBtn.addEventListener("click", () =>
    loadReport()
      .then(() => renderReport())
      .catch((error) => setToast(error.message, "error"))
  );
  el.reportSearchInput.addEventListener("input", renderReport);
  el.reportFilterSelect.addEventListener("change", renderReport);
  el.projectSearchInput.addEventListener("input", renderSidebar);
  el.newReportBtn.addEventListener("click", () => {
    el.mainCenter.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  el.toggleSidebarBtn.addEventListener("click", () => {
    el.projectsSidebar.classList.toggle("collapsed");
  });

  el.tabButtons.forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });

  el.projectsList.addEventListener("click", (event) => {
    const card = event.target.closest(".project-card");
    if (!card) return;
    const projectId = card.dataset.projectId;
    if (!projectId) return;
    selectProject(projectId).catch((error) => setToast(error.message, "error"));
  });

  el.reportTableBody.addEventListener("click", (event) => {
    const button = event.target.closest(".open-project-btn");
    if (!button) return;
    const projectId = button.dataset.projectId;
    if (!projectId) return;
    selectProject(projectId).catch((error) => setToast(error.message, "error"));
  });

  el.checkRequirementsBtn.addEventListener("click", async () => {
    try {
      await loadPreflight();
      renderCredentials();
      renderOverview();
      setOverviewButtonsState();
      setToast("Requirements updated.", "success");
    } catch (error) {
      setToast(error.message, "error");
    }
  });

  el.saveBindingsBtn.addEventListener("click", async () => {
    try {
      await saveCredentialBindings();
      await loadPreflight();
      await loadReport();
      renderAll();
      setToast("Credential bindings saved.", "success");
    } catch (error) {
      setToast(error.message, "error");
    }
  });

  el.openN8nWorkflowBtn.addEventListener("click", () => {
    const item = getReportItem(state.selectedProjectId);
    debugWorkflowLinkContext("before_open_n8n_workflow");
    openInNewTab(item?.n8n_workflow_url);
  });
  el.openN8nCredentialsBtn.addEventListener("click", () => {
    const preflight = getPreflight(state.selectedProjectId);
    openInNewTab(preflight?.n8n_credentials_url);
  });

  el.deployInactiveBtn.addEventListener("click", handleDeployInactive);
  el.activateBtn.addEventListener("click", handleActivate);
  el.redeployBtn.addEventListener("click", handleRedeploy);
  el.deactivateBtn.addEventListener("click", handleDeployInactive);
  el.refreshHealthBtn.addEventListener("click", handleRefreshHealth);
  el.loadExecutionsBtn.addEventListener("click", handleLoadExecutions);
  el.refreshActivityBtn.addEventListener("click", handleRefreshActivity);

  el.deleteAutomationBtn.addEventListener("click", openDeleteModal);
  el.cancelDeleteBtn.addEventListener("click", closeDeleteModal);
  el.confirmDeleteBtn.addEventListener("click", confirmDeleteAutomation);
  el.deleteModal.addEventListener("click", (event) => {
    if (event.target === el.deleteModal) {
      closeDeleteModal();
    }
  });

  el.mobileNavButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyMobileLayout(button.dataset.mobileView);
    });
  });

  window.addEventListener("resize", () => applyMobileLayout("builder"));
}

async function boot() {
  bindEvents();
  applyMobileLayout("builder");
  await refreshEverything();
  if (state.projects[0]?.project?.id) {
    await selectProject(state.projects[0].project.id);
  }
}

boot().catch((error) => {
  setToast(error.message || "Failed to boot application.", "error");
});
