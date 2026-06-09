import { api } from "../../core/api.js";
import { can } from "../../utils/permissions.js";
import { reloadView } from "../../shell/navigation.js";
import { showPaymentProviderModal } from "../../modals/index.js";
import { sfError, sfConfirm } from "../../components/dialog.js";

export async function renderTopup(content) {
    const providers = await api("GET", "/admin/payment-providers");
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2>Top-up apps (Ethiopia)</h2>
          ${can("topup.add") ? '<button class="btn btn-primary btn-sm" id="add-provider">+ Add app</button>' : ""}
        </div>
        <p style="padding:0 22px 12px;color:var(--muted);font-size:0.85rem">
          Upload logo (PNG/JPG). Passengers see these on <strong>Top up</strong> in the mobile app (Telebirr, CBE Birr, eBirr, Kaafi, Coopay, …).
        </p>
        <div class="card-body">
          ${
            providers.length
              ? `<div class="provider-admin-grid">
              ${providers
                .map(
                  (p) => `<div class="provider-admin-card ${p.active ? "" : "inactive"}">
                <div class="provider-logo-wrap">
                  ${
                    p.logo_url
                      ? `<img src="${p.logo_url}" alt="${p.name}"/>`
                      : `<span class="provider-logo-fallback">${p.name.slice(0, 2).toUpperCase()}</span>`
                  }
                </div>
                <strong>${p.name}</strong>
                <small>${p.active ? "Active" : "Hidden"} · order ${p.sort_order}</small>
                <div class="provider-admin-actions">
                  <button class="btn btn-secondary btn-sm edit-provider" data-id="${p.id}" data-name="${p.name}" data-active="${p.active}" data-order="${p.sort_order}">Edit</button>
                  <button class="btn btn-secondary btn-sm del-provider" data-id="${p.id}">Delete</button>
                </div>
              </div>`
                )
                .join("")}
            </div>`
              : `<div class="empty-state">No payment apps yet. Add Telebirr, CBE Birr, etc.</div>`
          }
        </div>
      </div>`;
    document.getElementById("add-provider")?.addEventListener("click", () =>
      showPaymentProviderModal(null, () => reloadView()).catch((e) => sfError(e.message))
    );
    document.querySelectorAll(".edit-provider").forEach((btn) => {
      btn.onclick = () =>
        showPaymentProviderModal(
          {
            id: btn.dataset.id,
            name: btn.dataset.name,
            active: btn.dataset.active === "true",
            sort_order: btn.dataset.order,
          },
          () => reloadView()
        ).catch((e) => sfError(e.message));
    });
    document.querySelectorAll(".del-provider").forEach((btn) => {
      btn.onclick = async () => {
        if (!(await sfConfirm("Delete this payment app?", { danger: true, confirmText: "Delete" }))) return;
        await api("DELETE", `/admin/payment-providers/${btn.dataset.id}`);
        reloadView();
      };
    });
}
