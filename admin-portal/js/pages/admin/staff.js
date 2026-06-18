import { api } from "../../core/api.js";
import { can } from "../../utils/permissions.js";
import { roleLabel } from "../../utils/format.js";
import { reloadView } from "../../shell/navigation.js";
import { showStaffModal } from "../../modals/index.js";
import { sfError } from "../../components/dialog.js";

export async function renderStaff(content) {
    const staff = await api("GET", "/admin/staff");
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2>Company staff</h2>
          ${can("staff.add") ? '<button class="btn btn-primary btn-sm" id="add-staff">+ Add staff</button>' : ""}
        </div>
        <p style="padding:0 22px 12px;color:var(--muted);font-size:0.85rem">
          Roles come from <strong>Staff roles</strong> page. Only admin can create accounts here.
        </p>
        <div class="card-body table-wrap">
          ${
            staff.length
              ? `<table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Phone</th></tr></thead><tbody>
              ${staff
                .map(
                  (s) => `<tr>
                <td>${s.name}</td><td>${s.email}</td>
                <td><span class="badge ${s.role === "cashier" ? "badge-green" : "badge-amber"}">${s.role_label || roleLabel(s.role)}</span></td>
                <td>${s.phone || "—"}</td></tr>`
                )
                .join("")}</tbody></table>`
              : `<div class="empty-state">No staff registered. Add cashiers.</div>`
          }
        </div>
      </div>`;
    document.getElementById("add-staff")?.addEventListener("click", () =>
      showStaffModal(() => reloadView()).catch((e) => sfError(e.message))
    );
}
