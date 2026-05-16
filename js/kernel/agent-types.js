/** @typedef {'idle' | 'thinking' | 'executing' | 'success' | 'error'} AgentStatus */

export const AGENT_IDS = {
  MANAGER: "manager",
  RESEARCH: "research",
  OUTREACH: "outreach",
  CONTENT: "content",
  AUTOMATION: "automation",
};

/** @returns {{ id: string; name: string; role: string; accent: string }[]} */
export function createAgentDefinitions() {
  return [
    {
      id: AGENT_IDS.MANAGER,
      name: "Manager",
      role: "Mission intake, routing, synthesis",
      accent: "cyan",
    },
    {
      id: AGENT_IDS.RESEARCH,
      name: "Research",
      role: "Sources, synthesis, competitive intel",
      accent: "violet",
    },
    {
      id: AGENT_IDS.OUTREACH,
      name: "Outreach",
      role: "Sequences, personalization, follow-ups",
      accent: "magenta",
    },
    {
      id: AGENT_IDS.CONTENT,
      name: "Content",
      role: "Copy, narratives, editorial systems",
      accent: "amber",
    },
    {
      id: AGENT_IDS.AUTOMATION,
      name: "Automation",
      role: "Workflows, webhooks, integrations",
      accent: "green",
    },
  ];
}
