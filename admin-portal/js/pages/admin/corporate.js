import { api } from "../../core/api.js";
import { can } from "../../utils/permissions.js";
import { formatBirr } from "../../utils/format.js";
import { reloadView } from "../../shell/navigation.js";
import { showCorporateModal } from "../../modals/index.js";

export async function renderCorporate(content) {
    const corps = await api("GET", "/admin/corporates");
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2>Corporate companies</h2>
          ${can("corporate.add") ? '<button class="btn btn-primary btn-sm" id="add-corp">+ Register company</button>' : ""}
        </div>
        <p style="padding:0 22px 12px;color:var(--muted);font-size:0.85rem">
          Only admin creates accounts here. Give the company <strong>email + password</strong> — they sign in on the mobile app → <strong>Corporate</strong>.
        </p>
        <div class="card-body table-wrap">
          ${
            corps.length
              ? `<table><thead><tr><th>#</th><th>Company</th><th>Contact</th><th>Login email</th><th>Wallet</th><th>Employees</th><th>Status</th><th></th></tr></thead><tbody>
              ${corps
                .map(
                  (c) => `<tr>
                <td>${c.row}</td>
                <td><strong>${c.company_name}</strong></td>
                <td>${c.contact_name}<br/><small>${c.phone_display || ""}</small></td>
                <td><code>${c.email}</code></td>
                <td>${formatBirr(c.wallet_birr)}</td>
                <td>${c.employees}</td>
                <td>${c.active ? '<span class="badge badge-green">Active</span>' : '<span class="badge">Off</span>'}</td>
                <td>${can("corporate.update") ? `<button type="button" class="btn btn-secondary btn-sm edit-corp" data-id="${c.id}">Edit</button>` : "—"}</td>
              </tr>`
                )
                .join("")}</tbody></table>`
              : `<div class="empty-state">No corporate companies yet. Click <strong>Register company</strong>.</div>`
          }
        </div>
      </div>`;
    document.getElementById("add-corp")?.addEventListener("click", () => showCorporateModal(() => reloadView()));
    document.querySelectorAll(".edit-corp").forEach((btn) => {
      const row = corps.find((c) => c.id === btn.dataset.id);
      btn.onclick = () => showCorporateModal(() => reloadView(), row);
    });
}
