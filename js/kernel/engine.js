import { AGENT_IDS, createAgentDefinitions } from "./agent-types.js";
import { logLine } from "./log-bus.js";
import { appendMemory } from "./memory-store.js";
import { postComm } from "./comms-store.js";
import { routeHeuristic, routeWithLlm } from "./router.js";
import { chatComplete, loadApiKey } from "./openai-client.js";
import {
  addMission,
  updateMission,
  setAgentStatus,
  getAgentStatus,
  initOrchestra,
} from "./orchestra-store.js";

initOrchestra();

/** @param {string} id */
function agentName(id) {
  const a = createAgentDefinitions().find((x) => x.id === id);
  return a ? a.name : id;
}

/**
 * @param {string} specialistId
 * @param {string} task
 * @returns {{ role: string; content: string }[]}
 */
function specialistMessages(specialistId, task) {
  const base = `You are the ${agentName(specialistId)} agent in a multi-agent operating system. Be concise and actionable. Use markdown bullets if helpful.`;
  const flavor = {
    [AGENT_IDS.RESEARCH]: "Deliver: key questions, suggested sources, and a short synthesis outline.",
    [AGENT_IDS.OUTREACH]: "Deliver: ICP angle, hook, 3-step sequence, and one example email opener.",
    [AGENT_IDS.CONTENT]: "Deliver: angles, outline, tone, and CTA suggestions.",
    [AGENT_IDS.AUTOMATION]: "Deliver: trigger/events, tools, data flow, failure handling, and a minimal workflow sketch.",
    [AGENT_IDS.MANAGER]: "Deliver: phased plan, dependencies between workstreams, and success criteria.",
  };
  return [
    { role: "system", content: `${base}\n${flavor[specialistId] || flavor[AGENT_IDS.MANAGER]}` },
    { role: "user", content: task },
  ];
}

/**
 * @param {string} specialistId
 * @param {string} task
 */
async function runSpecialistLlm(specialistId, task) {
  const text = await chatComplete({
    temperature: 0.4,
    messages: specialistMessages(specialistId, task),
  });
  return text.trim();
}

/**
 * @param {string} specialistId
 * @param {string} task
 */
function runSpecialistMock(specialistId, task) {
  const t = task.slice(0, 280);
  const blocks = {
    [AGENT_IDS.RESEARCH]: `**Research plan (offline)**\n- Frame: ${t.slice(0, 80)}…\n- Sources: filings, news, expert commentary, primary docs.\n- Next: verify claims, capture citations, stress-test assumptions.`,
    [AGENT_IDS.OUTREACH]: `**Outreach draft (offline)**\n- Angle: relevance + specificity to the prospect’s context.\n- Sequence: intro → value proof → soft CTA.\n- Opener example: “Noticed ${t.slice(0, 40)}… curious how you’re handling X today.”`,
    [AGENT_IDS.CONTENT]: `**Content system (offline)**\n- POV: teach the transformation, not the features.\n- Outline: hook → tension → framework → proof → CTA.\n- Formats: long post, cut-downs, landing hero + subheads.`,
    [AGENT_IDS.AUTOMATION]: `**Automation sketch (offline)**\n- Trigger: mission received / CRM stage change.\n- Flow: validate input → call tools → write artifacts → notify Manager.\n- Guardrails: retries, idempotency, dead-letter queue.`,
    [AGENT_IDS.MANAGER]: `**Manager synthesis (offline)**\n- Phase A: clarify objective and constraints.\n- Phase B: parallel research + content spikes.\n- Phase C: outreach experiments with measurement.\n- Phase D: automate stable paths.`,
  };
  return blocks[specialistId] || blocks[AGENT_IDS.MANAGER];
}

/**
 * @param {string} text
 */
function memoryFromOutput(text) {
  const flat = text.replace(/\s+/g, " ").trim();
  const snippet = flat.slice(0, 220);
  return { key: "last_output_summary", value: snippet };
}

/**
 * @param {string} description
 * @param {{ useLlm: boolean }} opts
 */
export async function runMission(description, opts) {
  const id = `ms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const trimmed = String(description || "").trim();
  if (!trimmed) {
    logLine({ level: "warn", message: "Empty mission — ignored" });
    return;
  }

  addMission({ id, description: trimmed, status: "queued" });
  logLine({ level: "info", message: `Mission queued: ${trimmed.slice(0, 120)}${trimmed.length > 120 ? "…" : ""}` });

  setAgentStatus(AGENT_IDS.MANAGER, "thinking");
  logLine({ level: "agent", agentId: AGENT_IDS.MANAGER, message: "Classifying intent and routing…" });
  updateMission(id, { status: "routing" });

  let target = routeHeuristic(trimmed);
  let rationale = "Heuristic router (keyword signals).";

  const hasKey = Boolean(loadApiKey());
  if (opts.useLlm && hasKey) {
    try {
      const r = await routeWithLlm(trimmed);
      target = r.target;
      rationale = r.rationale || rationale;
      logLine({ level: "agent", agentId: AGENT_IDS.MANAGER, message: `LLM route → ${agentName(target)}. ${rationale}` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logLine({ level: "warn", message: `LLM routing failed, using heuristic: ${msg}` });
    }
  } else if (opts.useLlm && !hasKey) {
    logLine({ level: "info", message: "LLM routing requested but no API key — using heuristic router." });
  }

  if (target === AGENT_IDS.MANAGER) {
    const alt = routeHeuristic(`${trimmed} research outreach content automation`);
    if (alt !== AGENT_IDS.MANAGER) {
      target = alt;
      rationale = `${rationale} (expanded signals for specialist)`;
    }
  }

  updateMission(id, { routedTo: target, status: "running" });
  postComm({
    from: AGENT_IDS.MANAGER,
    to: target,
    body: `Handoff: "${trimmed.slice(0, 200)}${trimmed.length > 200 ? "…" : ""}" — ${rationale}`,
    kind: "handoff",
  });

  setAgentStatus(AGENT_IDS.MANAGER, "success");
  setTimeout(() => setAgentStatus(AGENT_IDS.MANAGER, "idle"), 600);

  setAgentStatus(target, "executing");
  logLine({ level: "agent", agentId: target, message: `Executing specialist run…` });

  let output = "";
  try {
    if (hasKey) {
      output = await runSpecialistLlm(target, trimmed);
    } else {
      output = runSpecialistMock(target, trimmed);
    }
    setAgentStatus(target, "success");
    logLine({ level: "agent", agentId: target, message: "Run complete. Deliverable ready." });
    postComm({
      from: target,
      to: AGENT_IDS.MANAGER,
      body: output.slice(0, 4000),
      kind: "reply",
    });
    const mem = memoryFromOutput(output);
    appendMemory({ key: mem.key, value: mem.value, sourceAgent: target });
    logLine({ level: "info", message: `Memory updated: ${mem.key}` });
    updateMission(id, { status: "done" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    setAgentStatus(target, "error");
    logLine({ level: "error", agentId: target, message: `Run failed: ${msg}` });
    postComm({
      from: target,
      to: AGENT_IDS.MANAGER,
      body: `Error: ${msg}`,
      kind: "reply",
    });
    updateMission(id, { status: "failed", error: msg });
  } finally {
    setTimeout(() => {
      const st = getAgentStatus(target);
      if (st === "success" || st === "error") {
        setAgentStatus(target, "idle");
      }
    }, 900);
  }
}
