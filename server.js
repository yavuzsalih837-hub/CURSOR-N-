require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const fs = require("fs");

const app = express();
const PORT = 51463;
const DB_PATH = path.join(__dirname, "db.json");

// Global in-memory queue (persisted task states live in db.json as well)
const taskQueue = [];

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function generateTaskId() {
  return `task_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function analyzeTask(input) {
  const t = String(input || "").toLowerCase();

  if (
    t.includes("reklam") ||
    t.includes("metin") ||
    t.includes("içerik") ||
    t.includes("outreach") ||
    t.includes("post") ||
    t.includes("video") ||
    t.includes("caption")
  ) {
    return {
      category: "content",
      selectedAgent: "Content Agent",
    };
  }

  if (
    t.includes("araştır") ||
    t.includes("rakip") ||
    t.includes("piyasa") ||
    t.includes("lead") ||
    t.includes("analiz")
  ) {
    return {
      category: "research",
      selectedAgent: "Research Agent",
    };
  }

  if (
    t.includes("n8n") ||
    t.includes("webhook") ||
    t.includes("otomasyon") ||
    t.includes("crm") ||
    t.includes("workflow")
  ) {
    return {
      category: "automation",
      selectedAgent: "Automation Agent",
    };
  }

  if (
    t.includes("satış") ||
    t.includes("müşteri") ||
    t.includes("teklif") ||
    t.includes("fiyat")
  ) {
    return {
      category: "sales",
      selectedAgent: "Sales Agent",
    };
  }

  return {
    category: "general",
    selectedAgent: "Jarvis General",
  };
}

function loadDb() {
  let db = {
    memory: [],
    tasks: [],
  };

  if (fs.existsSync(DB_PATH)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    } catch {
      db = {
        memory: [],
        tasks: [],
      };
    }
  }

  if (!Array.isArray(db.memory)) db.memory = [];
  if (!Array.isArray(db.tasks)) db.tasks = [];

  return db;
}

function createMemorySummary(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return "";

  // Memory only keeps a short summary, not the full AI response.
  const compact = raw.replace(/\s+/g, " ");
  return compact.length > 360 ? `${compact.slice(0, 360)}…` : compact;
}

function upsertDbTask(task) {
  const db = loadDb();

  if (!Array.isArray(db.tasks)) db.tasks = [];
  const idx = db.tasks.findIndex((t) => t.id === task.id);

  const record = {
    id: task.id,
    input: task.input,
    selectedAgent: task.selectedAgent,
    category: task.category,
    status: task.status,
    result: task.result ?? null,
    createdAt: task.createdAt,
    completedAt: task.completedAt ?? null,
  };

  if (idx >= 0) db.tasks[idx] = record;
  else db.tasks.push(record);

  return db;
}

function upsertDbMemorySummary(db, task) {
  if (!Array.isArray(db.memory)) db.memory = [];
  const exists = db.memory.some(
    (m) => m && m.type === "memory_summary" && m.taskId === task.id
  );
  if (exists) return db;

  db.memory.push({
    type: "memory_summary",
    taskId: task.id,
    task: task.input,
    selectedAgent: task.selectedAgent,
    category: task.category,
    summary: createMemorySummary(task.result),
    timestamp: task.completedAt || new Date().toISOString(),
    status: task.status,
  });

  return db;
}

function persistTask(task, { writeMemory = false } = {}) {
  // Update / insert task record.
  const db = upsertDbTask(task);

  if (writeMemory) {
    upsertDbMemorySummary(db, task);
  }

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

function buildAgentPrompt(selectedAgent, input) {
  return `
Sen ${selectedAgent} olarak çalışıyorsun.

AgentOS / Jarvis Core v0.2 kuralları:
- Türkçe cevap ver.
- Kısa, net ve uygulanabilir ol.
- Gereksiz teori yazma.
- Kullanıcı para kazanma ve operasyon kurma odaklı çalışıyor.
- Görev gerçek iş çıktısı üretmeye yönelik olmalı.

Görev:
${input}
`;
}

app.post("/api/mission", async (req, res) => {
  const createdAt = new Date().toISOString();
  const startedAt = Date.now();

  const input = req.body.objective || "";
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat";

  const analysis = analyzeTask(input);

  const task = {
    id: generateTaskId(),
    input,
    selectedAgent: analysis.selectedAgent,
    category: analysis.category,
    status: "QUEUED",
    result: null,
    createdAt,
    completedAt: null,
  };

  const telemetry = [
    "Mission received",
    "Task analyzed",
    `Agent selected: ${task.selectedAgent}`,
    "OpenRouter called",
  ];

  console.log("MISSION:", input);
  console.log("TASK:", task.id);
  console.log("AGENT:", task.selectedAgent);

  // Enqueue + persist QUEUED state immediately for dashboard polling.
  taskQueue.unshift(task);
  if (taskQueue.length > 200) taskQueue.length = 200;
  persistTask(task, { writeMemory: false });

  try {
    if (!input.trim()) {
      throw new Error("EMPTY_TASK");
    }

    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY missing");
    }

    // Persist RUNNING state before waiting for the OpenRouter response.
    task.status = "RUNNING";
    persistTask(task, { writeMemory: false });

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model,
        messages: [
          {
            role: "system",
            content: buildAgentPrompt(task.selectedAgent, input),
          },
          {
            role: "user",
            content: input,
          },
        ],
        temperature: 0.4,
      },
      {
        timeout: 30000,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:51463",
          "X-Title": "AgentOS",
        },
      }
    );

    const reply =
      response.data?.choices?.[0]?.message?.content ||
      "Jarvis cevap üretti ama içerik boş döndü.";

    task.status = "DONE";
    task.result = reply;
    task.completedAt = new Date().toISOString();

    telemetry.push("Response completed");
    telemetry.push("Memory saved");
    telemetry.push("Task completed");

    persistTask(task, { writeMemory: true });

    return res.json({
      success: true,
      status: task.status,
      task,
      selectedAgent: task.selectedAgent,
      category: task.category,
      telemetry,
      durationMs: Date.now() - startedAt,
      reply,
    });
  } catch (error) {
    console.error("MISSION ERROR:", error.response?.data || error.message);

    const fallback =
      "Jarvis görevi aldı ama AI katmanında sorun oluştu. Görev memory’ye kaydedildi.";

    task.status = "FALLBACK_DONE";
    task.result = fallback;
    task.completedAt = new Date().toISOString();

    telemetry.push("Fallback response used");
    telemetry.push("Response completed");
    telemetry.push("Memory saved");
    telemetry.push("Task completed");

    persistTask(task, { writeMemory: true });

    return res.json({
      success: true,
      status: task.status,
      task,
      selectedAgent: task.selectedAgent,
      category: task.category,
      telemetry,
      durationMs: Date.now() - startedAt,
      reply: fallback,
    });
  }
});

app.get("/api/tasks", (req, res) => {
  const db = loadDb();
  const tasks = (Array.isArray(db.tasks) ? db.tasks : []).slice(-50).reverse();

  return res.json({
    success: true,
    tasks,
  });
});

app.get("/api/memory", (req, res) => {
  const db = loadDb();
  const memory = (Array.isArray(db.memory) ? db.memory : []).slice(-50).reverse();

  return res.json({
    success: true,
    memory,
  });
});

try {
  const db = loadDb();
  if (Array.isArray(db.tasks)) {
    taskQueue.push(...db.tasks.slice(-200).reverse());
  }
} catch {
  // ignore
}

app.listen(PORT, () => {
  console.log(`AgentOS running on http://localhost:${PORT}`);
});