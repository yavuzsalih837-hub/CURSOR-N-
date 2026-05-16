import { AGENT_IDS } from "./agent-types.js";
import { chatComplete } from "./openai-client.js";

const RULES = [
  { id: AGENT_IDS.RESEARCH, patterns: /\b(research|source|citation|competitor|market|analyze|analysis|data|study|report|intel)\b/i },
  { id: AGENT_IDS.OUTREACH, patterns: /\b(outreach|email|cold|prospect|dm|sequence|partner|pitch|linkedin|call)\b/i },
  { id: AGENT_IDS.CONTENT, patterns: /\b(content|blog|copy|landing|seo|editorial|narrative|creative|post|article)\b/i },
  { id: AGENT_IDS.AUTOMATION, patterns: /\b(automation|n8n|zapier|webhook|script|cron|workflow|api|integrat|pipeline)\b/i },
];

/**
 * @param {string} text
 * @returns {typeof AGENT_IDS[keyof typeof AGENT_IDS]}
 */
export function routeHeuristic(text) {
  const t = String(text || "").trim();
  if (!t) return AGENT_IDS.MANAGER;
  for (const r of RULES) {
    if (r.patterns.test(t)) return /** @type {typeof r.id} */ (r.id);
  }
  return AGENT_IDS.MANAGER;
}

/**
 * @param {string} userTask
 * @returns {Promise<{ target: string; rationale: string }>}
 */
export async function routeWithLlm(userTask) {
  const raw = await chatComplete({
    temperature: 0.1,
    responseFormatJson: true,
    messages: [
      {
        role: "system",
        content: `You route tasks to exactly one specialist id. Valid ids: ${AGENT_IDS.MANAGER}, ${AGENT_IDS.RESEARCH}, ${AGENT_IDS.OUTREACH}, ${AGENT_IDS.CONTENT}, ${AGENT_IDS.AUTOMATION}.
Return JSON: {"target":"<id>","rationale":"<short>"}.
Use ${AGENT_IDS.MANAGER} for multi-domain orchestration or ambiguity.`,
      },
      { role: "user", content: userTask },
    ],
  });
  try {
    const j = JSON.parse(raw);
    const target = typeof j.target === "string" ? j.target : AGENT_IDS.MANAGER;
    const rationale = typeof j.rationale === "string" ? j.rationale : "";
    const allowed = new Set(Object.values(AGENT_IDS));
    return { target: allowed.has(target) ? target : AGENT_IDS.MANAGER, rationale };
  } catch {
    return { target: AGENT_IDS.MANAGER, rationale: "JSON parse failed — defaulting to Manager" };
  }
}
