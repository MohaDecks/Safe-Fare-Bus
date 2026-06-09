import { sfSuccess } from "./dialog.js";

export function openModal(title, bodyHtml, onSave, viewOnly = false, successMessage = "Saved successfully") {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">${title}</div>
      <div class="modal-body">${bodyHtml}<p id="modal-err" class="alert alert-error hidden" style="margin-top:12px"></p></div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="modal-cancel">${viewOnly ? "Close" : "Cancel"}</button>
        ${viewOnly ? "" : '<button class="btn btn-primary" id="modal-save">Save</button>'}
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };
  document.getElementById("modal-cancel").onclick = () => overlay.remove();
  if (!viewOnly && onSave) {
    document.getElementById("modal-save").onclick = async () => {
      const saveBtn = document.getElementById("modal-save");
      const err = document.getElementById("modal-err");
      const originalLabel = saveBtn.textContent;
      try {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="btn-spinner"></span> Saving…';
        err.classList.add("hidden");
        await onSave(overlay);
        overlay.remove();
        if (successMessage) await sfSuccess(successMessage);
      } catch (e) {
        saveBtn.disabled = false;
        saveBtn.textContent = originalLabel;
        err.textContent = e.message;
        err.classList.remove("hidden");
      }
    };
  }
}
