const ICONS = {
  success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></svg>`,
  error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>`,
  warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3L2 20h20L12 3z"/><path d="M12 10v4M12 17h.01"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>`,
  confirm: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01"/><circle cx="12" cy="12" r="10"/></svg>`,
};

const TITLES = {
  success: "Success",
  error: "Error",
  warning: "Warning",
  info: "Notice",
  confirm: "Confirm",
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMessage(message) {
  if (!message) return "";
  if (message.includes("<")) return message;
  return escapeHtml(message).replace(/\n/g, "<br/>");
}

let dialogQueue = Promise.resolve();

function enqueue(fn) {
  const run = dialogQueue.then(fn);
  dialogQueue = run.catch(() => {});
  return run;
}

function showDialog(options) {
  return enqueue(() => new Promise((resolve) => {
    const {
      type = "info",
      title = TITLES[type] || "Notice",
      message = "",
      confirmText = "OK",
      cancelText = "Cancel",
      showCancel = false,
      danger = false,
    } = options;

    const overlay = document.createElement("div");
    overlay.className = "sf-dialog-overlay";
    overlay.innerHTML = `
      <div class="sf-dialog sf-dialog-${type}" role="alertdialog" aria-modal="true">
        <div class="sf-dialog-icon">${ICONS[type] || ICONS.info}</div>
        <h3 class="sf-dialog-title">${escapeHtml(title)}</h3>
        <div class="sf-dialog-message">${formatMessage(message)}</div>
        <div class="sf-dialog-actions">
          ${showCancel ? `<button type="button" class="btn btn-secondary sf-dialog-cancel">${escapeHtml(cancelText)}</button>` : ""}
          <button type="button" class="btn ${danger ? "btn-danger" : "btn-primary"} sf-dialog-confirm">${escapeHtml(confirmText)}</button>
        </div>
      </div>`;

    const close = (value) => {
      overlay.classList.add("sf-dialog-out");
      setTimeout(() => {
        overlay.remove();
        resolve(value);
      }, 180);
    };

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("sf-dialog-in"));

    overlay.querySelector(".sf-dialog-confirm").onclick = () => close(true);
    overlay.querySelector(".sf-dialog-cancel")?.addEventListener("click", () => close(false));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay && !showCancel) close(true);
    });

    const onKey = (e) => {
      if (e.key === "Escape") {
        document.removeEventListener("keydown", onKey);
        close(showCancel ? false : true);
      }
      if (e.key === "Enter") {
        document.removeEventListener("keydown", onKey);
        close(true);
      }
    };
    document.addEventListener("keydown", onKey);
    overlay.querySelector(".sf-dialog-confirm").focus();
  }));
}

export function sfAlert(message, opts = {}) {
  return showDialog({
    type: opts.type || "info",
    title: opts.title,
    message,
    confirmText: opts.confirmText || "OK",
  });
}

export function sfSuccess(message, title = "Saved") {
  return showDialog({ type: "success", title, message, confirmText: "OK" });
}

export function sfError(message, title = "Something went wrong") {
  return showDialog({ type: "error", title, message, confirmText: "OK" });
}

export function sfWarning(message, title = "Warning") {
  return showDialog({ type: "warning", title, message, confirmText: "OK" });
}

export function sfConfirm(message, opts = {}) {
  return showDialog({
    type: opts.danger ? "warning" : "confirm",
    title: opts.title || (opts.danger ? "Are you sure?" : "Confirm"),
    message,
    confirmText: opts.confirmText || (opts.danger ? "Delete" : "Confirm"),
    cancelText: opts.cancelText || "Cancel",
    showCancel: true,
    danger: !!opts.danger,
  }).then((ok) => !!ok);
}
