let count = 0;
let overlay = null;

function ensureOverlay() {
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.className = "sf-loading-overlay";
  overlay.innerHTML = `
    <div class="sf-loading-card">
      <div class="sf-loading-spinner" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
      <p class="sf-loading-text">Loading…</p>
    </div>`;
  document.body.appendChild(overlay);
  return overlay;
}

export function showLoading(message = "Loading…") {
  count += 1;
  const el = ensureOverlay();
  el.querySelector(".sf-loading-text").textContent = message;
  el.classList.add("sf-loading-visible");
  return hideLoading;
}

export function hideLoading() {
  count = Math.max(0, count - 1);
  if (count === 0 && overlay) {
    overlay.classList.remove("sf-loading-visible");
  }
}

export async function withLoading(fn, message = "Loading…") {
  showLoading(message);
  try {
    return await fn();
  } finally {
    hideLoading();
  }
}
