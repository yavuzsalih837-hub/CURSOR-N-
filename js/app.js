import { createAgentDefinitions } from "./kernel/agent-types.js";
import { subscribeOrchestra, getAllAgentStatuses, getMissions } from "./kernel/orchestra-store.js";
import { subscribeLogs, getLogSnapshot, clearLogs, logLine } from "./kernel/log-bus.js";
import { loadMemory, clearMemoryStore, subscribeMemory } from "./kernel/memory-store.js";
import { getComms, subscribeComms, clearComms } from "./kernel/comms-store.js";
import { runMission } from "./kernel/engine.js";
import { saveApiKey, loadApiKey, saveModel, loadModel } from "./kernel/openai-client.js";
import { renderAgentMesh } from "./agents.js";

function $(sel, root = document) {
  const el = root.querySelector(sel);
  if (!el) throw new Error(`Missing element: ${sel}`);
  return el;
}

function showToast(message, isError = false) {
  const t = $("#toast");
  t.textContent = message;
  t.hidden = false;
  t.classList.toggle("err", isError);
  clearTimeout(showToast._tid);
  showToast._tid = setTimeout(() => {
    t.hidden = true;
    t.classList.remove("err");
  }, isError ? 4200 : 2600);
}

function fmtTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString(undefined, { hour12: false });
  } catch {
    return "—";
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function agentLabel(id) {
  const d = createAgentDefinitions().find((a) => a.id === id);
  return d ? d.name : id;
}

function refreshAgents() {
  const defs = createAgentDefinitions();
  const statuses = getAllAgentStatuses();
  renderAgentMesh($("#agent-grid"), defs, statuses);
}

function refreshLogs() {
  const root = $("#log-feed");
  const entries = getLogSnapshot();
  $("#stat-logs").textContent = String(entries.length);
  root.innerHTML = entries
    .map((e) => {
      const who =
        e.agentId != null
          ? `<span class="lvl-agent">[${escapeHtml(agentLabel(e.agentId))}]</span> `
          : "";
      const lvl = `lvl-${escapeHtml(e.level)}`;
      return `<div class="ng-feed-line mono"><time>${escapeHtml(fmtTime(e.ts))}</time><span class="${lvl}">${who}${escapeHtml(
        e.message,
      )}</span></div>`;
    })
    .join("");
  root.scrollTop = root.scrollHeight;
}

function refreshComms() {
  const root = $("#comm-feed");
  const rows = getComms().slice().reverse();
  root.innerHTML = rows
    .map((m) => {
      const route = `${agentLabel(m.from)} → ${agentLabel(m.to)} · ${m.kind}`;
      return `<div class="ng-comm">
        <div class="ng-comm__route mono">${escapeHtml(route)} · ${escapeHtml(fmtTime(m.ts))}</div>
        <div class="ng-comm__body mono">${escapeHtml(m.body)}</div>
      </div>`;
    })
    .join("");
  root.scrollTop = 0;
}

function refreshMemory() {
  const root = $("#memory-feed");
  const rows = loadMemory().slice().reverse();
  $("#stat-memory").textContent = String(rows.length);
  root.innerHTML = rows
    .map((r) => {
      return `<div class="ng-memory-row mono">
        <div><span class="k">${escapeHtml(r.key)}</span> · ${escapeHtml(agentLabel(r.sourceAgent))} · ${escapeHtml(
        fmtTime(r.ts),
      )}</div>
        <div>${escapeHtml(r.value)}</div>
      </div>`;
    })
    .join("");
}

function refreshQueue() {
  const root = $("#mission-queue");
  const missions = getMissions();
  $("#stat-queue").textContent = String(missions.filter((m) => m.status !== "done" && m.status !== "failed").length);

  const tagClass = (s) => {
    if (s === "routing") return "ng-tag--routing";
    if (s === "running") return "ng-tag--running";
    if (s === "done") return "ng-tag--done";
    if (s === "failed") return "ng-tag--failed";
    return "ng-tag--queued";
  };

  root.innerHTML = missions
    .map((m) => {
      const route = m.routedTo ? `→ ${agentLabel(m.routedTo)}` : "";
      const err = m.error ? ` · ${m.error}` : "";
      return `<article class="ng-queue-card">
        <div class="ng-queue-card__top mono">
          <span>${escapeHtml(fmtTime(m.created))} · ${escapeHtml(m.id)}</span>
          <span class="ng-tag ${tagClass(m.status)}">${escapeHtml(m.status)} ${escapeHtml(route)}</span>
        </div>
        <div class="ng-queue-card__body">${escapeHtml(m.description)}${escapeHtml(err)}</div>
      </article>`;
    })
    .join("") || `<p class="ng-hint" style="margin:0.5rem">No missions yet — deploy an objective above.</p>`;
}

function refreshAll() {
  refreshAgents();
  refreshLogs();
  refreshComms();
  refreshMemory();
  refreshQueue();
}

function setView(name) {
  const cmd = $("#view-command");
  const st = $("#view-settings");
  const title = $("#view-title");
  const onCmd = name === "command";
  cmd.hidden = !onCmd;
  cmd.classList.toggle("is-visible", onCmd);
  st.hidden = onCmd;
  title.textContent = onCmd ? "Command center" : "Neural config";

  document.querySelectorAll(".ng-nav__btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.getAttribute("data-view") === name);
  });

  if (!onCmd) loadSettingsFields();
}

function loadSettingsFields() {
  /** @type {HTMLInputElement} */ ($("#api-key")).value = loadApiKey();
  /** @type {HTMLInputElement} */ ($("#api-model")).value = loadModel();
}

function initNav() {
  document.querySelectorAll(".ng-nav__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = btn.getAttribute("data-view");
      if (v === "command" || v === "settings") setView(v);
    });
  });
}

function initActions() {
  const btn = /** @type {HTMLButtonElement} */ ($("#btn-deploy"));
  const ta = /** @type {HTMLTextAreaElement} */ ($("#mission-input"));
  const optLlm = /** @type {HTMLInputElement} */ ($("#opt-llm"));
  const status = $("#deploy-status");

  btn.addEventListener("click", async () => {
    const text = ta.value.trim();
    if (!text) {
      showToast("Enter an objective first.", true);
      return;
    }
    btn.disabled = true;
    status.textContent = "Routing…";
    try {
      await runMission(text, { useLlm: optLlm.checked });
      status.textContent = "Dispatched.";
      showToast("Mission pipeline completed");
      ta.value = "";
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      status.textContent = "Fault.";
      logLine({ level: "error", message: `Unhandled: ${msg}` });
      showToast(msg, true);
    } finally {
      btn.disabled = false;
      setTimeout(() => {
        status.textContent = "";
      }, 3200);
    }
  });

  $("#btn-clear-logs").addEventListener("click", () => {
    clearLogs();
    refreshLogs();
    showToast("Telemetry cleared");
  });

  $("#btn-clear-comms").addEventListener("click", () => {
    clearComms();
    refreshComms();
    showToast("Channel cleared");
  });

  $("#btn-clear-memory").addEventListener("click", () => {
    clearMemoryStore();
    refreshMemory();
    showToast("Memory purged");
  });

  $("#btn-save-api").addEventListener("click", () => {
    const key = /** @type {HTMLInputElement} */ ($("#api-key")).value;
    const model = /** @type {HTMLInputElement} */ ($("#api-model")).value;
    const okKey = saveApiKey(key);
    const okModel = saveModel(model);
    $("#api-save-status").textContent = okKey && okModel ? "Saved." : "Save failed";
    showToast(okKey && okModel ? "Credentials saved locally" : "Could not save", !okKey || !okModel);
    setTimeout(() => {
      $("#api-save-status").textContent = "";
    }, 2400);
  });
}

function initSubscriptions() {
  subscribeOrchestra(() => {
    refreshAgents();
    refreshQueue();
  });
  subscribeLogs(() => {
    refreshLogs();
  });
  subscribeComms(() => {
    refreshComms();
  });
  subscribeMemory(() => {
    refreshMemory();
  });
}

function bootLog() {
  logLine({
    level: "info",
    message: "Neural Grid online · kernel initialized · awaiting missions.",
  });
}

function init() {
  bootLog();
  initNav();
  initActions();
  initSubscriptions();
  setView("command");
  loadSettingsFields();
  refreshAll();
}

init();

const { autonomousTaskExecutor } = require("./kernel/autonomous-task-executor");

const missionBtn = document.getElementById("mission-btn");
const missionInput = document.getElementById("mission-input");

if (missionBtn && missionInput) {
  missionBtn.addEventListener("click", async () => {
    const task = missionInput.value;

    console.log("[UI] Mission:", task);

    const result = await autonomousTaskExecutor(task);

    console.log(result);

    alert("Mission completed");
  });
}