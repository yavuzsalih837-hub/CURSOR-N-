import { createAgentDefinitions } from "./agent-types.js";

/** @typedef {import('./agent-types.js').AgentStatus} AgentStatus */

/** @typedef {{ id: string; description: string; status: 'queued' | 'routing' | 'running' | 'done' | 'failed'; routedTo?: string; created: number; error?: string }} Mission */

/** @type {Map<string, AgentStatus>} */
const statusByAgent = new Map();

/** @type {Mission[]} */
let missions = [];

/** @type {Set<() => void>} */
const subs = new Set();

function emit() {
  subs.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
}

export function initOrchestra() {
  createAgentDefinitions().forEach((a) => {
    if (!statusByAgent.has(a.id)) statusByAgent.set(a.id, "idle");
  });
}

/**
 * @param {string} agentId
 * @param {AgentStatus} s
 */
export function setAgentStatus(agentId, s) {
  statusByAgent.set(agentId, s);
  emit();
}

/** @param {string} agentId */
export function getAgentStatus(agentId) {
  return statusByAgent.get(agentId) ?? "idle";
}

/** @returns {{ id: string; status: AgentStatus }[]} */
export function getAllAgentStatuses() {
  return createAgentDefinitions().map((a) => ({
    id: a.id,
    status: getAgentStatus(a.id),
  }));
}

/** @param {Omit<Mission, 'created'> & { created?: number }} m */
export function addMission(m) {
  const mission = {
    id: m.id,
    description: m.description,
    status: m.status,
    routedTo: m.routedTo,
    created: m.created ?? Date.now(),
    error: m.error,
  };
  missions = [mission, ...missions].slice(0, 50);
  emit();
  return mission;
}

/** @param {string} id */
export function updateMission(id, patch) {
  missions = missions.map((x) => (x.id === id ? { ...x, ...patch } : x));
  emit();
}

/** @returns {Mission[]} */
export function getMissions() {
  return [...missions];
}

/** @param {() => void} fn */
export function subscribeOrchestra(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

export function resetAgentStatusesIdle() {
  createAgentDefinitions().forEach((a) => statusByAgent.set(a.id, "idle"));
  emit();
}
