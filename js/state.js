const LS_TASKS = "agentos_mvp_tasks_v1";
const LS_N8N_WEBHOOK = "agentos_mvp_n8n_webhook_v1";

/** @type {{ id: string; name: string; role: string; status: 'active' | 'idle' }[]} */
export const agents = [
  { id: "mgr", name: "Manager", role: "Routes missions, approvals", status: "active" },
  { id: "crm", name: "CRM Agent", role: "Contacts, deals, activities", status: "idle" },
  { id: "ops", name: "Ops Agent", role: "n8n + integrations", status: "idle" },
];

/** @type {{ id: string; name: string; email: string; stage: string }[]} */
export const crmRows = [
  { id: "c1", name: "Sample Lead", email: "lead@example.com", stage: "New" },
  { id: "c2", name: "Demo Contact", email: "demo@example.com", stage: "Qualified" },
];

const COLS = ["todo", "in_progress", "done"];

/** @type {{ id: string; title: string; column: string }[]} */
let tasks = [
  { id: "t1", title: "Wire n8n callback schema", column: "in_progress" },
  { id: "t2", title: "Define CRM minimal fields", column: "todo" },
  { id: "t3", title: "Review agent tool allowlist", column: "done" },
];

export function getTasks() {
  return tasks;
}

export function setTasks(next) {
  tasks = next;
}

export function loadTasksFromLocal() {
  try {
    const raw = localStorage.getItem(LS_TASKS);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return false;
    tasks = parsed;
    return true;
  } catch {
    return false;
  }
}

export function saveTasksToLocal() {
  try {
    localStorage.setItem(LS_TASKS, JSON.stringify(tasks));
    return true;
  } catch {
    return false;
  }
}

export function clearTasksLocal() {
  try {
    localStorage.removeItem(LS_TASKS);
    return true;
  } catch {
    return false;
  }
}

export function localTasksCacheExists() {
  try {
    return Boolean(localStorage.getItem(LS_TASKS));
  } catch {
    return false;
  }
}

export function addMockTask() {
  const n = tasks.length + 1;
  tasks = [...tasks, { id: `t${Date.now()}`, title: `Mock task ${n}`, column: "todo" }];
}

/**
 * @param {string} title
 * @returns {boolean} false if title empty after trim
 */
export function addTaskFromVoiceTitle(title) {
  const t = typeof title === "string" ? title.trim() : "";
  if (!t) return false;
  tasks = [...tasks, { id: `t${Date.now()}`, title: t, column: "todo" }];
  return true;
}

/**
 * @param {string} taskId
 * @param {number} delta -1 | 1
 */
export function moveTask(taskId, delta) {
  const i = tasks.findIndex((t) => t.id === taskId);
  if (i === -1) return;
  const t = tasks[i];
  const idx = COLS.indexOf(t.column);
  if (idx === -1) return;
  const next = Math.min(COLS.length - 1, Math.max(0, idx + delta));
  const nextCol = COLS[next];
  tasks = tasks.map((x) => (x.id === taskId ? { ...x, column: nextCol } : x));
}

export function stats() {
  const open = tasks.filter((t) => t.column !== "done").length;
  return {
    agents: agents.length,
    openTasks: open,
    crmContacts: crmRows.length,
  };
}

export const n8nWebhookPlaceholder =
  "https://your-n8n.example/webhook/agentos-test";

/** @returns {string} */
export function loadN8nWebhookUrl() {
  try {
    const v = localStorage.getItem(LS_N8N_WEBHOOK);
    return typeof v === "string" ? v : "";
  } catch {
    return "";
  }
}

/** @param {string} url */
export function saveN8nWebhookUrl(url) {
  try {
    const t = typeof url === "string" ? url.trim() : "";
    if (t) localStorage.setItem(LS_N8N_WEBHOOK, t);
    else localStorage.removeItem(LS_N8N_WEBHOOK);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {HTMLElement} container
 * @param {{
 *   onSaveBrowser: () => void;
 *   onReloadBrowser: () => void;
 *   onClearBrowser: () => void;
 *   onExport: () => void;
 *   onImport: () => void;
 * }} handlers
 */
export function renderStoragePanel(container, handlers) {
  const cached = localTasksCacheExists();
  container.innerHTML = `
    <p class="panel__hint" style="margin-top:0">Postgres + S3-style bucket will back AgentOS. This panel only documents intent and optional task JSON in <code>localStorage</code>.</p>
    <p class="panel__hint"><strong>localStorage key:</strong> <code>${LS_TASKS}</code></p>
    <p class="panel__hint">Browser task cache: <strong id="storage-cache-status">${cached ? "Present (key in localStorage)" : "Empty"}</strong></p>
    <div class="panel__row" style="margin-top:1rem">
      <button type="button" class="btn btn--primary" id="btn-storage-save">Save tasks to browser</button>
      <button type="button" class="btn" id="btn-storage-load">Reload from browser</button>
      <button type="button" class="btn btn--danger" id="btn-storage-clear">Clear browser cache</button>
    </div>
    <p class="panel__hint">Import/export file pipeline is a stub — buttons log to console for now.</p>
    <div class="panel__row">
      <button type="button" class="btn" id="btn-storage-export">Export JSON (stub)</button>
      <button type="button" class="btn" id="btn-storage-import">Import JSON (stub)</button>
    </div>
  `;
  container.querySelector("#btn-storage-save")?.addEventListener("click", handlers.onSaveBrowser);
  container.querySelector("#btn-storage-load")?.addEventListener("click", handlers.onReloadBrowser);
  container.querySelector("#btn-storage-clear")?.addEventListener("click", handlers.onClearBrowser);
  container.querySelector("#btn-storage-export")?.addEventListener("click", handlers.onExport);
  container.querySelector("#btn-storage-import")?.addEventListener("click", handlers.onImport);
}
