/* ============================================================
   OpsRadar — frontend application
   Vanilla JS, zero dependencies, hash-routed SPA.
   ============================================================ */

/* ============================================================
   1) DOM helpers
   ============================================================ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function h(tag, props, ...children) {
  // Component support: when `tag` is a function, treat it as a component constructor
  // that returns a Node. Lets us write `h(Skeleton, { variant: "block" })` like JSX.
  if (typeof tag === "function") {
    return tag(props || {}, ...children);
  }
  const el = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === null || value === undefined || value === false) continue;
      if (key === "class" || key === "className") {
        el.className = Array.isArray(value) ? value.filter(Boolean).join(" ") : String(value);
      } else if (key === "style" && typeof value === "object") {
        Object.assign(el.style, value);
      } else if (key === "dataset" && typeof value === "object") {
        Object.assign(el.dataset, value);
      } else if (key.startsWith("on") && typeof value === "function") {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === "html") {
        el.innerHTML = String(value);
      } else if (typeof value === "boolean") {
        if (value) el.setAttribute(key, "");
      } else {
        el.setAttribute(key, String(value));
      }
    }
  }
  appendChildren(el, children);
  return el;
}
function appendChildren(parent, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    if (child instanceof Node) parent.appendChild(child);
    else parent.appendChild(document.createTextNode(String(child)));
  }
}

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}
function mount(root, ...children) {
  clear(root);
  appendChildren(root, children);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

/* ============================================================
   2) Icons (inline SVG, currentColor)
   ============================================================ */

function icon(name, size = 18) {
  const svg = (paths) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  const map = {
    home: svg('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>'),
    builder: svg('<path d="M12 3v18"/><path d="M3 12h18"/><circle cx="12" cy="12" r="9"/>'),
    projects: svg('<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4"/><path d="M3 17l9 4 9-4"/>'),
    workflows: svg('<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="9" y="15" width="6" height="6" rx="1"/><path d="M6 9v3h12v3"/>'),
    events: svg('<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>'),
    analytics: svg('<path d="M3 21V3"/><path d="M21 21H3"/><path d="M7 17l4-6 4 3 4-7"/>'),
    refresh: svg('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>'),
    plus: svg('<path d="M12 5v14"/><path d="M5 12h14"/>'),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
    chevronRight: svg('<path d="M9 18l6-6-6-6"/>'),
    chevronDown: svg('<path d="M6 9l6 6 6-6"/>'),
    sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>'),
    moon: svg('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'),
    menu: svg('<path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/>'),
    close: svg('<path d="M18 6L6 18"/><path d="M6 6l12 12"/>'),
    inbox: svg('<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>'),
    info: svg('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><circle cx="12" cy="8" r=".5" fill="currentColor"/>'),
    play: svg('<path d="M5 3l14 9-14 9V3z" fill="currentColor"/>'),
    stop: svg('<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>'),
    trash: svg('<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'),
    external: svg('<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/>'),
    check: svg('<path d="M20 6L9 17l-5-5"/>'),
    alert: svg('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><circle cx="12" cy="17" r=".5" fill="currentColor"/>'),
    settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
    deploy: svg('<path d="M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"/><path d="M12 4v12"/><path d="M7 9l5-5 5 5"/>'),
    list: svg('<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1" fill="currentColor"/><circle cx="3.5" cy="12" r="1" fill="currentColor"/><circle cx="3.5" cy="18" r="1" fill="currentColor"/>')
  };
  const wrap = document.createElement("span");
  wrap.className = "icon-wrap";
  wrap.style.display = "inline-flex";
  wrap.innerHTML = map[name] || "";
  return wrap;
}

/* ============================================================
   3) Store (subscribers)
   ============================================================ */

function createStore(initial) {
  let state = initial;
  const subs = new Set();
  return {
    get: () => state,
    set(patch) {
      const next = typeof patch === "function" ? patch(state) : { ...state, ...patch };
      state = next;
      subs.forEach((fn) => {
        try { fn(state); } catch (err) { console.error(err); }
      });
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    }
  };
}

const store = createStore({
  theme: localStorage.getItem("opsradar.theme") || "dark",
  sidebar: localStorage.getItem("opsradar.sidebar") === "collapsed" ? "collapsed" : "open",
  health: { api: "checking", n8n: "checking", monitoring: "checking", monitoring_enabled: false },
  projects: { items: null, loading: false, error: null, lastFetched: 0 },
  report: { data: null, loading: false, error: null, lastFetched: 0 },
  analytics: { data: null, loading: false, error: null, lastFetched: 0 },
  events: {
    items: [], // aggregated event list (newest first)
    byProject: {}, // projectId -> { items, etag }
    filters: { projectId: "all", severity: "all", q: "", eventType: "all" },
    selectedId: null,
    paused: false,
    lastTick: 0
  },
  chat: {
    messages: [], // { role, content, ts }
    generating: false,
    progressText: "",
    lastResult: null, // ChatResult
    error: null
  },
  detail: {
    projectId: null,
    snapshot: null, // { project, workflow, health }
    bindings: null, // /credential-bindings response
    preflight: null, // /deploy-check response
    health: null, // /health response
    activity: null, // /events response
    executions: null, // /executions response
    executionDetail: null, // /executions/:id response
    loading: false,
    error: null
  },
  ui: {
    page: location.hash || "#/",
    mobileSidebar: false,
    modal: null,
    toasts: []
  }
});

const subscribe = store.subscribe.bind(store);
const setState = store.set.bind(store);
const getState = store.get.bind(store);

/* ============================================================
   4) Toast + Modal helpers
   ============================================================ */

let toastSeq = 0;
function toast(message, tone = "info", { duration = 4000 } = {}) {
  const id = ++toastSeq;
  const next = [...getState().ui.toasts, { id, message, tone, duration }];
  setState((s) => ({ ...s, ui: { ...s.ui, toasts: next } }));
  if (duration > 0) setTimeout(() => dismissToast(id), duration);
  return id;
}
function dismissToast(id) {
  setState((s) => ({ ...s, ui: { ...s.ui, toasts: s.ui.toasts.filter((t) => t.id !== id) } }));
}

function openModal(modal) {
  setState((s) => ({ ...s, ui: { ...s.ui, modal } }));
}
function closeModal() {
  setState((s) => ({ ...s, ui: { ...s.ui, modal: null } }));
}

/* ============================================================
   5) API client
   ============================================================ */

class ApiError extends Error {
  constructor(message, code, status, details) {
    super(message);
    this.code = code || "UNKNOWN";
    this.status = status || 0;
    this.details = details || null;
  }
}

/* Auth token lifecycle (browser side):
 *  - stored in localStorage under "opsradar.token" so a hard reload keeps the
 *    user signed in but a private-window/different-browser starts fresh
 *  - attached as "Authorization: Bearer <token>" on every request
 *  - cleared on any 401 response so the UI bounces back to the login screen
 *    without us having to teach every page to reason about expired tokens
 */
const AUTH_TOKEN_KEY = "opsradar.token";
const AUTH_USER_KEY = "opsradar.user";

function getAuthToken() {
  try { return localStorage.getItem(AUTH_TOKEN_KEY); } catch { return null; }
}
function setAuthToken(token) {
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch { /* ignore quota / disabled storage */ }
}
function getCachedAuthUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function setCachedAuthUser(user) {
  try {
    if (user) localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(AUTH_USER_KEY);
  } catch { /* ignore */ }
}
function clearAuth() {
  setAuthToken(null);
  setCachedAuthUser(null);
}

// Routes that should NOT auto-bounce to login on 401 — namely the auth
// endpoints themselves, where 401 is the expected outcome of a bad credential.
const PUBLIC_PATHS = new Set(["/auth/register", "/auth/login", "/health"]);

async function request(path, { method = "GET", body, signal, headers, skipAuthRedirect } = {}) {
  const init = { method, signal, headers: { ...(headers || {}) } };
  if (body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  // Attach bearer token unless the caller explicitly opted out
  // (e.g. the login form, which sends an empty Authorization).
  const token = getAuthToken();
  if (token && !init.headers["Authorization"] && !init.headers["authorization"]) {
    init.headers["Authorization"] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(path, init);
  } catch (err) {
    if (err && err.name === "AbortError") throw err;
    throw new ApiError(`Network error contacting backend (${err.message || err}).`, "NETWORK", 0);
  }
  let payload = null;
  const text = await res.text();
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = { raw: text }; }
  }
  if (!res.ok) {
    const errBody = payload?.error || {};
    // Token expired / revoked / wrong account: drop local auth state and force
    // a re-login. We skip this for paths that legitimately surface 401 to the
    // caller (the login form needs the 401 to render its error message).
    if (res.status === 401 && !skipAuthRedirect && !PUBLIC_PATHS.has(path)) {
      clearAuth();
      // Defer so the caller's await chain unwinds before we re-render.
      queueMicrotask(() => router?.());
    }
    throw new ApiError(
      errBody.message || `Request failed (${res.status})`,
      errBody.code || `HTTP_${res.status}`,
      res.status,
      errBody.details ?? null
    );
  }
  return payload;
}

const api = {
  health: () => request("/health"),
  analytics: () => request("/analytics"),

  projects: {
    list: ({ limit = 200, verifyN8n = true } = {}) =>
      request(`/projects?limit=${limit}&offset=0&verify_n8n=${verifyN8n ? 1 : 0}`),
    report: ({ limit = 500, verifyN8n = true } = {}) =>
      request(`/projects/report?limit=${limit}&offset=0&verify_n8n=${verifyN8n ? 1 : 0}`),
    get: (id) => request(`/projects/${encodeURIComponent(id)}`),
    workflow: (id) => request(`/projects/${encodeURIComponent(id)}/workflow`),
    messages: (id) => request(`/projects/${encodeURIComponent(id)}/messages`),
    events: (id, { limit = 100 } = {}) =>
      request(`/projects/${encodeURIComponent(id)}/events?limit=${limit}`),
    health: (id) => request(`/projects/${encodeURIComponent(id)}/health`),
    refreshHealth: (id) =>
      request(`/projects/${encodeURIComponent(id)}/health/refresh`, { method: "POST", body: {} }),
    executions: (id, { limit = 20, status } = {}) => {
      const q = new URLSearchParams({ limit: String(limit) });
      if (status) q.set("status", status);
      return request(`/projects/${encodeURIComponent(id)}/executions?${q.toString()}`);
    },
    execution: (id, executionId) =>
      request(`/projects/${encodeURIComponent(id)}/executions/${encodeURIComponent(executionId)}`),
    bindings: {
      get: (id) => request(`/projects/${encodeURIComponent(id)}/credential-bindings`),
      save: (id, bindings) =>
        request(`/projects/${encodeURIComponent(id)}/credential-bindings`, {
          method: "PUT",
          body: { bindings }
        })
    },
    deployCheck: (id, body = {}) =>
      request(`/projects/${encodeURIComponent(id)}/deploy-check`, { method: "POST", body }),
    deploy: (id, body) =>
      request(`/projects/${encodeURIComponent(id)}/deploy`, { method: "POST", body }),
    fix: (id) => request(`/projects/${encodeURIComponent(id)}/fix-workflow`, { method: "POST", body: {} }),
    delete: (id) => request(`/projects/${encodeURIComponent(id)}`, { method: "DELETE" })
  },

  workflows: {
    status: (workflowId) => request(`/workflows/${encodeURIComponent(workflowId)}/status`)
  },

  n8n: {
    credentials: () => request("/n8n/credentials"),
    credentialSchema: (type) =>
      request(`/n8n/credentials/schema/${encodeURIComponent(type)}`),
    createCredential: (body) => request("/n8n/credentials", { method: "POST", body })
  },

  chat: {
    send: (message, signal) => request("/chat", { method: "POST", body: { message }, signal })
  },

  events: {
    // External ingest endpoint. Token (if any) is sent via x-event-token header so we can
    // call it from a "send test event" debug widget without leaking the token via Bearer.
    ingest: (body, token) =>
      request("/event", {
        method: "POST",
        body,
        ...(token ? { headers: { "x-event-token": token } } : {})
      })
  },

  debug: {
    knowledgeBase: (query) =>
      request(`/debug/knowledge-base?query=${encodeURIComponent(query || "")}`),
    workflow: (projectId, { verifyN8n = true } = {}) =>
      request(`/debug/workflow/${encodeURIComponent(projectId)}?verify_n8n=${verifyN8n ? 1 : 0}`),
    nodeVersions: (projectId, { verifyN8n = true } = {}) =>
      request(`/debug/workflow/${encodeURIComponent(projectId)}/node-versions?verify_n8n=${verifyN8n ? 1 : 0}`)
  },

  auth: {
    register: (body) =>
      request("/auth/register", { method: "POST", body, skipAuthRedirect: true }),
    login: (body) =>
      request("/auth/login", { method: "POST", body, skipAuthRedirect: true }),
    me: () => request("/auth/me"),
    updateCredentials: (body) =>
      request("/auth/credentials", { method: "PUT", body })
  },

  admin: {
    me: () => request("/admin/me"),
    analytics: () => request("/admin/analytics"),
    users: {
      list: ({ limit = 100, offset = 0, q = "" } = {}) => {
        const sp = new URLSearchParams({ limit: String(limit), offset: String(offset) });
        if (q) sp.set("q", q);
        return request(`/admin/users?${sp.toString()}`);
      },
      get: (id) => request(`/admin/users/${encodeURIComponent(id)}`),
      create: (body) => request("/admin/users", { method: "POST", body }),
      patch: (id, body) => request(`/admin/users/${encodeURIComponent(id)}`, { method: "PATCH", body }),
      resetPassword: (id, password) =>
        request(`/admin/users/${encodeURIComponent(id)}/reset-password`, {
          method: "POST",
          body: { password }
        }),
      delete: (id) => request(`/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" })
    },
    interactions: {
      list: ({ limit = 100, offset = 0, user_id, status, provider } = {}) => {
        const sp = new URLSearchParams({ limit: String(limit), offset: String(offset) });
        if (user_id) sp.set("user_id", user_id);
        if (status) sp.set("status", status);
        if (provider) sp.set("provider", provider);
        return request(`/admin/ai-interactions?${sp.toString()}`);
      },
      get: (id) => request(`/admin/ai-interactions/${encodeURIComponent(id)}`)
    },
    projects: {
      list: ({ limit = 200, offset = 0 } = {}) =>
        request(`/admin/projects?limit=${limit}&offset=${offset}`)
    }
  }
};

/* ============================================================
   6) Realtime abstraction (polling, SSE-ready)
   ============================================================ */

function createPoller({ key, intervalMs, fn, onResult, onError }) {
  let stopped = false;
  let timer = null;
  let inFlight = false;

  const tick = async () => {
    if (stopped || inFlight) return;
    inFlight = true;
    try {
      const result = await fn();
      if (!stopped) onResult?.(result);
    } catch (err) {
      if (!stopped) onError?.(err);
    } finally {
      inFlight = false;
      if (!stopped) timer = setTimeout(tick, intervalMs);
    }
  };

  tick();
  return {
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
    triggerNow() {
      if (timer) clearTimeout(timer);
      tick();
    }
  };
}

// Each tab maintains its own active pollers.
const pollers = new Map();
function startPoller(key, options) {
  stopPoller(key);
  pollers.set(key, createPoller(options));
}
function stopPoller(key) {
  const p = pollers.get(key);
  if (p) { p.stop(); pollers.delete(key); }
}
function stopAllPollers() {
  for (const p of pollers.values()) p.stop();
  pollers.clear();
}

/* ============================================================
   7) Theme + Sidebar
   ============================================================ */

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("opsradar.theme", theme);
}
function applySidebar(mode) {
  document.getElementById("app").dataset.sidebar = mode;
  localStorage.setItem("opsradar.sidebar", mode);
}
function toggleTheme() {
  const next = getState().theme === "dark" ? "light" : "dark";
  setState({ theme: next });
  applyTheme(next);
}
function toggleSidebar() {
  const next = getState().sidebar === "open" ? "collapsed" : "open";
  setState({ sidebar: next });
  applySidebar(next);
}

/* ============================================================
   8) Format / utility helpers
   ============================================================ */

function fmtDate(value, options = {}) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
    ...options
  });
}
function fmtRelative(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const abs = Math.abs(diff);
  const future = diff < 0;
  const seconds = Math.round(abs / 1000);
  if (seconds < 60) return future ? `in ${seconds}s` : `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return future ? `in ${minutes}m` : `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return future ? `in ${hours}h` : `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return future ? `in ${days}d` : `${days}d ago`;
  return fmtDate(value, { hour: undefined, minute: undefined });
}
function fmtDuration(ms) {
  if (ms === null || ms === undefined || !Number.isFinite(Number(ms))) return "—";
  const n = Number(ms);
  if (n < 1000) return `${n} ms`;
  if (n < 60000) return `${(n / 1000).toFixed(1)} s`;
  return `${(n / 60000).toFixed(1)} min`;
}
function fmtPct(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return `${Number(n).toFixed(1)}%`;
}

function lifecycleLabel(value) {
  const map = {
    draft: "Draft",
    validated: "Validated",
    rejected: "Rejected",
    deployed_inactive: "Deployed inactive",
    deployed_active: "Active",
    failed: "Failed",
    missing_in_n8n: "Missing in n8n",
    n8n_check_failed: "n8n check failed",
    no_workflow: "No workflow"
  };
  const k = String(value || "unknown").toLowerCase();
  return map[k] || k;
}
function lifecycleTone(v) {
  const k = String(v || "").toLowerCase();
  if (k === "deployed_active") return "ok";
  if (k === "validated" || k === "deployed_inactive") return "warn";
  if (k === "rejected" || k === "failed" || k === "missing_in_n8n") return "bad";
  return "neutral";
}
function healthTone(v) {
  const k = String(v || "").toLowerCase();
  if (k === "healthy") return "ok";
  if (k === "warning" || k === "inactive") return "warn";
  if (k === "failing") return "bad";
  return "neutral";
}
function severityTone(v) {
  const k = String(v || "").toLowerCase();
  if (k === "high") return "bad";
  if (k === "medium") return "warn";
  if (k === "low") return "info";
  return "neutral";
}
function isFailureExecutionStatus(s) {
  return ["error", "failed", "crashed", "failure"].includes(String(s || "").toLowerCase());
}
function isSuccessExecutionStatus(s) {
  return ["success", "succeeded"].includes(String(s || "").toLowerCase());
}

/* ============================================================
   9) Shared components
   ============================================================ */

function Badge({ tone = "neutral", text, dot = false, pulse = false }) {
  const cls = ["badge", tone && `badge--${tone}`, pulse && "badge--pulse"].filter(Boolean).join(" ");
  return h("span", { class: cls }, dot && h("span", { class: "badge__dot" }), text);
}

function Skeleton({ variant = "text", style }) {
  return h("span", { class: `skeleton skeleton--${variant}`, style });
}

function Empty({ icon: ic = "inbox", title, hint, action }) {
  return h(
    "div",
    { class: "empty" },
    h("div", { class: "empty__icon" }, icon(ic, 22)),
    h("div", { class: "empty__title" }, title || "Nothing here yet"),
    hint && h("div", { class: "empty__hint" }, hint),
    action && h("div", { class: "row" }, action)
  );
}

function ErrorBanner({ error, onRetry }) {
  const msg = error instanceof Error ? error.message : String(error || "Unknown error");
  return h(
    "div",
    { class: "error-banner" },
    icon("alert", 16),
    h("span", { class: "flex-1" }, msg),
    onRetry &&
      h("button", { class: "btn btn--sm btn--ghost", onclick: onRetry }, icon("refresh", 14), "Retry")
  );
}

/**
 * n8n's run-time errors land in our DB as JSON-serialized NodeApiError payloads
 * (description, message, httpCode, node, messages, stack, ...). Surfacing the raw
 * blob is unreadable — extract the human parts and tuck the rest behind a toggle.
 *
 * Returns: { summary, httpCode, nodeName, nodeType, details }
 *   - summary:  short human one-liner (description ?? message ?? name)
 *   - details:  sanitized object — only the fields users can act on; `stack` is
 *               truncated to first 6 lines so a misclick doesn't dump 4 KB.
 *               `null` if the input wasn't structured.
 */
function parseN8nError(raw) {
  if (raw === null || raw === undefined || raw === "") {
    return { summary: "—", httpCode: null, nodeName: null, nodeType: null, details: null };
  }

  let parsed = null;
  if (typeof raw === "object") {
    parsed = raw;
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try { parsed = JSON.parse(trimmed); } catch { /* keep as string */ }
    }
  }

  if (!parsed || typeof parsed !== "object") {
    // Plain text — collapse to first non-empty line, cap at 240 chars.
    const oneLine = String(raw).split(/\r?\n/).find((l) => l.trim().length > 0) || String(raw);
    return {
      summary: oneLine.slice(0, 240),
      httpCode: null,
      nodeName: null,
      nodeType: null,
      details: null
    };
  }

  const description =
    typeof parsed.description === "string" ? parsed.description.trim() : null;
  const message = typeof parsed.message === "string" ? parsed.message.trim() : null;
  const httpCode =
    parsed.httpCode != null ? String(parsed.httpCode) : null;
  const name = typeof parsed.name === "string" ? parsed.name : null;
  const nodeName =
    parsed.node && typeof parsed.node === "object" && typeof parsed.node.name === "string"
      ? parsed.node.name
      : null;
  const nodeType =
    parsed.node && typeof parsed.node === "object" && typeof parsed.node.type === "string"
      ? parsed.node.type
      : null;

  // Pick the most informative line. Description is usually the upstream API's text
  // ("Forbidden: bot was blocked by the user"); fall back to message/name.
  let summary = description || message || name || "Unknown error";
  if (httpCode) summary += ` (HTTP ${httpCode})`;

  // Sanitized details for the collapsible viewer — drop the noisiest fields.
  const details = {};
  if (name) details.name = name;
  if (description) details.description = description;
  if (message && message !== description) details.message = message;
  if (httpCode) details.httpCode = httpCode;
  if (nodeName || nodeType) details.node = { name: nodeName, type: nodeType };
  if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
    details.messages = parsed.messages.slice(0, 5).map((m) => String(m).slice(0, 400));
  }
  if (typeof parsed.stack === "string") {
    details.stack_preview = parsed.stack.split(/\r?\n/).slice(0, 6).join("\n");
  }

  return { summary, httpCode, nodeName, nodeType, details };
}

/**
 * Renders a parsed error inline: summary line + a collapsed `<details>` with the
 * sanitized object. Use this anywhere we previously dumped `raw_message` / `e.message`
 * directly to the DOM.
 */
function ErrorDetail({ raw, label = "Show error details" }) {
  const parsed = parseN8nError(raw);
  return h(
    "div",
    { class: "col col--gap-2" },
    h("div", { class: "text-sm" }, parsed.summary),
    parsed.details
      ? h(
          "details",
          { style: { marginTop: 4 } },
          h(
            "summary",
            { style: { cursor: "pointer", color: "var(--fg-muted)", fontSize: "var(--fs-xs)" } },
            label
          ),
          jsonHighlight(parsed.details)
        )
      : null
  );
}

function Kpi({ label, value, hint, tone, sparkline }) {
  return h(
    "div",
    { class: "kpi" },
    h("div", { class: "kpi__label" }, label),
    h("div", { class: ["kpi__value", tone === "small" && "kpi__value--small"] }, value),
    hint && h("div", { class: ["kpi__delta", tone === "up" && "kpi__delta--up", tone === "down" && "kpi__delta--down"] }, hint),
    sparkline && h("div", { class: "kpi__sparkline" }, sparkline)
  );
}

function Sparkline(values, { stroke = "currentColor", height = 32, width = 80 } = {}) {
  if (!values || values.length === 0) return null;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;
  const stepX = width / Math.max(values.length - 1, 1);
  const points = values
    .map((v, i) => `${(i * stepX).toFixed(1)},${(height - ((v - min) / range) * height).toFixed(1)}`)
    .join(" ");
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  const polyline = document.createElementNS(ns, "polyline");
  polyline.setAttribute("fill", "none");
  polyline.setAttribute("stroke", stroke);
  polyline.setAttribute("stroke-width", "1.5");
  polyline.setAttribute("points", points);
  svg.appendChild(polyline);
  return svg;
}

function BarChart(values, labels, { height = 220 } = {}) {
  const ns = "http://www.w3.org/2000/svg";
  const max = Math.max(...values, 1);
  const w = 720;
  const h = height;
  const padX = 32, padY = 28;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const barW = innerW / Math.max(values.length, 1);
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.classList.add("chart-svg");

  // axis baseline
  const baseline = document.createElementNS(ns, "line");
  baseline.setAttribute("x1", padX);
  baseline.setAttribute("x2", w - padX);
  baseline.setAttribute("y1", h - padY);
  baseline.setAttribute("y2", h - padY);
  baseline.setAttribute("stroke", "var(--border)");
  baseline.setAttribute("stroke-dasharray", "2,3");
  svg.appendChild(baseline);

  values.forEach((v, i) => {
    const bh = (v / max) * innerH;
    const bx = padX + i * barW + barW * 0.15;
    const by = h - padY - bh;
    const rect = document.createElementNS(ns, "rect");
    rect.setAttribute("x", bx);
    rect.setAttribute("y", by);
    rect.setAttribute("width", barW * 0.7);
    rect.setAttribute("height", Math.max(bh, 1));
    rect.setAttribute("rx", 3);
    rect.setAttribute("fill", "var(--accent)");
    rect.setAttribute("opacity", v === 0 ? 0.25 : 0.85);
    svg.appendChild(rect);

    if (labels && labels[i]) {
      const t = document.createElementNS(ns, "text");
      t.setAttribute("x", bx + barW * 0.35);
      t.setAttribute("y", h - padY + 16);
      t.setAttribute("font-size", "10");
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("fill", "var(--fg-subtle)");
      t.textContent = labels[i];
      svg.appendChild(t);
    }

    const valueText = document.createElementNS(ns, "text");
    valueText.setAttribute("x", bx + barW * 0.35);
    valueText.setAttribute("y", by - 6);
    valueText.setAttribute("font-size", "10");
    valueText.setAttribute("text-anchor", "middle");
    valueText.setAttribute("fill", "var(--fg-muted)");
    valueText.textContent = String(v);
    svg.appendChild(valueText);
  });

  return svg;
}

function jsonHighlight(value) {
  let pretty;
  try {
    pretty = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  } catch {
    pretty = String(value);
  }
  if (typeof pretty !== "string") pretty = JSON.stringify(pretty, null, 2);
  const escaped = escapeHtml(pretty);
  const html = escaped
    .replace(/(&quot;[^&]*?&quot;)\s*:/g, '<span class="json-key">$1</span>:')
    .replace(/:\s*(&quot;.*?&quot;)/g, ': <span class="json-string">$1</span>')
    .replace(/:\s*(true|false)\b/g, ': <span class="json-bool">$1</span>')
    .replace(/:\s*null\b/g, ': <span class="json-null">null</span>')
    .replace(/:\s*(-?\d+(?:\.\d+)?)/g, ': <span class="json-number">$1</span>');
  return h("pre", { class: "code-block", html });
}

function ConfirmDialog({ title, message, confirmLabel = "Confirm", danger, onConfirm }) {
  return {
    title,
    body: h("p", null, message),
    actions: [
      h("button", { class: "btn btn--ghost", onclick: closeModal }, "Cancel"),
      h(
        "button",
        {
          class: ["btn", danger ? "btn--danger" : "btn--primary"],
          onclick: async () => {
            try {
              await onConfirm();
              closeModal();
            } catch (err) {
              toast(err.message || "Action failed", "error");
            }
          }
        },
        confirmLabel
      )
    ]
  };
}

/* ============================================================
   10) Sidebar + Topbar render
   ============================================================ */

const NAV_ITEMS = [
  { path: "#/", label: "Dashboard", icon: "home" },
  { path: "#/builder", label: "AI Builder", icon: "builder" },
  { path: "#/projects", label: "Projects", icon: "projects" },
  { path: "#/workflows", label: "Workflows", icon: "workflows" },
  { path: "#/events", label: "Events", icon: "events" },
  { path: "#/analytics", label: "Analytics", icon: "analytics" },
  { path: "#/credentials", label: "Credentials", icon: "settings" },
  { path: "#/diagnostics", label: "Diagnostics", icon: "info" }
];

/** Sidebar items rendered ONLY when the cached user has is_admin === true.
 *  We rebuild the sidebar on every auth state change so demotion/promotion
 *  hides/shows this section without requiring a full page reload. */
const ADMIN_NAV_ITEMS = [
  { path: "#/admin", label: "Admin · Dashboard", icon: "home" },
  { path: "#/admin/users", label: "Admin · Users", icon: "projects" },
  { path: "#/admin/interactions", label: "Admin · Prompts log", icon: "builder" },
  { path: "#/admin/projects", label: "Admin · All projects", icon: "workflows" }
];

function renderSidebar() {
  const s = getState();
  const root = $("#sidebar");
  if (!root) return;
  const currentPath = normalizePath(s.ui.page);

  mount(
    root,
    h(
      "div",
      { class: "sidebar__brand" },
      h("div", { class: "sidebar__brand-mark" }, "OR"),
      h(
        "div",
        { class: "sidebar__brand-text" },
        h("div", { class: "sidebar__brand-title" }, "OpsRadar"),
        h("div", { class: "sidebar__brand-sub" }, "n8n + AI control center")
      )
    ),
    h(
      "nav",
      { class: "sidebar__nav" },
      h("div", { class: "sidebar__section-label" }, "Workspace"),
      ...NAV_ITEMS.map((it) =>
        h(
          "a",
          {
            class: "nav-link",
            href: it.path,
            "aria-current": isActiveRoute(currentPath, it.path) ? "page" : null,
            onclick: () => closeMobileSidebar()
          },
          h("span", { class: "nav-link__icon" }, icon(it.icon, 16)),
          h("span", { class: "nav-link__label" }, it.label)
        )
      ),
      // Admin section — only rendered for users with is_admin=true on the
      // cached profile. Backend still enforces requireAdmin on every /admin/*
      // call so this is purely a UX gate, not a security check.
      getCachedAuthUser()?.is_admin
        ? h(
            "div",
            { class: "col col--gap-1", style: { marginTop: "var(--sp-3)" } },
            h("div", { class: "sidebar__section-label" }, "Admin"),
            ...ADMIN_NAV_ITEMS.map((it) =>
              h(
                "a",
                {
                  class: "nav-link",
                  href: it.path,
                  "aria-current": isActiveRoute(currentPath, it.path) ? "page" : null,
                  onclick: () => closeMobileSidebar()
                },
                h("span", { class: "nav-link__icon" }, icon(it.icon, 16)),
                h("span", { class: "nav-link__label" }, it.label)
              )
            )
          )
        : null
    ),
    h(
      "div",
      { class: "sidebar__footer" },
      h(
        "div",
        { class: "sidebar__health" },
        h("div", { class: "sidebar__health-row" }, "API", healthDot(s.health.api)),
        h("div", { class: "sidebar__health-row" }, "n8n", healthDot(s.health.n8n)),
        h(
          "div",
          { class: "sidebar__health-row" },
          "Monitoring",
          healthDot(s.health.monitoring_enabled ? "ok" : "off")
        )
      ),
      h(
        "button",
        { class: "btn btn--ghost btn--block btn--sm", onclick: toggleTheme },
        icon(s.theme === "dark" ? "sun" : "moon", 14),
        h("span", { class: "sidebar__footer-toggle-label" }, s.theme === "dark" ? "Light" : "Dark")
      ),
      h(
        "button",
        { class: "btn btn--ghost btn--block btn--sm", onclick: toggleSidebar },
        icon("settings", 14),
        h("span", { class: "sidebar__footer-toggle-label" }, "Collapse")
      )
    )
  );
}

function healthDot(status) {
  const map = { ok: "ok", up: "ok", checking: "warn", off: "neutral", down: "bad", error: "bad" };
  const tone = map[String(status || "").toLowerCase()] || "neutral";
  return Badge({ tone, text: status, dot: true });
}

function renderTopbar(title, sub) {
  const s = getState();
  const root = $("#topbar");
  if (!root) return;
  mount(
    root,
    h(
      "button",
      { class: "menu-btn", "aria-label": "Toggle menu", onclick: openMobileSidebar },
      icon("menu", 18)
    ),
    h(
      "div",
      null,
      h("h1", { class: "topbar__title" }, title || "OpsRadar"),
      sub ? h("div", { class: "topbar__crumbs" }, sub) : null
    ),
    h("div", { class: "topbar__spacer" }),
    h(
      "div",
      { class: "topbar__actions" },
      Badge({
        tone: s.health.api === "ok" ? "ok" : s.health.api === "checking" ? "warn" : "bad",
        text: `API ${s.health.api}`,
        dot: true
      }),
      Badge({
        tone: s.health.n8n === "ok" ? "ok" : s.health.n8n === "checking" ? "warn" : "bad",
        text: `n8n ${s.health.n8n}`,
        dot: true
      }),
      h(
        "button",
        {
          class: "btn btn--ghost btn--sm",
          onclick: () => {
            refreshHealth();
            // notify current page
            window.dispatchEvent(new CustomEvent("opsradar:refresh"));
          }
        },
        icon("refresh", 14),
        "Refresh"
      ),
      // User pill — opens the Account page where the user manages their
      // per-account API credentials and signs out.
      (() => {
        const u = getCachedAuthUser();
        if (!u) return null;
        const initials = (u.name || u.email || "?")
          .split(/\s+|@/)
          .filter(Boolean)
          .slice(0, 2)
          .map((s) => s[0].toUpperCase())
          .join("");
        return h(
          "a",
          { class: "user-pill", href: "#/account", title: u.email },
          h("span", { class: "user-pill__avatar" }, initials || "U"),
          h("span", { class: "truncate", style: { maxWidth: 140 } }, u.email)
        );
      })()
    )
  );
}

function openMobileSidebar() {
  document.getElementById("app").dataset.mobileSidebar = "open";
  $("#sidebar-scrim").hidden = false;
}
function closeMobileSidebar() {
  document.getElementById("app").dataset.mobileSidebar = "closed";
  $("#sidebar-scrim").hidden = true;
}

/* ============================================================
   11) Health + bootstrap data
   ============================================================ */

async function refreshHealth() {
  setState((s) => ({ ...s, health: { ...s.health, api: "checking", n8n: "checking" } }));
  try {
    const data = await api.health();
    setState((s) => ({
      ...s,
      health: {
        ...s.health,
        api: "ok",
        monitoring_enabled: Boolean(data?.monitoring_enabled),
        monitoring: data?.monitoring_enabled ? "ok" : "off"
      }
    }));
  } catch (err) {
    setState((s) => ({ ...s, health: { ...s.health, api: "down" } }));
  }
  // n8n probe
  try {
    await api.n8n.credentials();
    setState((s) => ({ ...s, health: { ...s.health, n8n: "ok" } }));
  } catch {
    setState((s) => ({ ...s, health: { ...s.health, n8n: "down" } }));
  }
}

/* ============================================================
   12) Router (hash-based)
   ============================================================ */

function normalizePath(hash) {
  let h = String(hash || "").trim();
  if (!h.startsWith("#")) h = "#" + h;
  if (!h.startsWith("#/")) h = "#/";
  return h;
}
function isActiveRoute(current, target) {
  if (target === "#/") return current === "#/" || current === "" || current === "#";
  if (target === "#/projects") return current === "#/projects" || current.startsWith("#/projects/");
  // Admin sub-routes (e.g. #/admin/users/:id) should keep the "Admin · Users"
  // tab highlighted; treat any `target` as a prefix match for nested paths.
  if (target.startsWith("#/admin")) {
    return current === target || current.startsWith(target + "/");
  }
  return current === target;
}

const ROUTE_TABLE = [
  { path: /^#\/$/, render: pageDashboard, title: "Dashboard", sub: "System overview" },
  { path: /^#\/builder\/?$/, render: pageBuilder, title: "AI Builder", sub: "Generate workflows from chat" },
  { path: /^#\/projects\/?$/, render: pageProjects, title: "Projects", sub: "All automations and their status" },
  { path: /^#\/projects\/([^/]+)\/?$/, render: pageProjectDetail, title: "Project" },
  { path: /^#\/workflows\/?$/, render: pageWorkflows, title: "Workflows", sub: "All workflows by lifecycle" },
  { path: /^#\/events\/?$/, render: pageEvents, title: "Events", sub: "Live activity feed" },
  { path: /^#\/analytics\/?$/, render: pageAnalytics, title: "Analytics", sub: "Metrics and trends" },
  { path: /^#\/credentials\/?$/, render: pageCredentials, title: "Credentials", sub: "n8n credential inventory and provisioning" },
  { path: /^#\/diagnostics\/?$/, render: pageDiagnostics, title: "Diagnostics", sub: "Developer-facing introspection tools" },
  { path: /^#\/account\/?$/, render: pageAccount, title: "Account", sub: "Your profile and per-account API keys" },
  { path: /^#\/admin\/?$/, render: pageAdminDashboard, title: "Admin · Dashboard", sub: "Platform-wide overview" },
  { path: /^#\/admin\/users\/?$/, render: pageAdminUsers, title: "Admin · Users", sub: "Create, edit, promote, delete" },
  { path: /^#\/admin\/users\/([^/]+)\/?$/, render: pageAdminUserDetail, title: "Admin · User detail" },
  { path: /^#\/admin\/interactions\/?$/, render: pageAdminInteractions, title: "Admin · Prompts log", sub: "Every AI call across all users" },
  { path: /^#\/admin\/interactions\/(\d+)\/?$/, render: pageAdminInteractionDetail, title: "Admin · Prompt detail" },
  { path: /^#\/admin\/projects\/?$/, render: pageAdminProjects, title: "Admin · All projects", sub: "Cross-tenant view" }
];

async function router() {
  const hash = normalizePath(location.hash);
  setState((s) => ({ ...s, ui: { ...s.ui, page: hash } }));
  stopAllPollers(); // every page is responsible for restarting its own pollers

  // Hard auth gate — without a token, render only the auth screen and don't
  // even try to fetch /health or the page data (every protected route will 401).
  if (!getAuthToken()) {
    renderAuthScreen();
    return;
  }

  for (const route of ROUTE_TABLE) {
    const match = hash.match(route.path);
    if (match) {
      const params = match.slice(1);
      renderTopbar(route.title, route.sub);
      const root = $("#page-root");
      mount(root, h("div", { class: "page" }, h(Skeleton, { variant: "title" })));
      try {
        await route.render(root, ...params);
      } catch (err) {
        mount(root, ErrorBanner({ error: err }));
      }
      renderSidebar();
      return;
    }
  }
  // Not found
  renderTopbar("Not found");
  mount(
    $("#page-root"),
    h("div", { class: "page" }, Empty({ title: "Route not found", hint: "The page you tried to open does not exist.", action: h("a", { class: "btn btn--primary", href: "#/" }, "Back to dashboard") }))
  );
}

/* ============================================================
   13) PAGE: Dashboard
   ============================================================ */

async function pageDashboard(root) {
  // Skip the skeleton flash on revisits — if state already holds analytics +
  // report data from a previous load, render that immediately so the user
  // doesn't see the page collapse to skeleton/refill on every navigation back.
  const cachedState = getState();
  const cachedAnalytics = cachedState.analytics?.data || null;
  const cachedReport = cachedState.report?.data || null;
  if (cachedAnalytics && cachedReport) {
    mount(root, renderDashboardBody(cachedAnalytics, cachedReport));
  } else {
    mount(
      root,
      h(
        "div",
        { class: "page" },
        h(
          "div",
          { class: "page-header" },
          h(
            "div",
            null,
            h("h1", { class: "page-header__title" }, "Dashboard"),
            h("p", { class: "page-header__sub" }, "System overview · live operational metrics")
          ),
          h(
            "div",
            { class: "page-header__actions" },
            h(
              "a",
              { class: "btn btn--primary", href: "#/builder" },
              icon("plus", 14),
              "Generate workflow"
            )
          )
        ),
        h(
          "div",
          { class: "kpi-grid" },
          Array.from({ length: 4 }).map(() => h("div", { class: "kpi" }, Skeleton({ variant: "title" }), Skeleton({ variant: "block" })))
        )
      )
    );
  }

  let analytics = null, report = null, projectError = null;
  try {
    [analytics, report] = await Promise.all([api.analytics(), api.projects.report({ limit: 200 })]);
    setState((s) => ({
      ...s,
      analytics: { data: analytics, loading: false, error: null, lastFetched: Date.now() },
      report: { data: report, loading: false, error: null, lastFetched: Date.now() }
    }));
  } catch (err) {
    projectError = err;
  }

  if (projectError) {
    mount(root, h("div", { class: "page" }, ErrorBanner({ error: projectError, onRetry: () => router() })));
    return;
  }

  mount(root, renderDashboardBody(analytics, report));

  // periodic refresh — keep this above the unreachable code below
  startPoller("dashboard", {
    intervalMs: 30000,
    fn: () => Promise.all([api.analytics(), api.projects.report({ limit: 200 })]),
    onResult: ([a, r]) => {
      setState((s) => ({
        ...s,
        analytics: { ...s.analytics, data: a, lastFetched: Date.now() },
        report: { ...s.report, data: r, lastFetched: Date.now() }
      }));
      // Skip the re-render entirely if the user has navigated away or if the
      // payload is unchanged. The latter is the most common case (analytics
      // changes only when a workflow runs), so this prevents the visible
      // flash the user complained about.
      if (normalizePath(location.hash) !== "#/") return;
      const lastSig = root.dataset.dashSig || "";
      const nextSig = dashboardSignature(a, r);
      if (lastSig === nextSig) return;
      root.dataset.dashSig = nextSig;
      mount(root, renderDashboardBody(a, r));
    },
    onError: () => {}
  });
  // Stamp the initial render's signature so the first poll tick can compare.
  root.dataset.dashSig = dashboardSignature(analytics, report);
}

/**
 * Stable signature of the dashboard payload. We compare this between polls so
 * we only re-mount the DOM when something actually changed — without it the
 * 15s tick caused a visible refresh on every interval even when totals,
 * workflow health, and recommended actions were identical.
 */
function dashboardSignature(analytics, report) {
  const overview = analytics?.overview || {};
  const items = report?.items || [];
  const itemsKey = items
    .map((it) =>
      [
        it.project_id,
        it.lifecycle_state,
        it.health_status,
        it.missing_credentials_count || 0,
        it.recommended_action || ""
      ].join("|")
    )
    .join(";");
  const wh = Array.isArray(analytics?.workflows_health) ? analytics.workflows_health : [];
  const whKey = wh
    .map((w) => [w.project_id, w.is_working ? 1 : 0, w.failed_runs, w.unresolved_alerts].join("|"))
    .join(";");
  return [
    overview.total_projects,
    overview.total_workflows,
    overview.total_runs,
    overview.failed_runs,
    overview.success_rate,
    overview.healthy_workflows,
    overview.unhealthy_workflows,
    overview.unresolved_alerts,
    itemsKey,
    whKey
  ].join("::");
}

/**
 * Pure body renderer for the dashboard. Returns the page element so callers
 * can mount it without going through pageDashboard's skeleton + fetch flow.
 * Used by both the initial render (after fetch) and the poller (on data change).
 */
function renderDashboardBody(analytics, report) {
  const overview = analytics?.overview || {};
  const items = report?.items || [];
  const workflowsHealth = Array.isArray(analytics?.workflows_health) ? analytics.workflows_health : [];

  const projectsHealth = items.map((it) => {
    const wh = workflowsHealth.find((w) => w.project_id === it.project_id) || null;
    const isWorking =
      wh
        ? wh.is_working === true
        : it.health_status === "healthy" && (it.missing_credentials_count || 0) === 0;
    return {
      project_id: it.project_id,
      project_name: it.project_name,
      lifecycle: it.lifecycle_state,
      health: it.health_status,
      missing_credentials: it.missing_credentials_count || 0,
      n8n_active: it.n8n_active,
      recommended_action: it.recommended_action,
      total_runs: wh?.total_runs ?? 0,
      failed_runs: wh?.failed_runs ?? 0,
      unresolved_alerts: wh?.unresolved_alerts ?? 0,
      last_run_status: wh?.last_run_status ?? "unknown",
      is_working: Boolean(isWorking)
    };
  });

  projectsHealth.sort((a, b) => {
    const score = (p) => (p.is_working ? 0 : (p.unresolved_alerts > 0 || p.failed_runs > 0 ? 2 : 1));
    return score(b) - score(a);
  });

  const recentActivity = (items.flatMap((it) => it.recommended_action ? [{
    project: it.project_name, projectId: it.project_id, action: it.recommended_action,
    health: it.health_status, lifecycle: it.lifecycle_state
  }] : [])).slice(0, 8);

  const successSeries = items
    .slice(0, 12)
    .map((it) => Math.max(0, Math.round((it.required_credentials_count - it.missing_credentials_count) * 10)));

  return h(
    "div",
    { class: "page" },
      h(
        "div",
        { class: "page-header" },
        h(
          "div",
          null,
          h("h1", { class: "page-header__title" }, "Dashboard"),
          h(
            "p",
            { class: "page-header__sub" },
            "System overview · ",
            h("span", { class: "muted" }, fmtRelative(report?.generated_at))
          )
        ),
        h(
          "div",
          { class: "page-header__actions" },
          h("a", { class: "btn btn--ghost", href: "#/events" }, icon("events", 14), "Live events"),
          h("a", { class: "btn btn--primary", href: "#/builder" }, icon("plus", 14), "New automation")
        )
      ),
      h(
        "div",
        { class: "kpi-grid" },
        Kpi({
          label: "Total projects",
          value: overview.total_projects ?? "—",
          hint: `${overview.total_workflows ?? 0} workflows`,
          sparkline: successSeries.length ? Sparkline(successSeries, { stroke: "var(--accent)" }) : null
        }),
        Kpi({
          label: "Success rate",
          value: fmtPct(overview.success_rate),
          hint: `${overview.total_runs ?? 0} runs · ${overview.failed_runs ?? 0} failed`,
          tone: overview.success_rate >= 95 ? "up" : overview.success_rate < 80 ? "down" : null
        }),
        Kpi({
          label: "Healthy workflows",
          value: overview.healthy_workflows ?? "—",
          hint: `${overview.unhealthy_workflows ?? 0} unhealthy`
        }),
        Kpi({
          label: "Open alerts",
          value: overview.unresolved_alerts ?? 0,
          hint: overview.unresolved_alerts > 0 ? "Investigate failing workflows" : "All clear",
          tone: overview.unresolved_alerts > 0 ? "down" : "up"
        })
      ),
      h(
        "div",
        { class: "split-2" },
        h(
          "section",
          { class: "card card--flush" },
          h(
            "div",
            { class: "card__head" },
            h("div", null,
              h("h2", { class: "card__title" }, "Recent activity"),
              h("p", { class: "card__subtitle" }, "Recommended actions across all projects")
            ),
            h("a", { class: "btn btn--ghost btn--sm", href: "#/projects" }, "View all", icon("chevronRight", 14))
          ),
          recentActivity.length === 0
            ? h("div", { class: "card__body" }, Empty({ title: "Nothing to act on", hint: "All projects are in a healthy state. Recommended actions appear here when something needs attention." }))
            : h(
                "ul",
                { class: "col" },
                recentActivity.map((a) =>
                  h(
                    "li",
                    {
                      class: "card",
                      style: { borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0, padding: "12px 20px" }
                    },
                    h(
                      "div",
                      { class: "row row--gap-3" },
                      Badge({ tone: healthTone(a.health), text: a.health, dot: true }),
                      h(
                        "a",
                        { class: "flex-1 truncate", href: `#/projects/${encodeURIComponent(a.projectId)}` },
                        a.project
                      ),
                      Badge({ tone: lifecycleTone(a.lifecycle), text: lifecycleLabel(a.lifecycle) })
                    ),
                    h("div", { class: "text-sm muted", style: { marginTop: 4 } }, a.action)
                  )
                )
              )
        ),
        h(
          "section",
          { class: "card card--flush" },
          h(
            "div",
            { class: "card__head" },
            h(
              "div",
              null,
              h("h3", { class: "card__title" }, "Workflow health"),
              h("p", { class: "card__subtitle" }, "Working / not-working, surfaced from runs + alerts")
            ),
            h("a", { class: "btn btn--ghost btn--sm", href: "#/projects" }, "All projects", icon("chevronRight", 14))
          ),
          projectsHealth.length === 0
            ? h("div", { class: "card__body" }, h("div", { class: "muted text-sm" }, "No projects yet."))
            : h(
                "ul",
                null,
                projectsHealth.slice(0, 8).map((p) => {
                  const tone = p.is_working ? "ok" : (p.unresolved_alerts > 0 || p.failed_runs > 0 ? "bad" : "warn");
                  const label = p.is_working
                    ? "working"
                    : (p.unresolved_alerts > 0 || p.failed_runs > 0 ? "failing" : "needs attention");
                  return h(
                    "li",
                    { style: { padding: "12px 20px", borderTop: "1px solid var(--border)" } },
                    h(
                      "div",
                      { class: "row row--gap-3" },
                      Badge({ tone, text: label, dot: true }),
                      h(
                        "a",
                        { href: `#/projects/${encodeURIComponent(p.project_id)}`, class: "flex-1 truncate" },
                        p.project_name
                      ),
                      p.unresolved_alerts > 0
                        ? Badge({ tone: "bad", text: `${p.unresolved_alerts} alert${p.unresolved_alerts === 1 ? "" : "s"}` })
                        : null,
                      p.failed_runs > 0
                        ? Badge({ tone: "warn", text: `${p.failed_runs}/${p.total_runs} failed` })
                        : null,
                      p.missing_credentials > 0
                        ? Badge({ tone: "warn", text: `${p.missing_credentials} cred missing` })
                        : null
                    ),
                    !p.is_working && p.recommended_action
                      ? h("p", { class: "muted text-sm", style: { margin: "6px 0 0" } }, p.recommended_action)
                      : null
                  );
                })
              )
        )
      )
    )
  ;
}

/* ============================================================
   14) PAGE: AI Builder
   ============================================================ */

let chatAbortController = null;

async function pageBuilder(root) {
  function render() {
    const s = getState();
    const chat = s.chat;

    const messagesEl = h(
      "div",
      { class: "chat-stream" },
      chat.messages.length === 0 && !chat.generating
        ? Empty({
            icon: "builder",
            title: "Describe the automation you need",
            hint: "Tell me what should trigger it, what it should do, and where the data should go. The AI generates a validated n8n workflow."
          })
        : chat.messages.map((m) =>
            h(
              "div",
              { class: ["chat-message", m.role === "ai" && "chat-message--ai"] },
              h("div", { class: "chat-message__avatar" }, m.role === "user" ? "U" : "AI"),
              h(
                "div",
                { class: "chat-message__body" },
                h("div", { class: "chat-message__role" }, `${m.role} · ${fmtRelative(m.ts)}`),
                h("div", { class: "chat-message__content" }, m.content)
              )
            )
          )
    );

    if (chat.generating) {
      messagesEl.appendChild(
        h(
          "div",
          { class: "chat-progress" },
          h("span", { class: "spinner" }),
          h("span", null, chat.progressText || "Generating workflow…")
        )
      );
    }

    if (chat.error) {
      messagesEl.appendChild(ErrorBanner({ error: chat.error }));
    }

    const composer = h(
      "form",
      {
        class: "chat-composer",
        onsubmit: (e) => {
          e.preventDefault();
          const input = composer.querySelector("textarea");
          const value = input.value.trim();
          if (!value) return;
          submitChat(value);
        }
      },
      h("textarea", {
        class: "textarea",
        rows: 4,
        placeholder: "Example: Every Monday at 9am, fetch new Stripe charges from the last 7 days, summarize them with the AI, and post to Slack.",
        disabled: chat.generating,
        oninput: (e) => {
          if (e.target.value.length > 8000) e.target.value = e.target.value.slice(0, 8000);
        }
      }),
      h(
        "div",
        { class: "chat-composer__row" },
        h(
          "div",
          { class: "chat-composer__hint" },
          // For RAG-enabled users the agent has its own server-side prompt +
          // KB, so detailed user-prompt structure matters less. Keep the
          // credential warning regardless — that's a security rule, not a
          // prompt-engineering tip.
          getCachedAuthUser()?.can_use_rag_agent
            ? h(
                "span",
                { class: "row row--gap-3" },
                Badge({ tone: "accent", text: "RAG agent", dot: true }),
                h("span", null, "The platform agent handles intent + node selection — describe the goal in plain language. Avoid pasting credentials.")
              )
            : "Tip: include the trigger, the actions, and the destination. Avoid pasting credentials."
        ),
        h(
          "div",
          { class: "row" },
          chat.generating
            ? h(
                "button",
                {
                  type: "button",
                  class: "btn btn--ghost",
                  onclick: () => chatAbortController?.abort()
                },
                icon("stop", 14),
                "Cancel"
              )
            : null,
          h(
            "button",
            { type: "submit", class: "btn btn--primary", disabled: chat.generating },
            icon("play", 14),
            chat.generating ? "Generating…" : "Generate workflow"
          )
        )
      )
    );

    const left = h("section", { class: "chat-panel" }, messagesEl, composer);

    const result = chat.lastResult;
    const previewBody = !result
      ? Empty({
          title: "Workflow preview",
          hint: "Once you generate a workflow, you'll see its name, description, validation status, and node list here."
        })
      : h(
          "div",
          { class: "col col--gap-4" },
          h(
            "div",
            { class: "row row--gap-3" },
            Badge({
              tone: result.validation?.valid ? "ok" : "bad",
              text: result.validation?.valid ? "validated" : "rejected",
              dot: true
            }),
            h(
              "a",
              { class: "btn btn--ghost btn--sm", href: `#/projects/${encodeURIComponent(result.project_id)}` },
              "Open project ",
              icon("chevronRight", 14)
            )
          ),
          h("h3", { style: { margin: 0 } }, result.project_name || "Generated workflow"),
          h("p", { class: "muted text-sm" }, result.description),
          !result.validation?.valid && Array.isArray(result.validation?.errors)
            ? h(
                "div",
                null,
                h("h4", { class: "text-sm" }, "Validation errors"),
                h(
                  "ul",
                  { class: "col" },
                  result.validation.errors.map((e) => h("li", { class: "error-banner text-xs" }, escapeHtml(e)))
                )
              )
            : null,
          h(
            "div",
            null,
            h("h4", { class: "text-sm", style: { marginTop: 12 } }, "Nodes"),
            result.workflow?.nodes?.length
              ? h(
                  "div",
                  { class: "node-list" },
                  result.workflow.nodes.map((node, idx) =>
                    h(
                      "div",
                      { class: "node-card" },
                      h("div", { class: "node-card__index" }, idx + 1),
                      h(
                        "div",
                        { class: "node-card__main" },
                        h("div", { class: "node-card__name" }, node.name),
                        h("div", { class: "node-card__type" }, `${node.type}@${node.typeVersion ?? "?"}`)
                      ),
                      Array.isArray(result.required_credentials) && node.credentials
                        ? Badge({ tone: "warn", text: "credentials", dot: true })
                        : null
                    )
                  )
                )
              : h("div", { class: "muted text-sm" }, "No nodes returned.")
          ),
          h(
            "details",
            null,
            h("summary", { style: { cursor: "pointer", color: "var(--fg-muted)" } }, "View raw workflow JSON"),
            jsonHighlight(result.workflow)
          )
        );

    const right = h(
      "section",
      { class: "preview-panel" },
      h(
        "div",
        { class: "preview-panel__head" },
        h("h2", { style: { margin: 0, fontSize: "var(--fs-lg)" } }, "Workflow preview")
      ),
      h("div", { class: "preview-panel__body" }, previewBody)
    );

    mount(
      root,
      h(
        "div",
        { class: "page" },
        h(
          "div",
          { class: "page-header" },
          h(
            "div",
            null,
            h("h1", { class: "page-header__title" }, "AI Builder"),
            h("p", { class: "page-header__sub" }, "Describe the workflow and I'll generate it for you")
          )
        ),
        h("div", { class: "builder" }, left, right)
      )
    );
  }

  const unsub = subscribe((s) => {
    if (normalizePath(location.hash) === "#/builder") render();
  });
  // re-render on route change to remove subscription
  window.addEventListener("hashchange", () => unsub(), { once: true });

  render();
}

async function submitChat(message) {
  setState((s) => ({
    ...s,
    chat: {
      ...s.chat,
      messages: [...s.chat.messages, { role: "user", content: message, ts: new Date().toISOString() }],
      generating: true,
      progressText: "Sending request to AI…",
      error: null
    }
  }));

  // simulate progress phases (UI feedback) — backend is single-shot
  const phaseTimer = startPhaseTimer((label) => {
    setState((s) => ({ ...s, chat: { ...s.chat, progressText: label } }));
  });

  chatAbortController = new AbortController();
  try {
    const result = await api.chat.send(message, chatAbortController.signal);
    phaseTimer.stop();
    setState((s) => ({
      ...s,
      chat: {
        ...s.chat,
        messages: [
          ...s.chat.messages,
          {
            role: "ai",
            content: result.validation?.valid
              ? `Workflow “${result.project_name}” generated successfully (${result.workflow?.nodes?.length ?? 0} nodes).`
              : `Workflow generated but rejected by validation (${result.validation?.errors?.length ?? 0} errors).`,
            ts: new Date().toISOString()
          }
        ],
        generating: false,
        progressText: "",
        lastResult: result,
        error: null
      }
    }));
    toast(result.validation?.valid ? "Workflow generated" : "Workflow rejected by validator", result.validation?.valid ? "success" : "warning");
  } catch (err) {
    phaseTimer.stop();
    if (err?.name === "AbortError") {
      setState((s) => ({ ...s, chat: { ...s.chat, generating: false, progressText: "", error: null } }));
      toast("Generation cancelled", "info");
      return;
    }
    setState((s) => ({ ...s, chat: { ...s.chat, generating: false, progressText: "", error: err } }));
    toast(err.message || "Workflow generation failed", "error");
  } finally {
    chatAbortController = null;
  }
}

function startPhaseTimer(onPhase) {
  const phases = [
    [0, "Sending request to AI…"],
    [3000, "AI is selecting nodes…"],
    [9000, "Building workflow JSON…"],
    [18000, "Validating security and structure…"],
    [30000, "Still working — large workflows can take ~45s…"]
  ];
  const timers = phases.map(([delay, label]) => setTimeout(() => onPhase(label), delay));
  return { stop: () => timers.forEach(clearTimeout) };
}

/* ============================================================
   15) PAGE: Projects (list)
   ============================================================ */

async function pageProjects(root) {
  let q = "";
  let lifecycleFilter = "all";
  let report;

  async function load() {
    setState((s) => ({ ...s, report: { ...s.report, loading: true, error: null } }));
    try {
      report = await api.projects.report({ limit: 500 });
      setState((s) => ({ ...s, report: { data: report, loading: false, error: null, lastFetched: Date.now() } }));
      render();
    } catch (err) {
      setState((s) => ({ ...s, report: { ...s.report, loading: false, error: err } }));
      mount(root, h("div", { class: "page" }, ErrorBanner({ error: err, onRetry: load })));
    }
  }

  function filtered() {
    const items = report?.items || [];
    return items.filter((it) => {
      if (q) {
        const needle = q.toLowerCase();
        if (!it.project_name?.toLowerCase().includes(needle) && !it.project_id?.toLowerCase().includes(needle)) return false;
      }
      if (lifecycleFilter !== "all") {
        if (lifecycleFilter === "failing" && it.health_status !== "failing") return false;
        if (lifecycleFilter === "warning" && it.health_status !== "warning") return false;
        if (
          lifecycleFilter !== "failing" &&
          lifecycleFilter !== "warning" &&
          it.lifecycle_state !== lifecycleFilter
        ) return false;
      }
      return true;
    });
  }

  function render() {
    const items = filtered();
    const totals = report?.totals || {};

    mount(
      root,
      h(
        "div",
        { class: "page" },
        h(
          "div",
          { class: "page-header" },
          h(
            "div",
            null,
            h("h1", { class: "page-header__title" }, "Projects"),
            h(
              "p",
              { class: "page-header__sub" },
              `${items.length} of ${totals.projects ?? 0} · last refresh ${fmtRelative(report?.generated_at)}`
            )
          ),
          h(
            "div",
            { class: "page-header__actions" },
            h("a", { class: "btn btn--primary", href: "#/builder" }, icon("plus", 14), "New automation"),
            h("button", { class: "btn btn--ghost", onclick: load }, icon("refresh", 14), "Refresh")
          )
        ),
        h(
          "div",
          { class: "kpi-grid" },
          Kpi({ label: "Active", value: totals.deployed_active ?? 0, tone: "small" }),
          Kpi({ label: "Inactive", value: totals.deployed_inactive ?? 0, tone: "small" }),
          Kpi({ label: "Validated", value: totals.validated ?? 0, tone: "small" }),
          Kpi({ label: "Rejected", value: totals.rejected ?? 0, tone: "small" }),
          Kpi({ label: "Failing", value: totals.failing ?? 0, tone: "small" }),
          Kpi({ label: "Warnings", value: totals.warnings ?? 0, tone: "small" })
        ),
        h(
          "div",
          { class: "toolbar" },
          h(
            "div",
            { class: "input-wrap", style: { width: 320 } },
            h("span", { class: "input-wrap__icon" }, icon("search", 14)),
            h("input", {
              class: "input input--with-icon",
              placeholder: "Search projects…",
              value: q,
              oninput: (e) => { q = e.target.value; render(); }
            })
          ),
          h(
            "select",
            {
              class: "select",
              style: { width: 200 },
              onchange: (e) => { lifecycleFilter = e.target.value; render(); }
            },
            [
              ["all", "All states"],
              ["deployed_active", "Active"],
              ["deployed_inactive", "Inactive"],
              ["validated", "Validated"],
              ["rejected", "Rejected"],
              ["missing_in_n8n", "Missing in n8n"],
              ["failing", "Failing"],
              ["warning", "With warnings"]
            ].map(([v, l]) => h("option", { value: v, selected: v === lifecycleFilter }, l))
          ),
          h("div", { class: "toolbar__spacer" })
        ),
        h(
          "div",
          { class: "card card--flush" },
          items.length === 0
            ? Empty({
                title: q || lifecycleFilter !== "all" ? "No matching projects" : "No projects yet",
                hint: "Generate your first automation from the AI Builder.",
                action: h("a", { class: "btn btn--primary", href: "#/builder" }, "Generate workflow")
              })
            : h(
                "div",
                { class: "table-wrap" },
                h(
                  "table",
                  { class: "table table--row-actions" },
                  h(
                    "thead",
                    null,
                    h(
                      "tr",
                      null,
                      h("th", null, "Project"),
                      h("th", null, "Lifecycle"),
                      h("th", null, "Health"),
                      h("th", null, "n8n"),
                      h("th", null, "Credentials"),
                      h("th", null, "Recommended"),
                      h("th", { style: { width: 1 } }, "")
                    )
                  ),
                  h(
                    "tbody",
                    null,
                    items.map((it) =>
                      h(
                        "tr",
                        {
                          onclick: () => { location.hash = `#/projects/${encodeURIComponent(it.project_id)}`; }
                        },
                        h(
                          "td",
                          null,
                          h(
                            "div",
                            { class: "cell-stack" },
                            h("span", { class: "cell-stack__primary" }, it.project_name),
                            h("span", { class: "cell-stack__secondary mono" }, it.project_id.slice(0, 8))
                          )
                        ),
                        h("td", null, Badge({ tone: lifecycleTone(it.lifecycle_state), text: lifecycleLabel(it.lifecycle_state) })),
                        h("td", null, Badge({ tone: healthTone(it.health_status), text: it.health_status, dot: true })),
                        h(
                          "td",
                          null,
                          it.n8n_workflow_id
                            ? it.n8n_active
                              ? Badge({ tone: "ok", text: "active" })
                              : Badge({ tone: "warn", text: "inactive" })
                            : Badge({ tone: "neutral", text: "—" })
                        ),
                        h(
                          "td",
                          null,
                          it.missing_credentials_count > 0
                            ? Badge({ tone: "bad", text: `${it.missing_credentials_count} missing` })
                            : it.required_credentials_count > 0
                              ? Badge({ tone: "ok", text: "ok" })
                              : Badge({ tone: "neutral", text: "—" })
                        ),
                        h("td", null, h("span", { class: "muted text-sm truncate" }, it.recommended_action || "—")),
                        h(
                          "td",
                          null,
                          h(
                            "a",
                            {
                              class: "btn btn--ghost btn--sm btn--icon",
                              href: `#/projects/${encodeURIComponent(it.project_id)}`,
                              onclick: (e) => e.stopPropagation()
                            },
                            icon("chevronRight", 14)
                          )
                        )
                      )
                    )
                  )
                )
              )
        )
      )
    );
  }

  await load();
  startPoller("projects-list", {
    intervalMs: 20000,
    fn: () => api.projects.report({ limit: 500 }),
    onResult: (data) => { report = data; if (normalizePath(location.hash) === "#/projects") render(); },
    onError: () => {}
  });
}

/* ============================================================
   16) PAGE: Project detail (tabs)
   ============================================================ */

async function pageProjectDetail(root, projectId) {
  let activeTab = (location.hash.split("?")[1] && new URLSearchParams(location.hash.split("?")[1]).get("tab")) || "overview";
  let snapshot = null, bindings = null, preflight = null, healthData = null, activity = null, executions = null, executionDetail = null;
  let messages = null;          // /projects/:id/messages
  let workflowStatus = null;    // /workflows/:workflowId/status
  let workflowRaw = null;       // /projects/:id/workflow
  let loadingTab = false;

  function setTab(tab) {
    activeTab = tab;
    const sp = new URLSearchParams({ tab });
    history.replaceState(null, "", `#/projects/${encodeURIComponent(projectId)}?${sp.toString()}`);
    render();
    loadTab(tab);
  }

  async function loadAll() {
    try {
      [snapshot, bindings] = await Promise.all([
        api.projects.get(projectId),
        api.projects.bindings.get(projectId).catch(() => null)
      ]);
      setState((s) => ({ ...s, detail: { ...s.detail, projectId, snapshot, bindings } }));
    } catch (err) {
      mount(root, h("div", { class: "page" }, ErrorBanner({ error: err, onRetry: loadAll })));
      return;
    }
    render();
    loadTab(activeTab);
  }

  async function loadTab(tab) {
    if (loadingTab) return;
    loadingTab = true;
    try {
      if (tab === "overview" && snapshot?.workflow) {
        try {
          preflight = await api.projects.deployCheck(projectId);
        } catch (err) {
          if (err.code !== "WORKFLOW_REJECTED") throw err;
          preflight = null;
        }
      } else if (tab === "executions") {
        executions = await api.projects.executions(projectId, { limit: 30 });
      } else if (tab === "events") {
        activity = await api.projects.events(projectId, { limit: 100 });
      } else if (tab === "monitoring") {
        const tasks = [api.projects.health(projectId)];
        if (snapshot?.workflow?.id) tasks.push(api.workflows.status(snapshot.workflow.id).catch(() => null));
        const [hd, ws] = await Promise.all(tasks);
        healthData = hd;
        if (snapshot?.workflow?.id) workflowStatus = ws;
      } else if (tab === "chat") {
        messages = await api.projects.messages(projectId);
      } else if (tab === "logs") {
        if (snapshot?.workflow) {
          workflowRaw = await api.projects.workflow(projectId).catch(() => null);
        }
      } else if (tab === "credentials") {
        // bindings already loaded; preflight gives requirements
        if (snapshot?.workflow && snapshot.workflow.status !== "rejected") {
          preflight = await api.projects.deployCheck(projectId).catch(() => null);
        }
      }
    } catch (err) {
      toast(err.message || "Failed to load tab", "error");
    } finally {
      loadingTab = false;
      render();
    }
    // Set up polling for the executions/events/monitoring tabs
    if (tab === "events") {
      startPoller(`pd:${projectId}:events`, {
        intervalMs: 8000,
        fn: () => api.projects.events(projectId, { limit: 100 }),
        onResult: (d) => { activity = d; if (activeTab === "events") render(); },
        onError: () => {}
      });
    } else stopPoller(`pd:${projectId}:events`);
    if (tab === "executions") {
      startPoller(`pd:${projectId}:exec`, {
        intervalMs: 15000,
        fn: () => api.projects.executions(projectId, { limit: 30 }),
        onResult: (d) => { executions = d; if (activeTab === "executions") render(); },
        onError: () => {}
      });
    } else stopPoller(`pd:${projectId}:exec`);
    if (tab === "monitoring") {
      startPoller(`pd:${projectId}:health`, {
        intervalMs: 20000,
        fn: () => api.projects.health(projectId),
        onResult: (d) => { healthData = d; if (activeTab === "monitoring") render(); },
        onError: () => {}
      });
    } else stopPoller(`pd:${projectId}:health`);
  }

  function render() {
    if (!snapshot) {
      mount(root, h("div", { class: "page" }, h(Skeleton, { variant: "title" }), h(Skeleton, { variant: "block" })));
      return;
    }
    const project = snapshot.project;
    const workflow = snapshot.workflow;
    const tabs = ["overview", "executions", "events", "credentials", "monitoring", "chat", "logs"];
    renderTopbar(project.name, "Project detail");

    mount(
      root,
      h(
        "div",
        { class: "page" },
        h(
          "div",
          { class: "page-header" },
          h(
            "div",
            null,
            h(
              "div",
              { class: "row row--gap-3" },
              h("a", { class: "muted text-sm", href: "#/projects" }, "Projects"),
              icon("chevronRight", 12),
              h("span", null, project.name)
            ),
            h("h1", { class: "page-header__title", style: { marginTop: 6 } }, project.name),
            h("p", { class: "page-header__sub" }, project.description || "—")
          ),
          h(
            "div",
            { class: "page-header__actions" },
            workflow
              ? Badge({
                  tone: lifecycleTone(workflow.status),
                  text: lifecycleLabel(workflow.status),
                  dot: true
                })
              : Badge({ tone: "neutral", text: "no workflow" }),
            workflow?.n8n_workflow_id && (preflight?.n8n_workflow_url || healthData?.n8n_workflow_url)
              ? h(
                  "a",
                  {
                    class: "btn btn--ghost btn--sm",
                    href: preflight?.n8n_workflow_url || healthData?.n8n_workflow_url,
                    target: "_blank",
                    rel: "noopener"
                  },
                  icon("external", 14),
                  "Open in n8n"
                )
              : null,
            h(
              "button",
              {
                class: "btn btn--ghost btn--sm",
                onclick: async () => {
                  try {
                    await api.projects.refreshHealth(projectId);
                    toast("Health refreshed", "success");
                    loadTab(activeTab);
                  } catch (err) {
                    toast(err.message, "error");
                  }
                }
              },
              icon("refresh", 14),
              "Refresh health"
            ),
            h(
              "button",
              {
                class: "btn btn--ghost btn--sm",
                onclick: () =>
                  openModal(
                    ConfirmDialog({
                      title: "Delete automation?",
                      message:
                        "This deletes the local project, workflow, chat history, health snapshots, alerts, events, and the linked n8n workflow (if any). This cannot be undone.",
                      confirmLabel: "Delete",
                      danger: true,
                      onConfirm: async () => {
                        const r = await api.projects.delete(projectId);
                        toast("Project deleted", "success");
                        location.hash = "#/projects";
                        if (r.cleanup_warnings?.length) {
                          toast(`${r.cleanup_warnings.length} cleanup warning(s) — see console`, "warning");
                          console.warn("Cleanup warnings", r.cleanup_warnings);
                        }
                      }
                    })
                  )
              },
              icon("trash", 14),
              "Delete"
            )
          )
        ),
        h(
          "div",
          { class: "tabs" },
          ...tabs.map((t) =>
            h(
              "button",
              {
                class: "tab",
                "aria-selected": activeTab === t ? "true" : "false",
                onclick: () => setTab(t)
              },
              t.charAt(0).toUpperCase() + t.slice(1)
            )
          )
        ),
        renderTabBody()
      )
    );
  }

  function renderTabBody() {
    const workflow = snapshot.workflow;
    if (activeTab === "overview") return renderOverviewTab(workflow);
    if (activeTab === "executions") return renderExecutionsTab();
    if (activeTab === "events") return renderEventsTab();
    if (activeTab === "credentials") return renderCredentialsTab();
    if (activeTab === "monitoring") return renderMonitoringTab();
    if (activeTab === "chat") return renderChatTab();
    if (activeTab === "logs") return renderLogsTab(workflow);
    return null;
  }

  function renderChatTab() {
    if (!messages) return h(Skeleton, { variant: "block" });
    const list = messages.messages || [];
    if (list.length === 0) return Empty({ title: "No chat history", hint: "This project has no chat messages yet." });
    return h(
      "div",
      { class: "chat-stream", style: { padding: 0, maxHeight: "70vh" } },
      list.map((m) =>
        h(
          "div",
          { class: ["chat-message", m.role === "ai" && "chat-message--ai"] },
          h("div", { class: "chat-message__avatar" }, m.role === "user" ? "U" : "AI"),
          h(
            "div",
            { class: "chat-message__body" },
            h("div", { class: "chat-message__role" }, `${m.role} · ${fmtRelative(m.created_at)}`),
            m.role === "ai"
              ? renderAiMessageContent(m.content)
              : h("div", { class: "chat-message__content" }, m.content)
          )
        )
      )
    );
  }

  function renderAiMessageContent(content) {
    // AI messages are JSON-serialized payloads (project_name/description/workflow/validation).
    // Show a compact summary by default, raw JSON in a collapsible details block.
    let parsed = null;
    try { parsed = JSON.parse(content); } catch { /* keep as plain text */ }
    if (!parsed || typeof parsed !== "object") {
      return h("div", { class: "chat-message__content" }, content);
    }
    const valid = parsed.validation?.valid;
    const errs = parsed.validation?.errors || [];
    return h(
      "div",
      { class: "chat-message__content col col--gap-3" },
      h(
        "div",
        { class: "row row--gap-3" },
        Badge({ tone: valid ? "ok" : "bad", text: valid ? "validated" : "rejected", dot: true }),
        h("strong", null, parsed.project_name || "AI response")
      ),
      parsed.description ? h("div", { class: "muted text-sm" }, parsed.description) : null,
      !valid && errs.length
        ? h("ul", { class: "col" }, errs.slice(0, 5).map((e) => h("li", { class: "text-xs muted" }, "• ", String(e))))
        : null,
      parsed.workflow?.nodes
        ? h("div", { class: "text-xs muted" }, `${parsed.workflow.nodes.length} node(s)`)
        : null,
      h(
        "details",
        null,
        h("summary", { style: { cursor: "pointer", color: "var(--fg-muted)", fontSize: "var(--fs-xs)" } }, "Raw payload"),
        jsonHighlight(parsed)
      )
    );
  }

  function renderOverviewTab(workflow) {
    if (!workflow) {
      return Empty({ title: "No workflow yet", hint: "This project has no workflow attached.", action: h("a", { class: "btn btn--primary", href: "#/builder" }, "Create one") });
    }
    const canDeployInactive = preflight?.can_deploy_inactive;
    const canActivate = preflight?.can_activate;
    const canRedeploy = preflight?.can_redeploy;
    const missing = preflight?.missing_credentials || [];

    return h(
      "div",
      { class: "col col--gap-4" },
      h(
        "div",
        { class: "kpi-grid" },
        Kpi({ label: "Status", value: lifecycleLabel(workflow.status), tone: "small" }),
        Kpi({
          label: "Last deployed",
          value: workflow.last_deployed_at ? fmtRelative(workflow.last_deployed_at) : "—",
          hint: workflow.last_deployed_at ? fmtDate(workflow.last_deployed_at) : null,
          tone: "small"
        }),
        Kpi({
          label: "Last activated",
          value: workflow.last_activated_at ? fmtRelative(workflow.last_activated_at) : "—",
          hint: workflow.last_activated_at ? fmtDate(workflow.last_activated_at) : null,
          tone: "small"
        }),
        Kpi({
          label: "Nodes",
          value: workflow.json?.nodes?.length ?? 0,
          tone: "small"
        })
      ),
      preflight ? null : h("div", { class: "muted text-sm" }, h(Skeleton, { variant: "text" })),
      missing.length > 0
        ? h(
            "div",
            { class: "error-banner" },
            icon("alert", 16),
            h("span", { class: "flex-1" }, `${missing.length} required credential(s) missing — bind them before activating.`),
            h(
              "a",
              { class: "btn btn--ghost btn--sm", href: "javascript:void(0)", onclick: (e) => { e.preventDefault(); setTab("credentials"); } },
              "Fix"
            )
          )
        : null,
      h(
        "div",
        { class: "row row--gap-3" },
        h(
          "button",
          {
            class: "btn btn--primary",
            disabled: !canDeployInactive,
            onclick: () => doDeploy({ activate: false })
          },
          icon("deploy", 14),
          "Deploy as inactive"
        ),
        h(
          "button",
          {
            class: "btn btn--success",
            disabled: !canActivate,
            onclick: () => doDeploy({ activate: true })
          },
          icon("play", 14),
          "Deploy & activate"
        ),
        canRedeploy
          ? h("button", { class: "btn btn--ghost", onclick: () => doDeploy({ activate: workflow.status === "deployed_active" }) }, icon("refresh", 14), "Redeploy")
          : null,
        workflow.status === "rejected"
          ? h(
              "button",
              {
                class: "btn btn--ghost",
                onclick: async () => {
                  try {
                    await api.projects.fix(projectId);
                    toast("Fix attempt completed", "success");
                    await loadAll();
                  } catch (err) { toast(err.message, "error"); }
                }
              },
              icon("settings", 14),
              "AI fix"
            )
          : null
      ),
      h(
        "div",
        { class: "card card--flush" },
        h("div", { class: "card__head" }, h("h3", { class: "card__title" }, "Workflow nodes")),
        h(
          "div",
          { class: "card__body" },
          h(
            "div",
            { class: "node-list" },
            (workflow.json?.nodes || []).map((node, idx) =>
              h(
                "div",
                { class: "node-card" },
                h("div", { class: "node-card__index" }, idx + 1),
                h(
                  "div",
                  { class: "node-card__main" },
                  h("div", { class: "node-card__name" }, node.name),
                  h("div", { class: "node-card__type" }, `${node.type}@${node.typeVersion ?? "?"}`)
                ),
                node.credentials ? Badge({ tone: "warn", text: "credentials", dot: true }) : null
              )
            )
          )
        )
      )
    );
  }

  async function doDeploy({ activate }) {
    try {
      const result = await api.projects.deploy(projectId, { activate });
      toast(`Deployed${activate ? " & activated" : " (inactive)"}`, "success");
      await loadAll();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  function renderExecutionsTab() {
    if (!executions) return h(Skeleton, { variant: "block" });
    const items = executions.executions || [];
    if (items.length === 0) return Empty({ title: "No executions yet", hint: "Once the workflow runs, results will appear here." });
    return h(
      "div",
      { class: "card card--flush" },
      h(
        "div",
        { class: "table-wrap" },
        h(
          "table",
          { class: "table" },
          h(
            "thead",
            null,
            h(
              "tr",
              null,
              h("th", null, "Time"),
              h("th", null, "Status"),
              h("th", null, "Duration"),
              h("th", null, "Mode"),
              h("th", null, "Failed node"),
              h("th", null, "Error"),
              h("th", { style: { width: 1 } }, "")
            )
          ),
          h(
            "tbody",
            null,
            items.map((ex) =>
              h(
                "tr",
                null,
                h(
                  "td",
                  null,
                  h(
                    "div",
                    { class: "cell-stack" },
                    h("span", { class: "cell-stack__primary" }, fmtDate(ex.started_at)),
                    h("span", { class: "cell-stack__secondary" }, fmtRelative(ex.started_at))
                  )
                ),
                h(
                  "td",
                  null,
                  Badge({
                    tone: isSuccessExecutionStatus(ex.status) ? "ok" : isFailureExecutionStatus(ex.status) ? "bad" : "neutral",
                    text: ex.status,
                    dot: true
                  })
                ),
                h("td", null, fmtDuration(ex.duration_ms)),
                h("td", null, h("span", { class: "mono text-xs" }, ex.mode || "—")),
                h("td", null, h("span", { class: "truncate" }, ex.failed_node || "—")),
                h("td", null, h("span", { class: "truncate muted text-sm", style: { maxWidth: 320, display: "inline-block" } }, parseN8nError(ex.error_message).summary)),
                h(
                  "td",
                  null,
                  h(
                    "button",
                    {
                      class: "btn btn--ghost btn--sm",
                      onclick: async () => {
                        try {
                          executionDetail = await api.projects.execution(projectId, ex.id);
                          openModal({
                            title: `Execution ${ex.id}`,
                            body: jsonHighlight(executionDetail),
                            actions: [h("button", { class: "btn btn--primary", onclick: closeModal }, "Close")]
                          });
                        } catch (err) { toast(err.message, "error"); }
                      }
                    },
                    "Inspect"
                  )
                )
              )
            )
          )
        )
      )
    );
  }

  function renderEventsTab() {
    if (!activity) return h(Skeleton, { variant: "block" });
    const items = activity.items || [];
    if (items.length === 0) return Empty({ title: "No events yet", hint: "Workflow events arrive here as they happen." });
    return renderEventsList(items, { selectable: true });
  }

  function renderCredentialsTab() {
    const reqs = preflight?.requirements || [];
    const stored = bindings?.bindings || [];
    const storedByKey = new Map(stored.map((b) => [`${b.node_id || ""}|${b.credential_type}`, b]));

    function setBinding(req, value) {
      const key = `${req.node_id}|${req.credential_type}`;
      const v = String(value || "").trim();
      if (!v) {
        storedByKey.delete(key);
      } else {
        const existing = storedByKey.get(key) || {};
        storedByKey.set(key, {
          ...existing,
          node_id: req.node_id,
          node_name: req.node_name,
          credential_type: req.credential_type,
          id: v.startsWith("id:") ? v.slice(3) : undefined,
          name: !v.startsWith("id:") ? v : undefined
        });
      }
    }

    async function save() {
      const payload = Array.from(storedByKey.values()).filter((b) => b.id || b.name);
      try {
        await api.projects.bindings.save(projectId, payload);
        toast("Credential bindings saved", "success");
        await loadAll();
        await loadTab("credentials");
      } catch (err) { toast(err.message, "error"); }
    }

    if (snapshot.workflow?.status === "rejected") {
      return Empty({ title: "Workflow rejected", hint: "Fix validation errors first; credentials can't be bound on a rejected workflow." });
    }

    return h(
      "div",
      { class: "col col--gap-4" },
      preflight?.credentials_source_ok === false
        ? ErrorBanner({ error: "Could not reach n8n credentials API. Live binding suggestions unavailable." })
        : null,
      reqs.length === 0
        ? Empty({ title: "No credentials required", hint: "This workflow doesn't need any credential bindings." })
        : h(
            "div",
            { class: "col col--gap-3" },
            reqs.map((req) => {
              const existing = storedByKey.get(`${req.node_id}|${req.credential_type}`);
              const initial = existing?.id ? `id:${existing.id}` : (existing?.name || "");
              return h(
                "div",
                { class: "card" },
                h(
                  "div",
                  { class: "row row--gap-3" },
                  h("div", { class: "flex-1" },
                    h("div", { style: { fontWeight: 500 } }, req.node_name),
                    h("div", { class: "mono text-xs muted" }, req.credential_type)
                  ),
                  Badge({
                    tone: req.resolved ? "ok" : "bad",
                    text: req.resolved ? "resolved" : "missing",
                    dot: true
                  })
                ),
                h("p", { class: "muted text-sm", style: { marginTop: 8 } }, req.manual_message),
                h(
                  "div",
                  { class: "row row--gap-3", style: { marginTop: 12 } },
                  h(
                    "select",
                    {
                      class: "select",
                      style: { flex: 1 },
                      onchange: (e) => setBinding(req, e.target.value)
                    },
                    h("option", { value: "" }, "— Pick from n8n —"),
                    (req.available_credentials || []).map((c) =>
                      h("option", { value: `id:${c.id}`, selected: existing?.id === c.id }, `${c.name} (${c.id.slice(0, 6)})`)
                    )
                  ),
                  h("input", {
                    class: "input",
                    placeholder: "or type credential name",
                    value: existing?.name || "",
                    style: { flex: 1 },
                    oninput: (e) => setBinding(req, e.target.value)
                  })
                )
              );
            })
          ),
      h(
        "div",
        { class: "row row--gap-3" },
        h(
          "a",
          {
            class: "btn btn--ghost",
            href: preflight?.n8n_credentials_url || "#",
            target: "_blank",
            rel: "noopener"
          },
          icon("external", 14),
          "Open n8n credentials"
        ),
        reqs.length > 0
          ? h("button", { class: "btn btn--primary", onclick: save }, icon("check", 14), "Save bindings")
          : null
      )
    );
  }

  function renderMonitoringTab() {
    if (!healthData) return h(Skeleton, { variant: "block" });
    return h(
      "div",
      { class: "col col--gap-4" },
      h(
        "div",
        { class: "kpi-grid" },
        Kpi({ label: "Health", value: healthData.health_status || "unknown", tone: "small" }),
        Kpi({ label: "Recent successes", value: healthData.recent_success_count ?? 0, tone: "small" }),
        Kpi({ label: "Recent failures", value: healthData.recent_failure_count ?? 0, tone: "small" }),
        Kpi({
          label: "Last success",
          value: healthData.last_success_at ? fmtRelative(healthData.last_success_at) : "—",
          tone: "small"
        })
      ),
      healthData.last_error
        ? h(
            "div",
            { class: "card" },
            h("h3", { style: { marginTop: 0 } }, "Last error"),
            healthData.last_error.error_type
              ? Badge({ tone: severityTone(healthData.last_error.severity), text: healthData.last_error.error_type })
              : null,
            healthData.last_error.failed_node ? h("p", null, h("strong", null, "Failed node: "), healthData.last_error.failed_node) : null,
            healthData.last_error.human_message ? h("p", { class: "muted" }, healthData.last_error.human_message) : null,
            healthData.last_error.raw_message ? ErrorDetail({ raw: healthData.last_error.raw_message }) : null
          )
        : null,
      healthData.recommended_action
        ? h("div", { class: "error-banner", style: { background: "var(--accent-soft)", color: "var(--fg)", borderColor: "var(--border)" } }, icon("info", 16), h("span", { class: "flex-1" }, healthData.recommended_action))
        : null,
      // Workflow run stats + alerts + AI suggestion (from /workflows/:id/status)
      workflowStatus
        ? h(
            "div",
            { class: "col col--gap-4" },
            h(
              "div",
              { class: "kpi-grid" },
              Kpi({ label: "Total runs", value: workflowStatus.metrics?.total_runs ?? 0, tone: "small" }),
              Kpi({ label: "Failed runs", value: workflowStatus.metrics?.failed_runs ?? 0, tone: "small" }),
              Kpi({ label: "Success rate", value: fmtPct(workflowStatus.metrics?.success_rate), tone: "small" }),
              Kpi({ label: "Avg duration", value: fmtDuration(workflowStatus.metrics?.average_duration_ms), tone: "small" })
            ),
            (workflowStatus.alerts || []).length
              ? h(
                  "div",
                  { class: "card card--flush" },
                  h(
                    "div",
                    { class: "card__head" },
                    h("h3", { class: "card__title" }, "Open alerts"),
                    Badge({ tone: "bad", text: workflowStatus.alerts.length })
                  ),
                  h(
                    "ul",
                    null,
                    workflowStatus.alerts.map((a) =>
                      h(
                        "li",
                        { style: { padding: "10px 20px", borderTop: "1px solid var(--border)" } },
                        h(
                          "div",
                          { class: "row row--gap-3" },
                          Badge({ tone: severityTone(a.severity), text: a.severity }),
                          h("span", { class: "flex-1" }, a.alert_type),
                          h("span", { class: "text-xs muted" }, fmtRelative(a.last_seen_at))
                        ),
                        h("div", { style: { margin: "4px 0 0" } }, ErrorDetail({ raw: a.message })),
                        a.recommended_action
                          ? h("p", { class: "text-xs", style: { margin: "4px 0 0" } }, h("strong", null, "Action: "), a.recommended_action)
                          : null,
                        a.failed_node ? h("div", { class: "text-xs muted" }, h("strong", null, "Failed node: "), a.failed_node) : null
                      )
                    )
                  )
                )
              : null,
            (workflowStatus.recent_errors || []).length
              ? h(
                  "div",
                  { class: "card card--flush" },
                  h("div", { class: "card__head" }, h("h3", { class: "card__title" }, "Recent errors")),
                  h(
                    "ul",
                    null,
                    workflowStatus.recent_errors.map((e) =>
                      h(
                        "li",
                        { style: { padding: "10px 20px", borderTop: "1px solid var(--border)" } },
                        h("div", { class: "text-xs muted" }, fmtDate(e.created_at), e.node_name ? ` · ${e.node_name}` : ""),
                        ErrorDetail({ raw: e.error_message })
                      )
                    )
                  )
                )
              : null,
            workflowStatus.ai_suggestion
              ? h(
                  "div",
                  { class: "card" },
                  h(
                    "div",
                    { class: "row row--gap-3" },
                    Badge({ tone: "accent", text: "AI suggestion", dot: true }),
                    h("span", { class: "text-xs muted" }, fmtRelative(workflowStatus.ai_suggestion.created_at))
                  ),
                  h("h4", { style: { margin: "8px 0" } }, workflowStatus.ai_suggestion.issue),
                  h("p", { class: "muted" }, workflowStatus.ai_suggestion.reason),
                  h(
                    "div",
                    { class: "code-block", style: { whiteSpace: "pre-wrap" } },
                    workflowStatus.ai_suggestion.solution
                  )
                )
              : null
          )
        : null
    );
  }

  function renderLogsTab(workflow) {
    if (!workflow) return Empty({ title: "No workflow", hint: "Logs are available once a workflow exists." });
    const downloadFromRaw = () => {
      const data = workflowRaw?.json ?? workflow.json;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(snapshot.project.name || "workflow").replace(/\s+/g, "_")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
    return h(
      "div",
      { class: "col col--gap-4" },
      h(
        "div",
        { class: "row row--gap-3" },
        h(
          "button",
          { class: "btn btn--ghost btn--sm", onclick: downloadFromRaw },
          icon("external", 14),
          "Download workflow JSON"
        ),
        workflowRaw === null
          ? h("span", { class: "text-xs muted" }, "Latest workflow record fetched")
          : h("span", { class: "text-xs muted" }, "From /projects/:id/workflow")
      ),
      h(
        "div",
        { class: "card" },
        h("h3", { style: { marginTop: 0 } }, "Workflow JSON"),
        jsonHighlight(workflowRaw?.json ?? workflow.json)
      ),
      workflow.validation_errors?.length
        ? h(
            "div",
            { class: "card" },
            h("h3", { style: { marginTop: 0 } }, "Validation errors"),
            h(
              "ul",
              { class: "col" },
              workflow.validation_errors.map((e) => h("li", { class: "error-banner" }, escapeHtml(e)))
            )
          )
        : null
    );
  }

  await loadAll();
}


/* ============================================================
   17) PAGE: Workflows (filtered view of report)
   ============================================================ */

async function pageWorkflows(root) {
  let report;
  let q = "";
  let status = "all";

  async function load() {
    try {
      report = await api.projects.report({ limit: 500 });
      render();
    } catch (err) {
      mount(root, h("div", { class: "page" }, ErrorBanner({ error: err, onRetry: load })));
    }
  }

  function items() {
    const all = (report?.items || []).filter((it) => it.workflow_id);
    return all.filter((it) => {
      if (status !== "all" && it.workflow_status !== status) return false;
      if (q) {
        const needle = q.toLowerCase();
        if (!it.project_name.toLowerCase().includes(needle) && !(it.workflow_id || "").includes(needle)) return false;
      }
      return true;
    });
  }

  function render() {
    if (!report) {
      mount(root, h("div", { class: "page" }, h(Skeleton, { variant: "block" })));
      return;
    }
    const list = items();
    const totals = report.totals || {};

    mount(
      root,
      h(
        "div",
        { class: "page" },
        h(
          "div",
          { class: "page-header" },
          h(
            "div",
            null,
            h("h1", { class: "page-header__title" }, "Workflows"),
            h(
              "p",
              { class: "page-header__sub" },
              `${list.length} workflow(s) · ${totals.deployed_active || 0} active · ${totals.failing || 0} failing`
            )
          ),
          h(
            "div",
            { class: "page-header__actions" },
            h("button", { class: "btn btn--ghost", onclick: load }, icon("refresh", 14), "Refresh")
          )
        ),
        h(
          "div",
          { class: "toolbar" },
          h(
            "div",
            { class: "input-wrap", style: { width: 320 } },
            h("span", { class: "input-wrap__icon" }, icon("search", 14)),
            h("input", { class: "input input--with-icon", placeholder: "Search…", value: q, oninput: (e) => { q = e.target.value; render(); } })
          ),
          h(
            "select",
            { class: "select", style: { width: 200 }, onchange: (e) => { status = e.target.value; render(); } },
            ...["all", "draft", "validated", "rejected", "deployed_inactive", "deployed_active", "failed"].map((v) =>
              h("option", { value: v, selected: v === status }, v === "all" ? "All workflows" : lifecycleLabel(v))
            )
          )
        ),
        h(
          "div",
          { class: "card card--flush" },
          list.length === 0
            ? Empty({ title: "No workflows match", hint: "Try changing the filters or generate a new automation." })
            : h(
                "div",
                { class: "table-wrap" },
                h(
                  "table",
                  { class: "table table--row-actions" },
                  h(
                    "thead",
                    null,
                    h(
                      "tr",
                      null,
                      h("th", null, "Workflow"),
                      h("th", null, "Status"),
                      h("th", null, "Health"),
                      h("th", null, "n8n"),
                      h("th", null, "Recommended"),
                      h("th", { style: { width: 1 } }, "")
                    )
                  ),
                  h(
                    "tbody",
                    null,
                    list.map((it) =>
                      h(
                        "tr",
                        { onclick: () => { location.hash = `#/projects/${encodeURIComponent(it.project_id)}`; } },
                        h(
                          "td",
                          null,
                          h(
                            "div",
                            { class: "cell-stack" },
                            h("span", { class: "cell-stack__primary" }, it.project_name),
                            h("span", { class: "cell-stack__secondary mono" }, (it.workflow_id || "").slice(0, 8))
                          )
                        ),
                        h("td", null, Badge({ tone: lifecycleTone(it.workflow_status), text: lifecycleLabel(it.workflow_status) })),
                        h("td", null, Badge({ tone: healthTone(it.health_status), text: it.health_status, dot: true })),
                        h("td", null, it.n8n_workflow_id ? Badge({ tone: it.n8n_active ? "ok" : "warn", text: it.n8n_active ? "active" : "inactive" }) : Badge({ tone: "neutral", text: "—" })),
                        h("td", null, h("span", { class: "muted text-sm truncate" }, it.recommended_action || "—")),
                        h("td", null, icon("chevronRight", 14))
                      )
                    )
                  )
                )
              )
        )
      )
    );
  }

  await load();
  startPoller("workflows", {
    intervalMs: 20000,
    fn: () => api.projects.report({ limit: 500 }),
    onResult: (d) => { report = d; if (normalizePath(location.hash) === "#/workflows") render(); },
    onError: () => {}
  });
}

/* ============================================================
   18) PAGE: Events (live feed)
   ============================================================ */

async function pageEvents(root) {
  let projects = [];
  let projectId = "all";
  let severity = "all";
  let eventType = "all";
  let q = "";
  let paused = false;
  let aggregate = []; // newest first
  let selectedId = null;
  let inflight = false;

  async function bootstrapProjects() {
    try {
      const r = await api.projects.report({ limit: 500 });
      projects = (r.items || []).filter((it) => it.workflow_id);
    } catch {
      projects = [];
    }
  }

  async function tick() {
    if (paused || inflight) return;
    inflight = true;
    try {
      let merged;
      if (projectId === "all") {
        // Fetch a small window per project that has a workflow.
        const slice = projects.slice(0, 20); // cap to 20 to keep it cheap
        const responses = await Promise.all(
          slice.map((p) =>
            api.projects.events(p.project_id, { limit: 25 }).catch(() => null)
          )
        );
        merged = [];
        responses.forEach((r, idx) => {
          const items = r?.items || [];
          for (const it of items) merged.push({ ...it, _project_id: slice[idx].project_id, _project_name: slice[idx].project_name });
        });
        merged.sort((a, b) => new Date(b.event_time) - new Date(a.event_time));
      } else {
        const r = await api.projects.events(projectId, { limit: 100 });
        const proj = projects.find((p) => p.project_id === projectId);
        merged = (r.items || []).map((it) => ({ ...it, _project_id: projectId, _project_name: proj?.project_name || projectId }));
      }
      aggregate = merged.slice(0, 250);
      render();
    } catch {
      // ignore polling errors
    } finally {
      inflight = false;
    }
  }

  function filtered() {
    return aggregate.filter((it) => {
      if (severity !== "all") {
        const sev = it.severity || (it.event_type?.includes("fail") ? "high" : "low");
        if (sev !== severity) return false;
      }
      if (eventType !== "all" && it.event_type !== eventType) return false;
      if (q) {
        const needle = q.toLowerCase();
        const haystack = `${it.event_type} ${it.message || ""} ${it._project_name || ""}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }

  function eventTone(it) {
    const t = (it.event_type || "").toLowerCase();
    if (t.includes("fail") || t.includes("rejected") || t.includes("alert_created")) return "failure";
    if (t.includes("succeeded") || t.includes("validated") || t.includes("alert_resolved") || t.includes("activated") || t.includes("execution_success")) return "success";
    if (t.includes("warning")) return "warning";
    return "info";
  }

  function uniqueEventTypes() {
    return Array.from(new Set(aggregate.map((it) => it.event_type))).sort();
  }

  function selectedEvent() {
    return filtered().find((it) => it.id === selectedId) || filtered()[0] || null;
  }

  function render() {
    const list = filtered();
    const sel = selectedEvent();

    mount(
      root,
      h(
        "div",
        { class: "page" },
        h(
          "div",
          { class: "page-header" },
          h(
            "div",
            null,
            h("h1", { class: "page-header__title" }, "Events"),
            h(
              "p",
              { class: "page-header__sub" },
              `Live feed · ${list.length} of ${aggregate.length} shown · refreshes every 6s`
            )
          ),
          h(
            "div",
            { class: "page-header__actions" },
            h(
              "span",
              { class: ["live-pill", paused && "live-pill--paused"] },
              h("span", { class: "live-pill__dot" }),
              paused ? "Paused" : "Live"
            ),
            h(
              "button",
              { class: "btn btn--ghost btn--sm", onclick: () => { paused = !paused; render(); if (!paused) tick(); } },
              icon(paused ? "play" : "stop", 14),
              paused ? "Resume" : "Pause"
            ),
            h("button", { class: "btn btn--ghost btn--sm", onclick: tick }, icon("refresh", 14), "Refresh")
          )
        ),
        h(
          "div",
          { class: "toolbar" },
          h(
            "select",
            { class: "select", style: { width: 240 }, onchange: (e) => { projectId = e.target.value; selectedId = null; aggregate = []; tick(); } },
            h("option", { value: "all" }, "All projects"),
            ...projects.map((p) => h("option", { value: p.project_id, selected: projectId === p.project_id }, p.project_name))
          ),
          h(
            "select",
            { class: "select", style: { width: 160 }, onchange: (e) => { severity = e.target.value; render(); } },
            ...["all", "high", "medium", "low"].map((v) => h("option", { value: v, selected: severity === v }, v === "all" ? "All severities" : v))
          ),
          h(
            "select",
            { class: "select", style: { width: 240 }, onchange: (e) => { eventType = e.target.value; render(); } },
            h("option", { value: "all" }, "All event types"),
            ...uniqueEventTypes().map((t) => h("option", { value: t, selected: eventType === t }, t))
          ),
          h(
            "div",
            { class: "input-wrap flex-1", style: { minWidth: 240 } },
            h("span", { class: "input-wrap__icon" }, icon("search", 14)),
            h("input", { class: "input input--with-icon", placeholder: "Search events…", value: q, oninput: (e) => { q = e.target.value; render(); } })
          )
        ),
        list.length === 0
          ? Empty({ title: "No events yet", hint: "Events appear here as workflows run, deploy, fail, or recover. Try generating a workflow first." })
          : h(
              "div",
              { class: "events-grid" },
              h(
                "div",
                { class: "events-list scrollbar-thin" },
                list.map((ev) =>
                  h(
                    "div",
                    {
                      class: ["event-row", `event-row--${eventTone(ev)}`, sel?.id === ev.id && "is-selected"],
                      onclick: () => { selectedId = ev.id; render(); }
                    },
                    h(
                      "div",
                      { class: "event-row__head" },
                      h("span", { class: "event-row__type" }, ev.event_type),
                      h("span", { class: "event-row__time" }, fmtRelative(ev.event_time))
                    ),
                    h("div", { class: "row row--gap-3" },
                      Badge({ tone: severityTone(ev.severity), text: ev.severity || "info" }),
                      ev._project_name ? h("span", { class: "muted text-xs truncate" }, ev._project_name) : null
                    ),
                    ev.message ? h("div", { class: "event-row__msg" }, parseN8nError(ev.message).summary) : null
                  )
                )
              ),
              sel
                ? h(
                    "div",
                    { class: "card col col--gap-3" },
                    h(
                      "div",
                      { class: "row row--gap-3" },
                      Badge({ tone: severityTone(sel.severity), text: sel.severity || "info" }),
                      h("h3", { style: { margin: 0, flex: 1 } }, sel.event_type),
                      h("span", { class: "muted text-sm" }, fmtDate(sel.event_time))
                    ),
                    sel.message ? ErrorDetail({ raw: sel.message }) : null,
                    sel.failed_node ? h("p", null, h("strong", null, "Failed node: "), sel.failed_node) : null,
                    sel.recommended_action ? h("p", { class: "muted" }, h("strong", null, "Recommended: "), sel.recommended_action) : null,
                    sel._project_id ? h("a", { class: "btn btn--ghost btn--sm", href: `#/projects/${encodeURIComponent(sel._project_id)}` }, "Open project ", icon("chevronRight", 14)) : null,
                    h("h4", { class: "text-sm" }, "Metadata"),
                    jsonHighlight(sel.metadata || {})
                  )
                : Empty({ title: "Select an event", hint: "Click a row on the left to inspect." })
            )
      )
    );
  }

  render(); // initial skeleton
  await bootstrapProjects();
  await tick();
  startPoller("events-page", {
    intervalMs: 6000,
    fn: tick,
    onResult: () => {},
    onError: () => {}
  });
}

/* ============================================================
   19) PAGE: Analytics
   ============================================================ */

async function pageAnalytics(root) {
  let analytics, report;
  try {
    [analytics, report] = await Promise.all([api.analytics(), api.projects.report({ limit: 500 })]);
  } catch (err) {
    mount(root, h("div", { class: "page" }, ErrorBanner({ error: err, onRetry: () => router() })));
    return;
  }

  const overview = analytics.overview || {};
  const wh = analytics.workflows_health || [];
  const items = report.items || [];
  const lifecycleCounts = items.reduce(
    (acc, it) => {
      acc[it.lifecycle_state] = (acc[it.lifecycle_state] || 0) + 1;
      return acc;
    },
    {}
  );
  const lifecycleLabels = ["validated", "deployed_inactive", "deployed_active", "rejected", "missing_in_n8n", "no_workflow"];
  const lifecycleValues = lifecycleLabels.map((l) => lifecycleCounts[l] || 0);

  const failingTop = wh
    .filter((w) => w.failed_runs > 0)
    .sort((a, b) => b.failed_runs - a.failed_runs)
    .slice(0, 8);

  mount(
    root,
    h(
      "div",
      { class: "page" },
      h(
        "div",
        { class: "page-header" },
        h(
          "div",
          null,
          h("h1", { class: "page-header__title" }, "Analytics"),
          h("p", { class: "page-header__sub" }, "Aggregate metrics across all workflows")
        ),
        h("div", { class: "page-header__actions" }, h("button", { class: "btn btn--ghost", onclick: () => router() }, icon("refresh", 14), "Refresh"))
      ),
      h(
        "div",
        { class: "kpi-grid" },
        Kpi({ label: "Success rate", value: fmtPct(overview.success_rate), hint: `${overview.total_runs ?? 0} runs total` }),
        Kpi({ label: "Avg duration", value: fmtDuration(overview.average_duration_ms), hint: "across run_succeeded and run_failed" }),
        Kpi({ label: "Failed runs", value: overview.failed_runs ?? 0, tone: overview.failed_runs > 0 ? "down" : "up" }),
        Kpi({ label: "Open alerts", value: overview.unresolved_alerts ?? 0, tone: overview.unresolved_alerts > 0 ? "down" : "up" })
      ),
      h(
        "div",
        { class: "split-2" },
        h(
          "div",
          { class: "chart-card" },
          h("h3", { class: "chart-card__title" }, "Lifecycle distribution"),
          BarChart(lifecycleValues, lifecycleLabels.map((l) => lifecycleLabel(l)))
        ),
        h(
          "div",
          { class: "card card--flush" },
          h("div", { class: "card__head" }, h("h3", { class: "card__title" }, "Top failing workflows")),
          failingTop.length === 0
            ? h("div", { class: "card__body" }, h("div", { class: "muted text-sm" }, "No failing workflows in the last window."))
            : h(
                "ul",
                null,
                failingTop.map((w) =>
                  h(
                    "li",
                    { style: { padding: "10px 20px", borderTop: "1px solid var(--border)" } },
                    h(
                      "a",
                      { href: `#/projects/${encodeURIComponent(w.project_id)}`, class: "row row--gap-3" },
                      h("span", { class: "flex-1 truncate" }, w.project_name),
                      Badge({ tone: "bad", text: `${w.failed_runs} failed` }),
                      w.unresolved_alerts > 0 ? Badge({ tone: "warn", text: `${w.unresolved_alerts} alerts` }) : null
                    )
                  )
                )
              )
        )
      ),
      h(
        "div",
        { class: "card card--flush" },
        h("div", { class: "card__head" }, h("h3", { class: "card__title" }, "Run breakdown by workflow")),
        h(
          "div",
          { class: "table-wrap" },
          h(
            "table",
            { class: "table" },
            h(
              "thead",
              null,
              h("tr", null,
                h("th", null, "Workflow"),
                h("th", null, "Status"),
                h("th", null, "Total runs"),
                h("th", null, "Failed"),
                h("th", null, "Alerts")
              )
            ),
            h(
              "tbody",
              null,
              wh.map((w) =>
                h(
                  "tr",
                  { onclick: () => { location.hash = `#/projects/${encodeURIComponent(w.project_id)}`; }, style: { cursor: "pointer" } },
                  h("td", null, w.project_name),
                  h("td", null, Badge({ tone: w.is_working ? "ok" : "bad", text: w.last_run_status || "unknown", dot: true })),
                  h("td", null, w.total_runs),
                  h("td", null, w.failed_runs),
                  h("td", null, w.unresolved_alerts > 0 ? Badge({ tone: "warn", text: w.unresolved_alerts }) : "—")
                )
              )
            )
          )
        )
      )
    )
  );

  startPoller("analytics", {
    intervalMs: 20000,
    fn: () => api.analytics(),
    onResult: () => { if (normalizePath(location.hash) === "#/analytics") pageAnalytics(root); },
    onError: () => {}
  });
}

/* ============================================================
   20) Generic events list (used by detail tab)
   ============================================================ */

function renderEventsList(items, { selectable = false } = {}) {
  return h(
    "div",
    { class: "events-list scrollbar-thin", style: { maxHeight: "60vh" } },
    items.map((ev) => {
      const tone = (ev.event_type || "").toLowerCase().includes("fail")
        ? "failure"
        : (ev.event_type || "").toLowerCase().includes("succeed") || (ev.event_type || "").toLowerCase().includes("validated") || (ev.event_type || "").toLowerCase().includes("execution_success")
          ? "success"
          : (ev.event_type || "").toLowerCase().includes("warning")
            ? "warning"
            : "info";
      const node = h(
        "details",
        { class: ["event-row", `event-row--${tone}`] },
        h(
          "summary",
          { style: { cursor: "pointer", listStyle: "none" } },
          h(
            "div",
            { class: "event-row__head" },
            h("span", { class: "event-row__type" }, ev.event_type),
            h("span", { class: "event-row__time" }, fmtRelative(ev.event_time))
          ),
          ev.message ? h("div", { class: "event-row__msg" }, parseN8nError(ev.message).summary) : null
        ),
        ev.message ? h("div", { style: { marginTop: 8 } }, ErrorDetail({ raw: ev.message, label: "Show error details" })) : null,
        ev.recommended_action ? h("p", { class: "muted text-sm", style: { marginTop: 8 } }, h("strong", null, "Recommended: "), ev.recommended_action) : null,
        ev.failed_node ? h("p", { class: "text-sm" }, h("strong", null, "Failed node: "), ev.failed_node) : null,
        h("h4", { class: "text-xs muted", style: { textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 12 } }, "Metadata"),
        jsonHighlight(ev.metadata || {})
      );
      return node;
    })
  );
}

/* ============================================================
   20a) PAGE: Credentials (n8n credential inventory + provisioning)
   ============================================================ */

async function pageCredentials(root) {
  let credentials = null;
  let credentialsError = null;
  let projects = [];
  let q = "";
  let typeFilter = "all";
  let policyMode = null;
  let n8nCredentialsUrl = null;

  async function load() {
    try {
      [credentials, projects] = await Promise.all([
        api.n8n.credentials(),
        api.projects.report({ limit: 500 }).then((r) => (r.items || []).filter((it) => it.workflow_id))
      ]);
      // try to derive n8n_credentials_url from any project's report row
      const sampleProject = projects.find((p) => p.n8n_credentials_url);
      n8nCredentialsUrl = sampleProject?.n8n_credentials_url ?? null;
      // Detect provisioning mode by attempting a no-op create call? Avoided — read via /health was empty.
      // Use a heuristic: read the page's deploy-check on first project to surface n8n_credentials_url.
      render();
    } catch (err) {
      credentialsError = err;
      render();
    }
  }

  function uniqueTypes() {
    return Array.from(new Set((credentials?.items || []).map((c) => c.type))).sort();
  }
  function filtered() {
    return (credentials?.items || []).filter((c) => {
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (q) {
        const needle = q.toLowerCase();
        const haystack = `${c.name} ${c.type} ${c.id}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }

  async function showSchema(type) {
    let schema;
    try {
      schema = await api.n8n.credentialSchema(type);
    } catch (err) {
      toast(err.message, "error");
      return;
    }
    openModal({
      title: `Credential schema · ${schema.label || type}`,
      body: h(
        "div",
        { class: "col col--gap-3" },
        h(
          "div",
          { class: "row row--gap-3" },
          Badge({ tone: "accent", text: type }),
          Badge({
            tone: schema.provisioning_mode === "manual" ? "warn" : "ok",
            text: `${schema.provisioning_mode} provisioning`,
            dot: true
          })
        ),
        schema.manual_message
          ? h("p", { class: "muted text-sm" }, schema.manual_message)
          : null,
        Array.isArray(schema.fields) && schema.fields.length
          ? h(
              "div",
              null,
              h("h4", { class: "text-sm" }, "Fields"),
              h(
                "ul",
                null,
                schema.fields.map((f) =>
                  h(
                    "li",
                    { class: "text-sm", style: { padding: "4px 0" } },
                    h("strong", null, f.label || f.name),
                    " · ",
                    h("span", { class: "mono text-xs" }, `${f.type}${f.required ? " (required)" : ""}`)
                  )
                )
              )
            )
          : h("p", { class: "muted text-sm" }, "No fields published — provision in n8n directly."),
        h("h4", { class: "text-sm" }, "Raw"),
        jsonHighlight(schema)
      ),
      actions: [h("button", { class: "btn btn--primary", onclick: closeModal }, "Close")]
    });
  }

  function openCreateForm() {
    if (projects.length === 0) {
      toast("Create a project first — credential creation requires an associated workflow.", "warning");
      return;
    }
    let formProjectId = projects[0].project_id;
    let formType = uniqueTypes()[0] || "";
    let formName = "";
    let formData = "{\n}";

    const renderForm = () =>
      h(
        "div",
        { class: "col col--gap-3" },
        h("p", { class: "muted text-sm" },
          "Backend supports two modes: ",
          h("code", null, "manual_only"),
          " (default — returns 409 with link to n8n) and ",
          h("code", null, "hybrid"),
          ". This form posts to /n8n/credentials and surfaces whatever the backend returns."
        ),
        h(
          "div",
          { class: "field" },
          h("label", { class: "field__label" }, "Project (must already have a workflow)"),
          h(
            "select",
            { class: "select", onchange: (e) => (formProjectId = e.target.value) },
            ...projects.map((p) =>
              h("option", { value: p.project_id, selected: p.project_id === formProjectId }, p.project_name)
            )
          )
        ),
        h(
          "div",
          { class: "field" },
          h("label", { class: "field__label" }, "Credential type"),
          h("input", {
            class: "input",
            placeholder: "e.g. telegramApi, gmailOAuth2Api",
            value: formType,
            oninput: (e) => (formType = e.target.value)
          })
        ),
        h(
          "div",
          { class: "field" },
          h("label", { class: "field__label" }, "Credential name"),
          h("input", {
            class: "input",
            placeholder: "Display name for this credential in n8n",
            value: formName,
            oninput: (e) => (formName = e.target.value)
          })
        ),
        h(
          "div",
          { class: "field" },
          h("label", { class: "field__label" }, "Credential data (JSON)"),
          h("textarea", {
            class: "textarea",
            rows: 6,
            value: formData,
            oninput: (e) => (formData = e.target.value)
          })
        )
      );

    openModal({
      title: "Create n8n credential",
      body: renderForm(),
      actions: [
        h("button", { class: "btn btn--ghost", onclick: closeModal }, "Cancel"),
        h(
          "button",
          {
            class: "btn btn--primary",
            onclick: async () => {
              let parsed;
              try {
                parsed = JSON.parse(formData || "{}");
                if (typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("data must be an object");
              } catch (err) {
                toast("Credential data must be valid JSON object: " + err.message, "error");
                return;
              }
              try {
                await api.n8n.createCredential({
                  project_id: formProjectId,
                  type: formType.trim(),
                  name: formName.trim(),
                  data: parsed
                });
                toast("Credential created", "success");
                closeModal();
                load();
              } catch (err) {
                if (err.code === "CREDENTIAL_MANUAL_ONLY") {
                  policyMode = "manual_only";
                  const dashUrl = err.details?.n8n_credentials_url;
                  toast("Backend is manual-only — open n8n to create the credential.", "warning");
                  closeModal();
                  openModal({
                    title: "Manual provisioning required",
                    body: h(
                      "div",
                      { class: "col col--gap-3" },
                      h("p", null, "Credential provisioning is set to ", h("code", null, "manual_only"), " on the backend. Create or complete the credential inside n8n, then bind it from the project's Credentials tab."),
                      dashUrl ? h("a", { class: "btn btn--primary", href: dashUrl, target: "_blank", rel: "noopener" }, icon("external", 14), "Open n8n credentials") : null
                    ),
                    actions: [h("button", { class: "btn btn--ghost", onclick: closeModal }, "Close")]
                  });
                  return;
                }
                if (err.code === "CREDENTIAL_TYPE_NOT_REQUIRED") {
                  toast("That type isn't required by the selected workflow.", "error");
                  return;
                }
                toast(err.message, "error");
              }
            }
          },
          "Create"
        )
      ]
    });
  }

  function render() {
    if (credentialsError) {
      mount(root, h("div", { class: "page" }, ErrorBanner({ error: credentialsError, onRetry: load })));
      return;
    }
    if (!credentials) {
      mount(root, h("div", { class: "page" }, h(Skeleton, { variant: "title" }), h(Skeleton, { variant: "block" })));
      return;
    }
    const items = filtered();

    mount(
      root,
      h(
        "div",
        { class: "page" },
        h(
          "div",
          { class: "page-header" },
          h(
            "div",
            null,
            h("h1", { class: "page-header__title" }, "Credentials"),
            h(
              "p",
              { class: "page-header__sub" },
              `${credentials.count} credential(s) registered in n8n${policyMode ? ` · provisioning: ${policyMode}` : ""}`
            )
          ),
          h(
            "div",
            { class: "page-header__actions" },
            n8nCredentialsUrl
              ? h(
                  "a",
                  { class: "btn btn--ghost", href: n8nCredentialsUrl, target: "_blank", rel: "noopener" },
                  icon("external", 14),
                  "Open in n8n"
                )
              : null,
            h("button", { class: "btn btn--ghost", onclick: load }, icon("refresh", 14), "Refresh"),
            h("button", { class: "btn btn--primary", onclick: openCreateForm }, icon("plus", 14), "Create")
          )
        ),
        h(
          "div",
          { class: "kpi-grid" },
          Kpi({ label: "Total", value: credentials.count ?? 0, tone: "small" }),
          Kpi({ label: "Unique types", value: uniqueTypes().length, tone: "small" })
        ),
        h(
          "div",
          { class: "toolbar" },
          h(
            "div",
            { class: "input-wrap", style: { width: 320 } },
            h("span", { class: "input-wrap__icon" }, icon("search", 14)),
            h("input", {
              class: "input input--with-icon",
              placeholder: "Search by name, type, id…",
              value: q,
              oninput: (e) => { q = e.target.value; render(); }
            })
          ),
          h(
            "select",
            {
              class: "select",
              style: { width: 220 },
              onchange: (e) => { typeFilter = e.target.value; render(); }
            },
            h("option", { value: "all" }, "All types"),
            ...uniqueTypes().map((t) => h("option", { value: t, selected: typeFilter === t }, t))
          )
        ),
        items.length === 0
          ? Empty({
              title: "No credentials in n8n",
              hint: "Create credentials in your n8n instance, then bind them from the project's Credentials tab.",
              action: n8nCredentialsUrl ? h("a", { class: "btn btn--primary", href: n8nCredentialsUrl, target: "_blank", rel: "noopener" }, icon("external", 14), "Open n8n") : null
            })
          : h(
              "div",
              { class: "card card--flush" },
              h(
                "div",
                { class: "table-wrap" },
                h(
                  "table",
                  { class: "table" },
                  h(
                    "thead",
                    null,
                    h(
                      "tr",
                      null,
                      h("th", null, "Name"),
                      h("th", null, "Type"),
                      h("th", null, "n8n ID"),
                      h("th", { style: { width: 1 } }, "")
                    )
                  ),
                  h(
                    "tbody",
                    null,
                    items.map((c) =>
                      h(
                        "tr",
                        null,
                        h("td", null, h("strong", null, c.name)),
                        h("td", null, Badge({ tone: "accent", text: c.type })),
                        h("td", null, h("span", { class: "mono text-xs" }, c.id)),
                        h(
                          "td",
                          null,
                          h(
                            "button",
                            { class: "btn btn--ghost btn--sm", onclick: () => showSchema(c.type) },
                            "Schema"
                          )
                        )
                      )
                    )
                  )
                )
              )
            )
      )
    );
  }

  render();
  await load();
}

/* ============================================================
   20b) PAGE: Diagnostics (debug routes + event ingest test)
   ============================================================ */

async function pageDiagnostics(root) {
  let projects = [];
  let kbResult = null;
  let kbQuery = "";
  let kbError = null;
  let snapshotResult = null;
  let snapshotError = null;
  let snapshotProjectId = "";
  let nodeVersionsResult = null;
  let nodeVersionsError = null;
  let nodeVersionsProjectId = "";

  // Test event form state
  let evToken = localStorage.getItem("opsradar.eventToken") || "";
  let evProjectId = "";
  let evN8nWorkflowId = "";
  let evType = "run_failed";
  let evMessage = "Test event from diagnostics panel";
  let evSeverity = "medium";

  async function bootstrapProjects() {
    try {
      const r = await api.projects.report({ limit: 500 });
      projects = (r.items || []).filter((it) => it.workflow_id);
      if (projects.length) {
        snapshotProjectId = projects[0].project_id;
        nodeVersionsProjectId = projects[0].project_id;
        evProjectId = projects[0].project_id;
        evN8nWorkflowId = projects[0].n8n_workflow_id || "";
      }
    } catch {}
  }

  async function runKb() {
    kbError = null;
    kbResult = null;
    render();
    try {
      kbResult = await api.debug.knowledgeBase(kbQuery);
    } catch (err) {
      kbError = err;
    }
    render();
  }

  async function runSnapshot() {
    snapshotError = null;
    snapshotResult = null;
    render();
    if (!snapshotProjectId) return;
    try {
      snapshotResult = await api.debug.workflow(snapshotProjectId, { verifyN8n: true });
    } catch (err) {
      snapshotError = err;
    }
    render();
  }

  async function runNodeVersions() {
    nodeVersionsError = null;
    nodeVersionsResult = null;
    render();
    if (!nodeVersionsProjectId) return;
    try {
      nodeVersionsResult = await api.debug.nodeVersions(nodeVersionsProjectId, { verifyN8n: true });
    } catch (err) {
      nodeVersionsError = err;
    }
    render();
  }

  async function sendTestEvent() {
    if (!evProjectId && !evN8nWorkflowId) {
      toast("Pick a project or specify an n8n workflow id.", "error");
      return;
    }
    const body = {
      project_id: evProjectId || undefined,
      n8n_workflow_id: evN8nWorkflowId || undefined,
      event_type: evType,
      severity: evSeverity,
      message: evMessage
    };
    try {
      const result = await api.events.ingest(body, evToken || undefined);
      toast(`Event accepted · id=${result.event_id?.slice?.(0, 8) || "?"}`, "success");
    } catch (err) {
      if (err.code === "UNAUTHORIZED_EVENT") {
        toast("Event ingest requires EVENT_INGEST_TOKEN. Set it below and retry.", "error");
        return;
      }
      toast(err.message, "error");
    }
  }

  function devNotice() {
    return h(
      "div",
      { class: "error-banner", style: { background: "var(--accent-soft)", color: "var(--fg)", borderColor: "var(--border)" } },
      icon("info", 16),
      h("span", { class: "flex-1" },
        "Some endpoints on this page (knowledge base, workflow snapshot, node versions) only respond when the backend runs with ",
        h("code", null, "NODE_ENV=development"),
        ". 404s on those panels are expected in production."
      )
    );
  }

  function projectSelect(selected, onChange) {
    return h(
      "select",
      { class: "select", style: { flex: 1 }, onchange: (e) => onChange(e.target.value) },
      h("option", { value: "" }, "— pick project —"),
      ...projects.map((p) => h("option", { value: p.project_id, selected: p.project_id === selected }, p.project_name))
    );
  }

  function render() {
    mount(
      root,
      h(
        "div",
        { class: "page" },
        h(
          "div",
          { class: "page-header" },
          h(
            "div",
            null,
            h("h1", { class: "page-header__title" }, "Diagnostics"),
            h("p", { class: "page-header__sub" }, "Introspection & test utilities — exercises every backend route not surfaced elsewhere.")
          )
        ),
        devNotice(),

        // Knowledge base selector
        h(
          "section",
          { class: "card card--flush" },
          h(
            "div",
            { class: "card__head" },
            h(
              "div",
              null,
              h("h2", { class: "card__title" }, "Knowledge base selector"),
              h("p", { class: "card__subtitle mono text-xs" }, "GET /debug/knowledge-base")
            )
          ),
          h(
            "div",
            { class: "card__body col col--gap-3" },
            h(
              "div",
              { class: "row row--gap-3" },
              h("input", {
                class: "input flex-1",
                placeholder: "Sample query — e.g. 'Send Slack message every Monday'",
                value: kbQuery,
                oninput: (e) => (kbQuery = e.target.value)
              }),
              h("button", { class: "btn btn--primary", onclick: runKb }, icon("search", 14), "Inspect")
            ),
            kbError ? ErrorBanner({ error: kbError }) : null,
            kbResult
              ? h(
                  "div",
                  { class: "col col--gap-3" },
                  h(
                    "div",
                    { class: "row row--gap-3" },
                    Badge({ tone: kbResult.enabled ? "ok" : "neutral", text: kbResult.enabled ? "enabled" : "disabled", dot: true }),
                    h("span", { class: "muted text-sm" }, `${kbResult.selected?.length ?? 0} selected snippet(s)`)
                  ),
                  jsonHighlight(kbResult)
                )
              : null
          )
        ),

        // Workflow snapshot
        h(
          "section",
          { class: "card card--flush" },
          h(
            "div",
            { class: "card__head" },
            h(
              "div",
              null,
              h("h2", { class: "card__title" }, "Workflow snapshot (DB ↔ n8n diff)"),
              h("p", { class: "card__subtitle mono text-xs" }, "GET /debug/workflow/:projectId")
            )
          ),
          h(
            "div",
            { class: "card__body col col--gap-3" },
            h(
              "div",
              { class: "row row--gap-3" },
              projectSelect(snapshotProjectId, (v) => { snapshotProjectId = v; }),
              h("button", { class: "btn btn--primary", onclick: runSnapshot, disabled: !snapshotProjectId }, "Run snapshot")
            ),
            snapshotError ? ErrorBanner({ error: snapshotError }) : null,
            snapshotResult
              ? h(
                  "div",
                  { class: "col col--gap-3" },
                  h(
                    "div",
                    { class: "row row--gap-3" },
                    Badge({ tone: snapshotResult.same ? "ok" : "warn", text: snapshotResult.same ? "in sync" : "drift detected", dot: true }),
                    Badge({ tone: snapshotResult.same_counts ? "ok" : "warn", text: `counts: ${snapshotResult.db_node_count} db / ${snapshotResult.n8n_node_count ?? "—"} n8n` }),
                    Badge({ tone: snapshotResult.same_connections ? "ok" : "warn", text: snapshotResult.same_connections ? "connections match" : "connections differ" })
                  ),
                  jsonHighlight(snapshotResult)
                )
              : null
          )
        ),

        // Node versions
        h(
          "section",
          { class: "card card--flush" },
          h(
            "div",
            { class: "card__head" },
            h(
              "div",
              null,
              h("h2", { class: "card__title" }, "Node version compatibility"),
              h("p", { class: "card__subtitle mono text-xs" }, "GET /debug/workflow/:projectId/node-versions")
            )
          ),
          h(
            "div",
            { class: "card__body col col--gap-3" },
            h(
              "div",
              { class: "row row--gap-3" },
              projectSelect(nodeVersionsProjectId, (v) => { nodeVersionsProjectId = v; }),
              h("button", { class: "btn btn--primary", onclick: runNodeVersions, disabled: !nodeVersionsProjectId }, "Check versions")
            ),
            nodeVersionsError ? ErrorBanner({ error: nodeVersionsError }) : null,
            nodeVersionsResult
              ? h(
                  "div",
                  { class: "col col--gap-3" },
                  (nodeVersionsResult.incompatible_nodes?.db?.length || 0) +
                  (nodeVersionsResult.incompatible_nodes?.n8n?.length || 0) === 0
                    ? Badge({ tone: "ok", text: "all node versions compatible", dot: true })
                    : Badge({ tone: "bad", text: "incompatible nodes detected", dot: true }),
                  jsonHighlight(nodeVersionsResult)
                )
              : null
          )
        ),

        // Test event sender
        h(
          "section",
          { class: "card card--flush" },
          h(
            "div",
            { class: "card__head" },
            h(
              "div",
              null,
              h("h2", { class: "card__title" }, "Send test event"),
              h("p", { class: "card__subtitle mono text-xs" }, "POST /event")
            ),
            Badge({ tone: "warn", text: "destructive — triggers AI failure analysis on run_failed", dot: true })
          ),
          h(
            "div",
            { class: "card__body col col--gap-3" },
            h(
              "div",
              { class: "field" },
              h("label", { class: "field__label" }, "EVENT_INGEST_TOKEN (sent as x-event-token)"),
              h("input", {
                class: "input",
                placeholder: "Leave empty if backend has no token configured",
                type: "password",
                value: evToken,
                oninput: (e) => {
                  evToken = e.target.value;
                  if (evToken) localStorage.setItem("opsradar.eventToken", evToken);
                  else localStorage.removeItem("opsradar.eventToken");
                }
              })
            ),
            h(
              "div",
              { class: "row row--gap-3" },
              h(
                "div",
                { class: "field flex-1" },
                h("label", { class: "field__label" }, "Project"),
                projectSelect(evProjectId, (v) => {
                  evProjectId = v;
                  const p = projects.find((x) => x.project_id === v);
                  evN8nWorkflowId = p?.n8n_workflow_id || "";
                  render();
                })
              ),
              h(
                "div",
                { class: "field flex-1" },
                h("label", { class: "field__label" }, "n8n_workflow_id (optional)"),
                h("input", {
                  class: "input",
                  value: evN8nWorkflowId,
                  oninput: (e) => (evN8nWorkflowId = e.target.value)
                })
              )
            ),
            h(
              "div",
              { class: "row row--gap-3" },
              h(
                "div",
                { class: "field flex-1" },
                h("label", { class: "field__label" }, "Event type"),
                h(
                  "select",
                  { class: "select", onchange: (e) => (evType = e.target.value) },
                  ...[
                    "run_started", "run_succeeded", "run_failed",
                    "node_started", "node_succeeded", "node_failed",
                    "workflow_created", "workflow_validated", "workflow_rejected",
                    "workflow_deployed", "workflow_activated", "workflow_deactivated", "workflow_deleted",
                    "workflow_execution_success", "workflow_execution_failed",
                    "workflow_health_warning", "workflow_health_failing",
                    "workflow_alert_created", "workflow_alert_resolved"
                  ].map((t) => h("option", { value: t, selected: t === evType }, t))
                )
              ),
              h(
                "div",
                { class: "field", style: { width: 160 } },
                h("label", { class: "field__label" }, "Severity"),
                h(
                  "select",
                  { class: "select", onchange: (e) => (evSeverity = e.target.value) },
                  ...["low", "medium", "high"].map((s) =>
                    h("option", { value: s, selected: s === evSeverity }, s)
                  )
                )
              )
            ),
            h(
              "div",
              { class: "field" },
              h("label", { class: "field__label" }, "Message"),
              h("input", { class: "input", value: evMessage, oninput: (e) => (evMessage = e.target.value) })
            ),
            h(
              "div",
              { class: "row row--gap-3" },
              h("button", { class: "btn btn--primary", onclick: sendTestEvent }, icon("play", 14), "Send event"),
              h("span", { class: "muted text-xs" }, "Tip: pick run_failed to exercise the AI failure-analysis pipeline.")
            )
          )
        )
      )
    );
  }

  render();
  await bootstrapProjects();
  render();
}

/* ============================================================
   20c) AUTH SCREEN (login + register, full-viewport)
   ============================================================
   Renders a centered card over the entire app shell (we hide the sidebar +
   topbar via CSS while #app[data-auth="locked"] is present). On success the
   auth token + cached user are persisted to localStorage and we hand off to
   the normal router by reloading the current hash.
   ============================================================ */

let authMode = "login"; // "login" | "register"

function renderAuthScreen() {
  // Hide chrome and stop any pollers from a previous session.
  document.getElementById("app").dataset.auth = "locked";
  stopAllPollers();
  const root = $("#page-root");
  let busy = false;
  let errorMsg = null;
  // Pre-fill email from previous successful login if cached.
  let formEmail = getCachedAuthUser()?.email || "";
  let formName = "";
  let formPassword = "";

  async function submit() {
    if (busy) return;
    errorMsg = null;
    busy = true;
    render();
    try {
      const result =
        authMode === "register"
          ? await api.auth.register({
              email: formEmail.trim(),
              name: formName.trim(),
              password: formPassword
            })
          : await api.auth.login({
              email: formEmail.trim(),
              password: formPassword
            });
      setAuthToken(result.token);
      setCachedAuthUser(result.user);
      toast(authMode === "register" ? "Account created" : "Welcome back", "success");
      document.getElementById("app").dataset.auth = "open";
      // Re-enter the router so the now-authenticated session loads the
      // dashboard (or whatever hash the user landed on originally).
      if (!location.hash || location.hash === "#") location.hash = "#/";
      router();
    } catch (err) {
      errorMsg = err;
      busy = false;
      render();
    }
  }

  function field(label, props) {
    return h(
      "div",
      { class: "field" },
      h("label", { class: "field__label" }, label),
      h("input", { class: "input", ...props })
    );
  }

  function render() {
    mount(
      root,
      h(
        "div",
        {
          class: "auth-shell",
          style: {
            position: "fixed",
            inset: 0,
            display: "grid",
            placeItems: "center",
            background: "var(--bg)",
            padding: "var(--sp-4)",
            zIndex: 50
          }
        },
        h(
          "div",
          { class: "card", style: { width: "100%", maxWidth: 420 } },
          h(
            "div",
            { class: "row", style: { marginBottom: "var(--sp-4)" } },
            h(
              "div",
              {
                class: "sidebar__brand-mark",
                style: { width: 36, height: 36, fontSize: 14 }
              },
              "OR"
            ),
            h(
              "div",
              null,
              h("div", { class: "sidebar__brand-title" }, "OpsRadar"),
              h("div", { class: "muted text-xs" }, "Sign in to your control panel")
            )
          ),
          h(
            "form",
            {
              onsubmit: (e) => {
                e.preventDefault();
                submit();
              },
              class: "col col--gap-3"
            },
            field("Email", {
              type: "email",
              required: true,
              autocomplete: "email",
              value: formEmail,
              oninput: (e) => (formEmail = e.target.value)
            }),
            authMode === "register"
              ? field("Name", {
                  type: "text",
                  required: true,
                  autocomplete: "name",
                  value: formName,
                  oninput: (e) => (formName = e.target.value)
                })
              : null,
            field("Password", {
              type: "password",
              required: true,
              autocomplete:
                authMode === "register" ? "new-password" : "current-password",
              value: formPassword,
              oninput: (e) => (formPassword = e.target.value),
              minlength: 8
            }),
            errorMsg ? ErrorBanner({ error: errorMsg }) : null,
            h(
              "button",
              {
                type: "submit",
                class: "btn btn--primary btn--block",
                disabled: busy
              },
              busy ? h("span", { class: "spinner" }) : null,
              authMode === "register" ? "Create account" : "Sign in"
            ),
            h(
              "div",
              {
                class: "muted text-sm",
                style: { textAlign: "center", marginTop: "var(--sp-2)" }
              },
              authMode === "register"
                ? "Already have an account? "
                : "New here? ",
              h(
                "a",
                {
                  href: "#",
                  onclick: (e) => {
                    e.preventDefault();
                    authMode = authMode === "register" ? "login" : "register";
                    errorMsg = null;
                    render();
                  }
                },
                authMode === "register" ? "Sign in" : "Create account"
              )
            )
          )
        )
      )
    );
  }

  render();
}

/* ============================================================
   20d) PAGE: Account (profile + per-account API credentials)
   ============================================================ */

async function pageAccount(root) {
  let user = getCachedAuthUser();
  let saving = false;
  let n8nBaseUrl = user?.n8n_base_url || "";
  // We never reveal stored API keys back to the client — fields stay empty
  // and an empty submission means "leave unchanged" (we omit the field), while
  // a non-empty submission overwrites the stored value.
  let n8nApiKey = "";
  let anthropicApiKey = "";

  // Always re-fetch /auth/me on entry: localStorage may be stale after a
  // credential rotation in another tab.
  try {
    const fresh = await api.auth.me();
    user = fresh.user;
    setCachedAuthUser(user);
    n8nBaseUrl = user.n8n_base_url || "";
  } catch (err) {
    mount(root, h("div", { class: "page" }, ErrorBanner({ error: err })));
    return;
  }

  function render() {
    mount(
      root,
      h(
        "div",
        { class: "page" },
        h(
          "div",
          { class: "page-header" },
          h(
            "div",
            null,
            h("h1", { class: "page-header__title" }, "Account"),
            h(
              "p",
              { class: "page-header__sub" },
              `Signed in as ${user.email}`
            )
          ),
          h(
            "div",
            { class: "page-header__actions" },
            h(
              "button",
              {
                class: "btn btn--ghost",
                onclick: () => {
                  clearAuth();
                  location.hash = "#/";
                  router();
                  toast("Signed out", "info");
                }
              },
              "Sign out"
            )
          )
        ),
        h(
          "div",
          { class: "card" },
          h("h3", { style: { marginTop: 0 } }, "Profile"),
          h(
            "dl",
            {
              class: "col col--gap-2",
              style: { margin: 0 }
            },
            h(
              "div",
              { class: "row" },
              h("dt", { class: "muted text-sm", style: { width: 120 } }, "User ID"),
              h("dd", { class: "mono text-sm", style: { margin: 0 } }, user.id)
            ),
            h(
              "div",
              { class: "row" },
              h("dt", { class: "muted text-sm", style: { width: 120 } }, "Name"),
              h("dd", { style: { margin: 0 } }, user.name)
            ),
            h(
              "div",
              { class: "row" },
              h("dt", { class: "muted text-sm", style: { width: 120 } }, "Email"),
              h("dd", { style: { margin: 0 } }, user.email)
            ),
            h(
              "div",
              { class: "row" },
              h("dt", { class: "muted text-sm", style: { width: 120 } }, "Joined"),
              h("dd", { style: { margin: 0 } }, fmtDate(user.created_at))
            ),
            // Read-only: RAG agent permission is granted by the operator, not
            // self-served. We only render it when enabled to avoid drawing
            // attention to a feature most users can't toggle anyway.
            user.can_use_rag_agent
              ? h(
                  "div",
                  { class: "row" },
                  h("dt", { class: "muted text-sm", style: { width: 120 } }, "AI mode"),
                  h(
                    "dd",
                    { style: { margin: 0 } },
                    Badge({ tone: "accent", text: "RAG agent enabled", dot: true }),
                    h(
                      "span",
                      { class: "muted text-xs", style: { marginLeft: 8 } },
                      "Workflow generation routes through the platform agent — your Anthropic key is not used."
                    )
                  )
                )
              : null
          )
        ),
        h(
          "div",
          { class: "card" },
          h(
            "div",
            { class: "row", style: { marginBottom: "var(--sp-3)" } },
            h("h3", { style: { margin: 0 } }, "API credentials"),
            h("span", { class: "muted text-xs flex-1" }, "Encrypted at rest with AES-256-GCM")
          ),
          h(
            "p",
            { class: "muted text-sm" },
            "These keys are used by every workflow you create or monitor. Leave a key field empty to keep the stored value unchanged. To clear a stored key, type ",
            h("code", null, "DELETE"),
            " into the field."
          ),
          h(
            "form",
            {
              onsubmit: (e) => {
                e.preventDefault();
                save();
              },
              class: "col col--gap-3"
            },
            h(
              "div",
              { class: "field" },
              h(
                "label",
                { class: "field__label" },
                "n8n base URL ",
                h(
                  "span",
                  { class: "muted text-xs" },
                  "e.g. https://n8n.example.com/api/v1"
                )
              ),
              h("input", {
                class: "input",
                type: "url",
                value: n8nBaseUrl,
                placeholder: "https://your-n8n/api/v1",
                oninput: (e) => (n8nBaseUrl = e.target.value)
              })
            ),
            h(
              "div",
              { class: "field" },
              h(
                "label",
                { class: "field__label" },
                "n8n API key ",
                user.has_n8n_api_key
                  ? Badge({ tone: "ok", text: "set", dot: true })
                  : Badge({ tone: "warn", text: "not set" })
              ),
              h("input", {
                class: "input",
                type: "password",
                placeholder: user.has_n8n_api_key ? "•••••••• (leave blank to keep)" : "Paste your n8n JWT",
                oninput: (e) => (n8nApiKey = e.target.value)
              })
            ),
            h(
              "div",
              { class: "field" },
              h(
                "label",
                { class: "field__label" },
                "Anthropic API key ",
                user.has_anthropic_api_key
                  ? Badge({ tone: "ok", text: "set", dot: true })
                  : Badge({ tone: "warn", text: "not set" })
              ),
              h("input", {
                class: "input",
                type: "password",
                placeholder: user.has_anthropic_api_key
                  ? "•••••••• (leave blank to keep)"
                  : "sk-ant-...",
                oninput: (e) => (anthropicApiKey = e.target.value)
              })
            ),
            h(
              "div",
              { class: "row" },
              h(
                "button",
                {
                  type: "submit",
                  class: "btn btn--primary",
                  disabled: saving
                },
                saving ? h("span", { class: "spinner" }) : null,
                "Save credentials"
              )
            )
          )
        )
      )
    );
  }

  async function save() {
    saving = true;
    render();
    const body = {};
    // Only send fields the user actually touched. Sentinel "DELETE" clears.
    if ((n8nBaseUrl || "") !== (user.n8n_base_url || "")) {
      body.n8n_base_url = n8nBaseUrl.trim() ? n8nBaseUrl.trim() : null;
    }
    if (n8nApiKey === "DELETE") body.n8n_api_key = null;
    else if (n8nApiKey.trim().length > 0) body.n8n_api_key = n8nApiKey.trim();
    if (anthropicApiKey === "DELETE") body.anthropic_api_key = null;
    else if (anthropicApiKey.trim().length > 0) body.anthropic_api_key = anthropicApiKey.trim();

    if (Object.keys(body).length === 0) {
      saving = false;
      toast("Nothing to save", "info");
      render();
      return;
    }
    try {
      const updated = await api.auth.updateCredentials(body);
      user = updated.user;
      setCachedAuthUser(user);
      n8nApiKey = "";
      anthropicApiKey = "";
      toast("Credentials saved", "success");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      saving = false;
      render();
    }
  }

  render();
}

/* ============================================================
   20e) ADMIN pages
   ============================================================
   Every page below relies on the backend `requireAdmin` middleware to gate
   data access — the UI checks the cached flag only for navigation polish.
   ============================================================ */

async function pageAdminDashboard(root) {
  let overview = null, errorMsg = null;
  try {
    const r = await api.admin.analytics();
    overview = r.overview;
  } catch (err) {
    errorMsg = err;
  }

  if (errorMsg) {
    mount(root, h("div", { class: "page" }, ErrorBanner({ error: errorMsg })));
    return;
  }
  const ok = overview;
  mount(
    root,
    h(
      "div",
      { class: "page" },
      h(
        "div",
        { class: "page-header" },
        h(
          "div",
          null,
          h("h1", { class: "page-header__title" }, "Admin · Platform overview"),
          h("p", { class: "page-header__sub" }, "All tenants, all activity — read-only.")
        ),
        h(
          "div",
          { class: "page-header__actions" },
          h("a", { class: "btn btn--ghost", href: "#/admin/users" }, icon("projects", 14), "Manage users"),
          h("a", { class: "btn btn--ghost", href: "#/admin/interactions" }, icon("builder", 14), "Prompts log")
        )
      ),
      h(
        "div",
        { class: "kpi-grid" },
        Kpi({ label: "Users", value: ok.users_total, hint: `${ok.users_admin} admin · ${ok.users_with_rag} with RAG` }),
        Kpi({ label: "Projects", value: ok.projects_total, hint: `${ok.workflows_total} workflows` }),
        Kpi({
          label: "AI calls (24h)",
          value: ok.ai_interactions_24h,
          hint: `${ok.ai_errors_24h} errors`,
          tone: ok.ai_errors_24h > ok.ai_interactions_24h * 0.2 ? "down" : "up"
        }),
        Kpi({ label: "Tokens (24h)", value: ok.ai_tokens_24h.toLocaleString(), hint: "across all providers" })
      ),
      h(
        "div",
        { class: "card" },
        h("h3", { style: { marginTop: 0 } }, "Quick links"),
        h(
          "div",
          { class: "row row--gap-3" },
          h("a", { class: "btn btn--primary", href: "#/admin/users" }, "Users"),
          h("a", { class: "btn btn--ghost", href: "#/admin/projects" }, "All projects"),
          h("a", { class: "btn btn--ghost", href: "#/admin/interactions" }, "Prompts log")
        )
      )
    )
  );
}

async function pageAdminUsers(root) {
  let users = null;
  let q = "";

  async function load() {
    try {
      users = await api.admin.users.list({ limit: 200, q });
      render();
    } catch (err) {
      mount(root, h("div", { class: "page" }, ErrorBanner({ error: err })));
    }
  }

  async function patchFlag(id, patch) {
    try {
      await api.admin.users.patch(id, patch);
      toast("User updated", "success");
      await load();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  function openCreateForm() {
    let email = "", name = "", password = "", canRag = false, isAdminFlag = false;
    openModal({
      title: "Create user",
      body: h(
        "div",
        { class: "col col--gap-3" },
        h("div", { class: "field" }, h("label", { class: "field__label" }, "Email"),
          h("input", { class: "input", type: "email", oninput: (e) => (email = e.target.value) })),
        h("div", { class: "field" }, h("label", { class: "field__label" }, "Name"),
          h("input", { class: "input", oninput: (e) => (name = e.target.value) })),
        h("div", { class: "field" }, h("label", { class: "field__label" }, "Initial password (≥ 8 chars)"),
          h("input", { class: "input", type: "password", oninput: (e) => (password = e.target.value) })),
        h(
          "label",
          { class: "row row--gap-3", style: { cursor: "pointer" } },
          h("input", { type: "checkbox", onchange: (e) => (canRag = e.target.checked) }),
          h("span", null, "Grant RAG agent access")
        ),
        h(
          "label",
          { class: "row row--gap-3", style: { cursor: "pointer" } },
          h("input", { type: "checkbox", onchange: (e) => (isAdminFlag = e.target.checked) }),
          h("span", null, "Admin")
        )
      ),
      actions: [
        h("button", { class: "btn btn--ghost", onclick: closeModal }, "Cancel"),
        h(
          "button",
          {
            class: "btn btn--primary",
            onclick: async () => {
              try {
                await api.admin.users.create({
                  email: email.trim(),
                  name: name.trim(),
                  password,
                  can_use_rag_agent: canRag,
                  is_admin: isAdminFlag
                });
                toast("User created", "success");
                closeModal();
                await load();
              } catch (err) {
                toast(err.message, "error");
              }
            }
          },
          "Create"
        )
      ]
    });
  }

  function openResetPassword(u) {
    let pw = "";
    openModal({
      title: `Reset password · ${u.email}`,
      body: h(
        "div",
        { class: "col col--gap-3" },
        h(
          "p",
          { class: "muted text-sm" },
          "The user will need this new password on their next sign-in. They are not signed out automatically."
        ),
        h("div", { class: "field" }, h("label", { class: "field__label" }, "New password (≥ 8 chars)"),
          h("input", { class: "input", type: "password", oninput: (e) => (pw = e.target.value) }))
      ),
      actions: [
        h("button", { class: "btn btn--ghost", onclick: closeModal }, "Cancel"),
        h(
          "button",
          {
            class: "btn btn--primary",
            onclick: async () => {
              try {
                await api.admin.users.resetPassword(u.id, pw);
                toast("Password reset", "success");
                closeModal();
              } catch (err) {
                toast(err.message, "error");
              }
            }
          },
          "Set password"
        )
      ]
    });
  }

  function confirmDelete(u) {
    openModal(
      ConfirmDialog({
        title: "Delete user?",
        message: `Permanently delete ${u.email}? Their projects become orphaned (user_id set to NULL).`,
        confirmLabel: "Delete",
        danger: true,
        onConfirm: async () => {
          try {
            await api.admin.users.delete(u.id);
            toast("User deleted", "success");
            await load();
          } catch (err) {
            toast(err.message, "error");
          }
        }
      })
    );
  }

  function render() {
    if (!users) {
      mount(root, h("div", { class: "page" }, Skeleton({ variant: "block" })));
      return;
    }
    mount(
      root,
      h(
        "div",
        { class: "page" },
        h(
          "div",
          { class: "page-header" },
          h(
            "div",
            null,
            h("h1", { class: "page-header__title" }, "Admin · Users"),
            h("p", { class: "page-header__sub" }, `${users.count} user(s)`)
          ),
          h(
            "div",
            { class: "page-header__actions" },
            h("button", { class: "btn btn--ghost", onclick: load }, icon("refresh", 14), "Refresh"),
            h("button", { class: "btn btn--primary", onclick: openCreateForm }, icon("plus", 14), "Create user")
          )
        ),
        h(
          "div",
          { class: "toolbar" },
          h(
            "div",
            { class: "input-wrap", style: { width: 320 } },
            h("span", { class: "input-wrap__icon" }, icon("search", 14)),
            h("input", {
              class: "input input--with-icon",
              placeholder: "Search email or name…",
              value: q,
              oninput: (e) => { q = e.target.value; },
              onkeydown: (e) => { if (e.key === "Enter") load(); }
            })
          ),
          h("button", { class: "btn btn--ghost btn--sm", onclick: load }, "Apply")
        ),
        h(
          "div",
          { class: "card card--flush" },
          users.items.length === 0
            ? Empty({ title: "No users", hint: "Create the first one with the button above." })
            : h(
                "div",
                { class: "table-wrap" },
                h(
                  "table",
                  { class: "table" },
                  h(
                    "thead",
                    null,
                    h(
                      "tr",
                      null,
                      h("th", null, "Email"),
                      h("th", null, "Name"),
                      h("th", null, "Roles"),
                      h("th", null, "Credentials"),
                      h("th", null, "Joined"),
                      h("th", { style: { width: 1 } }, "")
                    )
                  ),
                  h(
                    "tbody",
                    null,
                    users.items.map((u) =>
                      h(
                        "tr",
                        null,
                        h(
                          "td",
                          null,
                          h(
                            "a",
                            { href: `#/admin/users/${encodeURIComponent(u.id)}` },
                            u.email
                          )
                        ),
                        h("td", null, u.name),
                        h(
                          "td",
                          null,
                          h(
                            "div",
                            { class: "row row--gap-2" },
                            u.is_admin ? Badge({ tone: "bad", text: "admin", dot: true }) : null,
                            u.can_use_rag_agent ? Badge({ tone: "accent", text: "RAG", dot: true }) : null,
                            !u.is_admin && !u.can_use_rag_agent ? Badge({ tone: "neutral", text: "user" }) : null
                          )
                        ),
                        h(
                          "td",
                          null,
                          h(
                            "div",
                            { class: "row row--gap-2" },
                            u.has_n8n_api_key ? Badge({ tone: "ok", text: "n8n" }) : Badge({ tone: "neutral", text: "no n8n" }),
                            u.has_anthropic_api_key ? Badge({ tone: "ok", text: "anth" }) : Badge({ tone: "neutral", text: "no anth" })
                          )
                        ),
                        h("td", null, h("span", { class: "muted text-xs" }, fmtRelative(u.created_at))),
                        h(
                          "td",
                          null,
                          h(
                            "div",
                            { class: "row row--gap-2" },
                            h(
                              "button",
                              { class: "btn btn--ghost btn--sm", onclick: () => patchFlag(u.id, { can_use_rag_agent: !u.can_use_rag_agent }) },
                              u.can_use_rag_agent ? "Revoke RAG" : "Grant RAG"
                            ),
                            h(
                              "button",
                              { class: "btn btn--ghost btn--sm", onclick: () => patchFlag(u.id, { is_admin: !u.is_admin }) },
                              u.is_admin ? "Demote" : "Promote"
                            ),
                            h("button", { class: "btn btn--ghost btn--sm", onclick: () => openResetPassword(u) }, "Reset pw"),
                            h(
                              "button",
                              { class: "btn btn--ghost btn--sm", onclick: () => confirmDelete(u) },
                              icon("trash", 12)
                            )
                          )
                        )
                      )
                    )
                  )
                )
              )
        )
      )
    );
  }

  render();
  await load();
}

async function pageAdminUserDetail(root, userId) {
  let detail = null;
  try {
    detail = await api.admin.users.get(userId);
  } catch (err) {
    mount(root, h("div", { class: "page" }, ErrorBanner({ error: err })));
    return;
  }

  const u = detail.user;
  const stats = detail.ai_interactions;
  mount(
    root,
    h(
      "div",
      { class: "page" },
      h(
        "div",
        { class: "page-header" },
        h(
          "div",
          null,
          h(
            "div",
            { class: "row row--gap-3" },
            h("a", { class: "muted text-sm", href: "#/admin/users" }, "Users"),
            icon("chevronRight", 12),
            h("span", null, u.email)
          ),
          h("h1", { class: "page-header__title", style: { marginTop: 6 } }, u.name),
          h("p", { class: "page-header__sub" }, u.email)
        ),
        h(
          "div",
          { class: "page-header__actions" },
          u.is_admin ? Badge({ tone: "bad", text: "admin", dot: true }) : null,
          u.can_use_rag_agent ? Badge({ tone: "accent", text: "RAG enabled", dot: true }) : null
        )
      ),
      h(
        "div",
        { class: "kpi-grid" },
        Kpi({ label: "Projects", value: detail.projects_count, tone: "small" }),
        Kpi({ label: "AI calls", value: stats.total, hint: `${stats.success} ok · ${stats.error} err`, tone: "small" }),
        Kpi({ label: "Tokens", value: stats.tokens_total.toLocaleString(), tone: "small" }),
        Kpi({ label: "Joined", value: fmtRelative(u.created_at), tone: "small" })
      ),
      h(
        "div",
        { class: "card card--flush" },
        h(
          "div",
          { class: "card__head" },
          h("h3", { class: "card__title" }, "Recent prompts"),
          h("a", { class: "btn btn--ghost btn--sm", href: `#/admin/interactions?user_id=${encodeURIComponent(u.id)}` }, "View all", icon("chevronRight", 14))
        ),
        detail.recent_prompts.length === 0
          ? Empty({ title: "No prompts yet" })
          : h(
              "ul",
              null,
              detail.recent_prompts.map((p) =>
                h(
                  "li",
                  { style: { padding: "12px 20px", borderTop: "1px solid var(--border)" } },
                  h(
                    "div",
                    { class: "row row--gap-3" },
                    Badge({ tone: p.status === "success" ? "ok" : "bad", text: p.status, dot: true }),
                    Badge({ tone: "accent", text: p.provider }),
                    h("span", { class: "muted text-xs flex-1" }, p.model),
                    h("span", { class: "muted text-xs" }, `${p.latency_ms ?? "?"} ms · ${p.tokens_used ?? "?"} tok`),
                    h("span", { class: "muted text-xs" }, fmtRelative(p.created_at)),
                    h("a", { class: "btn btn--ghost btn--sm", href: `#/admin/interactions/${p.id}` }, "Open")
                  ),
                  h(
                    "div",
                    { class: "text-sm", style: { marginTop: 6 } },
                    h("strong", { class: "muted" }, "Prompt: "),
                    p.user_prompt_excerpt
                  ),
                  p.response_excerpt
                    ? h(
                        "div",
                        { class: "text-sm", style: { marginTop: 4 } },
                        h("strong", { class: "muted" }, "Response: "),
                        h("span", { class: "muted" }, p.response_excerpt)
                      )
                    : null
                )
              )
            )
      )
    )
  );
}

async function pageAdminInteractions(root) {
  // Filters are read from query-string segment of hash so admins can deep-link
  // (e.g. #/admin/interactions?user_id=abc&status=error).
  const qs = location.hash.includes("?") ? location.hash.split("?")[1] : "";
  const initial = Object.fromEntries(new URLSearchParams(qs));
  let filters = {
    user_id: initial.user_id || "",
    status: initial.status || "",
    provider: initial.provider || ""
  };
  let data = null;

  async function load() {
    try {
      data = await api.admin.interactions.list({
        limit: 100,
        ...(filters.user_id ? { user_id: filters.user_id } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.provider ? { provider: filters.provider } : {})
      });
      render();
    } catch (err) {
      mount(root, h("div", { class: "page" }, ErrorBanner({ error: err })));
    }
  }

  function render() {
    if (!data) { mount(root, h("div", { class: "page" }, Skeleton({ variant: "block" }))); return; }
    mount(
      root,
      h(
        "div",
        { class: "page" },
        h(
          "div",
          { class: "page-header" },
          h(
            "div",
            null,
            h("h1", { class: "page-header__title" }, "Admin · Prompts log"),
            h("p", { class: "page-header__sub" }, `${data.count} call(s) shown`)
          ),
          h(
            "div",
            { class: "page-header__actions" },
            h("button", { class: "btn btn--ghost", onclick: load }, icon("refresh", 14), "Refresh")
          )
        ),
        h(
          "div",
          { class: "toolbar" },
          h("input", {
            class: "input",
            placeholder: "Filter by user_id…",
            value: filters.user_id,
            style: { width: 280 },
            oninput: (e) => (filters.user_id = e.target.value)
          }),
          h(
            "select",
            { class: "select", style: { width: 160 }, onchange: (e) => (filters.status = e.target.value) },
            h("option", { value: "" }, "All statuses"),
            h("option", { value: "success", selected: filters.status === "success" }, "success"),
            h("option", { value: "error", selected: filters.status === "error" }, "error")
          ),
          h("input", {
            class: "input",
            placeholder: "Provider (e.g. anthropic, rag_agent)…",
            value: filters.provider,
            style: { width: 240 },
            oninput: (e) => (filters.provider = e.target.value)
          }),
          h("button", { class: "btn btn--primary btn--sm", onclick: load }, "Apply")
        ),
        h(
          "div",
          { class: "card card--flush" },
          data.items.length === 0
            ? Empty({ title: "No matching prompts" })
            : h(
                "div",
                { class: "table-wrap" },
                h(
                  "table",
                  { class: "table" },
                  h("thead", null, h("tr", null,
                    h("th", null, "Time"),
                    h("th", null, "Status"),
                    h("th", null, "Provider/Model"),
                    h("th", null, "User"),
                    h("th", null, "Prompt"),
                    h("th", null, "Tokens"),
                    h("th", null, "Latency"),
                    h("th", { style: { width: 1 } }, ""))),
                  h(
                    "tbody",
                    null,
                    data.items.map((it) =>
                      h(
                        "tr",
                        null,
                        h("td", null, h("span", { class: "muted text-xs" }, fmtRelative(it.created_at))),
                        h("td", null, Badge({ tone: it.status === "success" ? "ok" : "bad", text: it.status, dot: true })),
                        h("td", null, h("div", null,
                          h("div", null, it.provider),
                          h("div", { class: "muted text-xs mono" }, it.model))),
                        h("td", null, it.user_id
                          ? h("a", { class: "mono text-xs", href: `#/admin/users/${encodeURIComponent(it.user_id)}` }, it.user_id.slice(0, 8))
                          : h("span", { class: "muted text-xs" }, "—")),
                        h("td", null, h("span", { class: "muted text-sm truncate", style: { maxWidth: 360, display: "inline-block" } }, it.user_prompt_excerpt)),
                        h("td", null, h("span", { class: "mono text-xs" }, it.tokens_used ?? "—")),
                        h("td", null, h("span", { class: "mono text-xs" }, `${it.latency_ms ?? "—"} ms`)),
                        h("td", null, h("a", { class: "btn btn--ghost btn--sm", href: `#/admin/interactions/${it.id}` }, "Open"))
                      )
                    )
                  )
                )
              )
        )
      )
    );
  }

  render();
  await load();
}

async function pageAdminInteractionDetail(root, id) {
  let it = null;
  try {
    it = await api.admin.interactions.get(id);
  } catch (err) {
    mount(root, h("div", { class: "page" }, ErrorBanner({ error: err })));
    return;
  }

  mount(
    root,
    h(
      "div",
      { class: "page" },
      h(
        "div",
        { class: "page-header" },
        h(
          "div",
          null,
          h(
            "div",
            { class: "row row--gap-3" },
            h("a", { class: "muted text-sm", href: "#/admin/interactions" }, "Prompts log"),
            icon("chevronRight", 12),
            h("span", null, `#${it.id}`)
          ),
          h("h1", { class: "page-header__title", style: { marginTop: 6 } }, `${it.provider} · ${it.model}`),
          h(
            "p",
            { class: "page-header__sub" },
            `${fmtDate(it.created_at)} · ${it.latency_ms ?? "?"} ms · ${it.tokens_used ?? "?"} tokens`
          )
        ),
        h(
          "div",
          { class: "page-header__actions" },
          Badge({ tone: it.status === "success" ? "ok" : "bad", text: it.status, dot: true }),
          it.user_id ? h("a", { class: "btn btn--ghost btn--sm", href: `#/admin/users/${encodeURIComponent(it.user_id)}` }, "Open user") : null
        )
      ),
      it.error_message ? h("div", { class: "card" }, h("h3", { style: { marginTop: 0, color: "var(--danger)" } }, "Error"), ErrorDetail({ raw: it.error_message })) : null,
      it.system_prompt
        ? h(
            "div",
            { class: "card" },
            h("h3", { style: { marginTop: 0 } }, "System prompt"),
            h("pre", { class: "code-block", style: { whiteSpace: "pre-wrap" } }, it.system_prompt)
          )
        : null,
      h(
        "div",
        { class: "card" },
        h("h3", { style: { marginTop: 0 } }, "User prompt"),
        h("pre", { class: "code-block", style: { whiteSpace: "pre-wrap" } }, it.user_prompt || "—")
      ),
      h(
        "div",
        { class: "card" },
        h("h3", { style: { marginTop: 0 } }, "Response"),
        it.response
          ? h("pre", { class: "code-block", style: { whiteSpace: "pre-wrap" } }, it.response)
          : h("p", { class: "muted" }, "(empty)")
      ),
      it.raw_response
        ? h(
            "details",
            null,
            h("summary", { style: { cursor: "pointer" } }, "Raw provider payload"),
            jsonHighlight(it.raw_response)
          )
        : null
    )
  );
}

async function pageAdminProjects(root) {
  let data = null;
  try {
    data = await api.admin.projects.list({ limit: 500 });
  } catch (err) {
    mount(root, h("div", { class: "page" }, ErrorBanner({ error: err })));
    return;
  }
  mount(
    root,
    h(
      "div",
      { class: "page" },
      h(
        "div",
        { class: "page-header" },
        h(
          "div",
          null,
          h("h1", { class: "page-header__title" }, "Admin · All projects"),
          h("p", { class: "page-header__sub" }, `${data.count} project(s) across all tenants`)
        )
      ),
      h(
        "div",
        { class: "card card--flush" },
        data.items.length === 0
          ? Empty({ title: "No projects yet" })
          : h(
              "div",
              { class: "table-wrap" },
              h(
                "table",
                { class: "table" },
                h("thead", null, h("tr", null,
                  h("th", null, "Project"),
                  h("th", null, "Owner"),
                  h("th", null, "Status"),
                  h("th", null, "Workflow"),
                  h("th", null, "n8n"),
                  h("th", null, "Created"))),
                h(
                  "tbody",
                  null,
                  data.items.map((p) =>
                    h(
                      "tr",
                      null,
                      h("td", null, h("div", null,
                        h("strong", null, p.name),
                        h("div", { class: "muted text-xs mono" }, p.id.slice(0, 8)))),
                      h(
                        "td",
                        null,
                        p.user_email
                          ? h("a", { href: `#/admin/users/${encodeURIComponent(p.user_id)}` }, p.user_email)
                          : h("span", { class: "muted text-xs" }, "unowned")
                      ),
                      h("td", null, Badge({ tone: "neutral", text: p.status })),
                      h("td", null, p.workflow_status ? Badge({ tone: "accent", text: p.workflow_status }) : h("span", { class: "muted text-xs" }, "—")),
                      h("td", null, p.n8n_workflow_id ? h("span", { class: "mono text-xs" }, p.n8n_workflow_id) : h("span", { class: "muted text-xs" }, "—")),
                      h("td", null, h("span", { class: "muted text-xs" }, fmtRelative(p.created_at)))
                    )
                  )
                )
              )
            )
      )
    )
  );
}

/* ============================================================
   21) Modal + Toast renderers (subscribe to state)
   ============================================================ */

function renderModalRoot() {
  const root = $("#modal-root");
  const m = getState().ui.modal;
  clear(root);
  if (!m) return;
  const card = h(
    "div",
    { class: "modal" },
    h("div", { class: "modal__head" }, h("h2", { class: "modal__title" }, m.title)),
    h("div", { class: "modal__body" }, m.body),
    m.actions ? h("div", { class: "modal__foot" }, ...m.actions) : null
  );
  const backdrop = h(
    "div",
    { class: "modal-backdrop", onclick: (e) => { if (e.target === backdrop) closeModal(); } },
    card
  );
  root.appendChild(backdrop);
}

function renderToastRoot() {
  const root = $("#toast-root");
  clear(root);
  for (const t of getState().ui.toasts) {
    root.appendChild(
      h(
        "div",
        { class: ["toast", `toast--${t.tone}`] },
        icon(t.tone === "success" ? "check" : t.tone === "error" ? "alert" : t.tone === "warning" ? "alert" : "info", 16),
        h("div", { class: "flex-1" }, t.message),
        h(
          "button",
          { class: "toast__close", "aria-label": "Dismiss", onclick: () => dismissToast(t.id) },
          icon("close", 14)
        )
      )
    );
  }
}

/* ============================================================
   22) Bootstrap
   ============================================================ */

function bindGlobalEvents() {
  window.addEventListener("hashchange", router);
  $("#sidebar-scrim").addEventListener("click", closeMobileSidebar);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (getState().ui.modal) closeModal();
    }
  });
}

function init() {
  applyTheme(getState().theme);
  applySidebar(getState().sidebar);
  bindGlobalEvents();
  // re-render shells on relevant state changes
  subscribe((s) => {
    renderSidebar();
  });
  subscribe(() => renderModalRoot());
  subscribe(() => renderToastRoot());
  refreshHealth();
  // periodic health check
  setInterval(refreshHealth, 30000);
  router();
}

init();
