import { api } from "../../core/api.js";
import { can } from "../../utils/permissions.js";
import { reloadView } from "../../shell/navigation.js";
import { showAppServiceModal } from "../../modals/index.js";
import { sfError, sfConfirm } from "../../components/dialog.js";
import { prepareBannerUpload } from "../../utils/imageUpload.js";

export async function renderAppServices(content) {
  const [services, company] = await Promise.all([
    api("GET", "/admin/app-services"),
    can("dashboard.view") ? api("GET", "/admin/company").catch(() => ({})) : Promise.resolve({}),
  ]);
  const bannerUrl = company?.hub_banner_url || "";
  content.innerHTML = `
    <div class="card" style="margin-bottom:20px">
      <div class="card-header"><h2>Home banner image</h2></div>
      <p style="padding:0 22px 12px;color:var(--muted);font-size:0.85rem">
        Text on the left stays the same. Upload the <strong>right-side</strong> picture (phone, bus, car…). PNG or JPG.
      </p>
      <div class="card-body" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
        <div style="width:220px;height:110px;border-radius:12px;overflow:hidden;background:#B80611;flex-shrink:0">
          ${
            bannerUrl
              ? `<img src="${bannerUrl}" alt="Banner" style="width:100%;height:100%;object-fit:cover"/>`
              : `<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:0.8rem">No image yet</div>`
          }
        </div>
        <div>
          ${
            can("dashboard.view")
              ? `<label class="btn btn-secondary btn-sm">
              ${bannerUrl ? "Change image" : "Upload image"}
              <input type="file" id="hub-banner-file" accept="image/png,image/jpeg,image/webp,image/gif" hidden />
            </label>
            ${bannerUrl ? '<button type="button" class="btn btn-secondary btn-sm" id="hub-banner-delete" style="margin-left:8px">Remove</button>' : ""}`
              : ""
          }
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <h2>App services</h2>
        ${can("appservices.add") ? '<button class="btn btn-primary btn-sm" id="add-service">+ Add service</button>' : ""}
      </div>
      <p style="padding:0 22px 12px;color:var(--muted);font-size:0.85rem">
        Choose <strong>Our Services</strong> or <strong>New Mini Apps</strong> so the tile appears in the matching section on the Dirsha home screen.
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
              <small>${s.placement === "mini_app" ? "New Mini Apps" : "Our Services"} · ${s.active ? "Active" : "Hidden"} · order ${s.sort_order}</small>
              <div class="provider-admin-actions">
                <button class="btn btn-secondary btn-sm edit-service" data-id="${s.id}" data-name="${s.name}" data-link="${s.link_url}" data-active="${s.active}" data-order="${s.sort_order}" data-placement="${s.placement || "service"}">Edit</button>
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

  document.getElementById("hub-banner-file")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const banner_base64 = await prepareBannerUpload(file);
      await api("PATCH", "/admin/company/hub-banner", { banner_base64 });
      reloadView();
    } catch (err) {
      sfError(err.message);
    }
  });
  document.getElementById("hub-banner-delete")?.addEventListener("click", async () => {
    if (!(await sfConfirm("Remove the home banner image?", { danger: true, confirmText: "Remove" }))) return;
    try {
      await api("DELETE", "/admin/company/hub-banner");
      reloadView();
    } catch (err) {
      sfError(err.message);
    }
  });

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
          placement: btn.dataset.placement,
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
