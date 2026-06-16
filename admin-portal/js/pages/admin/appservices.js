import { api } from "../../core/api.js";
import { can } from "../../utils/permissions.js";
import { reloadView } from "../../shell/navigation.js";
import { showAppServiceModal } from "../../modals/index.js";
import { sfError, sfConfirm } from "../../components/dialog.js";

export async function renderAppServices(content) {
  const services = await api("GET", "/admin/app-services");
  content.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2>App services</h2>
        ${can("appservices.add") ? '<button class="btn btn-primary btn-sm" id="add-service">+ Add service</button>' : ""}
      </div>
      <p style="padding:0 22px 12px;color:var(--muted);font-size:0.85rem">
        Register external apps (APS, parking, …) with icon, name and link. They appear on the mobile login screen — tap opens the URL.
      </p>
      <div class="card-body">
        ${
          services.length
            ? `<div class="provider-admin-grid">
            ${services
              .map(
                (s) => `<div class="provider-admin-card ${s.active ? "" : "inactive"}">
              <div class="provider-logo-wrap">
                ${
                  s.icon_url
                    ? `<img src="${s.icon_url}" alt="${s.name}"/>`
                    : `<span class="provider-logo-fallback">${s.name.slice(0, 2).toUpperCase()}</span>`
                }
              </div>
              <strong>${s.name}</strong>
              <small style="word-break:break-all">${s.link_url}</small>
              <small>${s.active ? "Active" : "Hidden"} · order ${s.sort_order}</small>
              <div class="provider-admin-actions">
                <button class="btn btn-secondary btn-sm edit-service" data-id="${s.id}" data-name="${s.name}" data-link="${s.link_url}" data-active="${s.active}" data-order="${s.sort_order}">Edit</button>
                <button class="btn btn-secondary btn-sm del-service" data-id="${s.id}">Delete</button>
              </div>
            </div>`
              )
              .join("")}
          </div>`
            : `<div class="empty-state">No services yet. Add APS or other linked apps.</div>`
        }
      </div>
    </div>`;
  document.getElementById("add-service")?.addEventListener("click", () =>
    showAppServiceModal(null, () => reloadView()).catch((e) => sfError(e.message))
  );
  document.querySelectorAll(".edit-service").forEach((btn) => {
    btn.onclick = () =>
      showAppServiceModal(
        {
          id: btn.dataset.id,
          name: btn.dataset.name,
          link_url: btn.dataset.link,
          active: btn.dataset.active === "true",
          sort_order: btn.dataset.order,
        },
        () => reloadView()
      ).catch((e) => sfError(e.message));
  });
  document.querySelectorAll(".del-service").forEach((btn) => {
    btn.onclick = async () => {
      if (!(await sfConfirm("Delete this service?", { danger: true, confirmText: "Delete" }))) return;
      await api("DELETE", `/admin/app-services/${btn.dataset.id}`);
      reloadView();
    };
  });
}
