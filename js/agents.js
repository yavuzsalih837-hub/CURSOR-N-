/**
 * @param {HTMLElement} root
 * @param {{ id: string; name: string; role: string; accent: string }[]} defs
 * @param {{ id: string; status: string }[]} statuses
 */
export function renderAgentMesh(root, defs, statuses) {
  const byId = new Map(statuses.map((s) => [s.id, s.status]));
  root.innerHTML = defs
    .map((a) => {
      const st = byId.get(a.id) ?? "idle";
      const cls = statusClass(st);
      const label = statusLabel(st);
      return `
        <article class="agent-tile agent-tile--${escapeAttr(a.accent)}" data-agent-id="${escapeAttr(a.id)}">
          <div class="agent-tile__head">
            <span class="agent-tile__glyph" aria-hidden="true"></span>
            <h3 class="agent-tile__name">${escapeHtml(a.name)}</h3>
          </div>
          <p class="agent-tile__role">${escapeHtml(a.role)}</p>
          <div class="agent-tile__foot">
            <span class="agent-status ${cls}">
              <span class="agent-status__dot" aria-hidden="true"></span>
              ${escapeHtml(label)}
            </span>
            <span class="agent-tile__id mono">${escapeHtml(a.id)}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

/** @param {string} st */
function statusLabel(st) {
  switch (st) {
    case "idle":
      return "Idle";
    case "thinking":
      return "Thinking";
    case "executing":
      return "Executing";
    case "success":
      return "Signal OK";
    case "error":
      return "Fault";
    default:
      return st;
  }
}

/** @param {string} st */
function statusClass(st) {
  return `agent-status--${st}`;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}
