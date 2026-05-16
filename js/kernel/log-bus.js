/** @typedef {{ id: string; ts: number; level: 'info' | 'warn' | 'error' | 'agent'; agentId?: string; message: string }} LogEntry */

const MAX = 800;
/** @type {LogEntry[]} */
let entries = [];
/** @type {Set<(e: LogEntry) => void>} */
const subs = new Set();

function push(entry) {
  entries = [...entries.slice(-(MAX - 1)), entry];
  subs.forEach((fn) => {
    try {
      fn(entry);
    } catch {
      /* ignore */
    }
  });
}

/**
 * @param {Omit<LogEntry, 'id' | 'ts'> & { id?: string; ts?: number }} partial
 */
export function logLine(partial) {
  const entry = {
    id: partial.id ?? `l_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    ts: partial.ts ?? Date.now(),
    level: partial.level,
    agentId: partial.agentId,
    message: partial.message,
  };
  push(entry);
  return entry;
}

/** @param {(e: LogEntry) => void} fn */
export function subscribeLogs(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

/** @returns {LogEntry[]} */
export function getLogSnapshot() {
  return [...entries];
}

export function clearLogs() {
  entries = [];
}
