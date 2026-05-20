const LS_KEY = "neural_grid_openai_key_v1";
const LS_MODEL = "neural_grid_openai_model_v1";

/** @returns {string} */
export function loadApiKey() {
  try {
    const v = localStorage.getItem(LS_KEY);
    return typeof v === "string" ? v.trim() : "";
  } catch {
    return "";
  }
}

/** @param {string} key */
export function saveApiKey(key) {
  try {
    const t = typeof key === "string" ? key.trim() : "";
    if (t) localStorage.setItem(LS_KEY, t);
    else localStorage.removeItem(LS_KEY);
    return true;
  } catch {
    return false;
  }
}

/** @returns {string} */
export function loadModel() {
  try {
    const v = localStorage.getItem(LS_MODEL);
    return typeof v === "string" && v.trim() ? v.trim() : "gpt-4o-mini";
  } catch {
    return "gpt-4o-mini";
  }
}

/** @param {string} model */
export function saveModel(model) {
  try {
    const t = typeof model === "string" ? model.trim() : "";
    localStorage.setItem(LS_MODEL, t || "gpt-4o-mini");
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {{ messages: { role: string; content: string }[]; temperature?: number; responseFormatJson?: boolean }} opts
 * @returns {Promise<string>}
 */
export async function chatComplete(opts) {
  const key = loadApiKey();
  if (!key) throw new Error("OpenAI API key not configured");

  const body = {
  model: loadModel(),
  messages: opts.messages,
  stream: false,
  options: {
    temperature: opts.temperature ?? 0.3
  }
};

  const res = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: {
    
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 280)}`);
  }

  const data = await res.json();
const text = data?.message?.content || data?.choices?.[0]?.message?.content;

if (typeof text !== "string") throw new Error("Empty model response");
return text;
}
