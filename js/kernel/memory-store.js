const LS_KEY = "neural_grid_memory_v1";

/** @typedef {{ id: string; ts: number; key: string; value: string; sourceAgent: string }} MemoryEntry */

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

/** @param {() => void} fn */
export function subscribeMemory(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

/** @returns {MemoryEntry[]} */
export function loadMemory() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

/** @param {MemoryEntry[]} rows */
function saveMemory(rows) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(rows.slice(-200)));
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {{ key: string; value: string; sourceAgent: string }} row
 * @returns {boolean}
 */
export function appendMemory(row) {
  const prev = loadMemory();
  const entry = {
    id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ts: Date.now(),
    key: row.key.slice(0, 120),
    value: row.value.slice(0, 4000),
    sourceAgent: row.sourceAgent,
  };
  const ok = saveMemory([...prev, entry]);
  if (ok) emit();
  return ok;
}

export function clearMemoryStore() {
  try {
    localStorage.removeItem(LS_KEY);
    emit();
    return true;
  } catch {
    return false;
  }
}
