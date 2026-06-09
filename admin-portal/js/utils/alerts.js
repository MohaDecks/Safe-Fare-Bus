export function showAlert(id, msg, isError) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = `<div class="alert ${isError ? "alert-error" : "alert-success"}">${msg}</div>`;
}
