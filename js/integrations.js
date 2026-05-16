/**
 * @returns {Record<string, unknown>}
 */
export function getSampleN8nPayload() {
  return {
    source: "agentos-mvp",
    event: "test_webhook",
    timestamp: new Date().toISOString(),
    payload: {
      message: "Test from AgentOS Integrations page",
      run_id: null,
      step_id: null,
    },
  };
}

/**
 * @param {HTMLElement} root
 * @param {{
 *   initialUrl: string;
 *   placeholder: string;
 *   onSaveUrl: (url: string) => boolean;
 *   onCopy: (url: string) => void;
 *   onTest: (url: string) => void | Promise<void>;
 * }} opts
 */
export function renderN8nPanel(root, opts) {
  const safeInitial = escapeAttr(opts.initialUrl || "");
  const ph = escapeAttr(opts.placeholder || "");

  root.innerHTML = `
    <span class="panel__label">n8n webhook URL</span>
    <input
      type="url"
      class="panel__input"
      id="n8n-webhook-url"
      value="${safeInitial}"
      placeholder="${ph}"
      autocomplete="off"
      spellcheck="false"
      aria-label="n8n webhook URL"
    />
    <p class="panel__hint" style="margin-top:0.5rem">Saved in this browser when you leave the field or run a test.</p>
    <div class="panel__row" style="margin-top:0.75rem">
      <button type="button" class="btn btn--primary" id="btn-n8n-copy">Copy URL</button>
      <button type="button" class="btn btn--primary" id="btn-n8n-test">Test Webhook</button>
    </div>
    <p class="panel__hint">Sends a POST with JSON (sample payload). If the browser blocks the request (CORS), open n8n and allow your origin or use a server-side proxy later.</p>
  `;

  const input = root.querySelector("#n8n-webhook-url");
  if (!(input instanceof HTMLInputElement)) return;

  input.addEventListener("blur", () => {
    const url = input.value.trim();
    opts.onSaveUrl(url);
  });

  root.querySelector("#btn-n8n-copy")?.addEventListener("click", () => {
    opts.onCopy(input.value.trim());
  });

  root.querySelector("#btn-n8n-test")?.addEventListener("click", () => {
    opts.onTest(input.value.trim());
  });
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
