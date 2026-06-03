const deployBtn = document.querySelector("#deploy-btn");
const objectiveInput = document.querySelector("#objective");
const telemetry = document.querySelector("#telemetry");
const memoryBox = document.querySelector("#memory-box");
const taskQueueBox = document.querySelector("#task-queue");

function addLine(text, color = "white") {
  telemetry.innerHTML += `
    <div style="color:${color}; margin-bottom:6px;">
      ${text}
    </div>
  `;
  telemetry.scrollTop = telemetry.scrollHeight;
}

function summarize(text, max = 360) {
  const compact = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!compact) return "";
  return compact.length > max ? `${compact.slice(0, max)}…` : compact;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderMemoryPanel(memory) {
  if (!memoryBox) return;

  if (!Array.isArray(memory) || memory.length === 0) {
    memoryBox.innerHTML = `<div style="color:#8aa4c2;">Memory boş.</div>`;
    return;
  }

  memoryBox.innerHTML = memory
    .map((entry) => {
      const task = entry?.task || entry?.input || "-";
      const agent = entry?.selectedAgent || "-";
      const status = entry?.status || "-";
      const summary = entry?.summary || summarize(entry?.response || "");
      const time = entry?.timestamp
        ? new Date(entry.timestamp).toLocaleString("tr-TR")
        : "-";

      return `
        <div style="margin-bottom:10px; padding:10px; border:1px solid #12314f; border-radius:8px;">
          <div><strong>Task:</strong> ${escapeHtml(task)}</div>
          <div><strong>Agent:</strong> ${escapeHtml(agent)}</div>
          <div><strong>Status:</strong> ${escapeHtml(status)}</div>
          <div><strong>Summary:</strong> ${escapeHtml(summary || "-")}</div>
          <div><strong>Time:</strong> ${escapeHtml(time)}</div>
        </div>
      `;
    })
    .join("");
}

async function refreshMemoryPanel() {
  try {
    const res = await fetch("/api/memory");
    const data = await res.json();
    renderMemoryPanel(data.memory || []);
  } catch (err) {
    console.error("MEMORY ERROR:", err);
  }
}

function statusClass(status) {
  if (status === "QUEUED") return "status-QUEUED";
  if (status === "RUNNING") return "status-RUNNING";
  if (status === "DONE") return "status-DONE";
  if (status === "FALLBACK_DONE") return "status-FALLBACK_DONE";
  return "";
}

function renderTaskQueue(tasks) {
  if (!taskQueueBox) return;

  if (!Array.isArray(tasks) || tasks.length === 0) {
    taskQueueBox.innerHTML = `<div style="color:#8aa4c2;">Queue boş.</div>`;
    return;
  }

  taskQueueBox.innerHTML = tasks
    .map((task) => {
      const createdAt = task?.createdAt
        ? new Date(task.createdAt).toLocaleString("tr-TR")
        : "-";
      const id = task?.id || "-";
      const agent = task?.selectedAgent || "-";
      const status = task?.status || "-";

      return `
        <div class="task-row">
          <div class="task-top">
            <div class="task-id">${escapeHtml(id)}</div>
            <div class="task-status ${statusClass(status)}">${escapeHtml(status)}</div>
          </div>
          <div class="task-meta"><strong>Agent:</strong> ${escapeHtml(agent)}</div>
          <div class="task-meta"><strong>Created:</strong> ${escapeHtml(createdAt)}</div>
        </div>
      `;
    })
    .join("");
}

async function refreshTaskQueue() {
  try {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    renderTaskQueue(data.tasks || []);
  } catch (err) {
    console.error("TASK QUEUE ERROR:", err);
    if (taskQueueBox) {
      taskQueueBox.innerHTML = `<div style="color:#f97316;">Queue yüklenemedi.</div>`;
    }
  }
}

async function deployMission() {
  const text = objectiveInput.value.trim();

  if (!text) {
    alert("Görev yaz.");
    return;
  }

  deployBtn.disabled = true;
  deployBtn.innerText = "Running...";

  addLine(`Mission queued: ${text}`, "#8aa4c2");

  try {
    const res = await fetch("/api/mission", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        objective: text
      })
    });

    const data = await res.json();

    addLine("────────────", "#00c3ff");

    if (Array.isArray(data.telemetry)) {
      data.telemetry.forEach((item) => {
        addLine(item, "#00c3ff");
      });
    }

    addLine(`Category: ${data.category || "general"}`, "#facc15");
    addLine(`Selected Agent: ${data.selectedAgent || "General/Jarvis Agent"}`, "#facc15");

    addLine("AI Response:", "#22c55e");
    addLine(data.reply || "Boş cevap döndü.", "#00ff66");

    refreshMemoryPanel();
  } catch (err) {
    console.error(err);

    addLine("ERROR: Frontend request failed.", "red");
  } finally {
    deployBtn.disabled = false;
    deployBtn.innerText = "Deploy Mission";
    refreshTaskQueue();
    refreshMemoryPanel();
  }
}

deployBtn.addEventListener("click", deployMission);
refreshTaskQueue();
refreshMemoryPanel();
setInterval(() => {
  refreshTaskQueue();
  refreshMemoryPanel();
}, 3000);