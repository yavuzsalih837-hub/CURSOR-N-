/**
 * @param {HTMLElement} root
 * @param {{ id: string; name: string; email: string; stage: string }[]} rows
 */
export function renderCrm(root, rows) {
  const body = rows
    .map(
      (r) => `
      <tr>
        <td>${escapeHtml(r.name)}</td>
        <td>${escapeHtml(r.email)}</td>
        <td>${escapeHtml(r.stage)}</td>
      </tr>
    `
    )
    .join("");

  root.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Stage</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
