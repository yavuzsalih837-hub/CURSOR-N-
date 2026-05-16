const COLUMN_LABELS = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

const COLUMN_ORDER = ["todo", "in_progress", "done"];

/**
 * @param {HTMLElement} root
 * @param {{ id: string; title: string; column: string }[]} tasks
 * @param {{ onMove: (id: string, delta: number) => void }} handlers
 */
export function renderTaskBoard(root, tasks, handlers) {
  const byCol = (col) => tasks.filter((t) => t.column === col);

  root.innerHTML = COLUMN_ORDER.map((col) => {
    const items = byCol(col);
    const cards = items
      .map((t) => {
        const idx = COLUMN_ORDER.indexOf(t.column);
        const canLeft = idx > 0;
        const canRight = idx < COLUMN_ORDER.length - 1;
        return `
          <div class="task-card" data-task-id="${escapeAttr(t.id)}">
            <p class="task-card__title">${escapeHtml(t.title)}</p>
            <div class="task-card__actions">
              <button type="button" class="btn btn--sm" data-move="${escapeAttr(t.id)}" data-delta="-1" ${canLeft ? "" : "disabled"}>←</button>
              <button type="button" class="btn btn--sm" data-move="${escapeAttr(t.id)}" data-delta="1" ${canRight ? "" : "disabled"}>→</button>
            </div>
          </div>
        `;
      })
      .join("");

    return `
      <div class="task-col" data-column="${escapeAttr(col)}">
        <div class="task-col__head">${escapeHtml(COLUMN_LABELS[col] || col)}</div>
        <div class="task-col__body">${cards || '<p class="panel__hint" style="margin:0.5rem">No tasks</p>'}</div>
      </div>
    `;
  }).join("");

  root.querySelectorAll("[data-move]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-move");
      const d = Number(btn.getAttribute("data-delta"));
      if (id && Number.isFinite(d)) handlers.onMove(id, d);
    });
  });
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
