/** @typedef {{ id: string; ts: number; from: string; to: string; body: string; kind: 'handoff' | 'reply' | 'broadcast' }} CommMessage */

const MAX = 200;
/** @type {CommMessage[]} */
let messages = [];
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

/**
 * @param {Omit<CommMessage, 'id' | 'ts'>} m
 */
export function postComm(m) {
  const msg = {
    id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    ...m,
  };
  messages = [...messages.slice(-(MAX - 1)), msg];
  emit();
  return msg;
}

/** @returns {CommMessage[]} */
export function getComms() {
  return [...messages];
}

export function clearComms() {
  messages = [];
  emit();
}

/** @param {() => void} fn */
export function subscribeComms(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}
