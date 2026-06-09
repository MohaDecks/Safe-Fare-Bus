import { api } from "../../core/api.js";
import { can } from "../../utils/permissions.js";
import { reloadView } from "../../shell/navigation.js";
import { showRoleModal } from "../../modals/index.js";
import { sfError, sfConfirm } from "../../components/dialog.js";

export async function renderStaffroles(content) {
    const roles = await api("GET", "/admin/roles");
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2>Staff roles</h2>
          ${can("staffroles.add") ? '<button class="btn btn-primary btn-sm" id="add-role">+ Add role</button>' : ""}
        </div>
        <p style="padding:0 22px 12px;color:var(--muted);font-size:0.85rem">
          Saved in database (<code>roles</code>). Add, edit, or delete any role.
          <strong>Staff → Add staff</strong> dropdown uses this list. Delete old rows once, then add your own.
        </p>
        <div class="card-body table-wrap">
          <table><thead><tr><th>Role</th><th>Slug</th><th>Portal</th><th>Mobile</th><th>Type</th><th>Actions</th></tr></thead>
          <tbody>${roles
            .map(
              (r) => `<tr>
              <td><strong>${r.label}</strong><br/><small style="color:var(--muted)">${r.description || ""}</small></td>
              <td><code>${r.slug}</code></td>
              <td>${r.can_use_portal ? "✓" : "—"}</td>
              <td>${r.can_use_mobile ? "✓" : "—"}</td>
              <td>${r.company_id ? '<span class="badge badge-amber">Yours</span>' : '<span class="badge badge-blue">Legacy</span>'}</td>
              <td style="white-space:nowrap">
                ${can("staffroles.update") ? `<button class="btn btn-secondary btn-sm edit-role" data-id="${r.id}">Edit</button> ` : ""}
                ${can("staffroles.delete") ? `<button class="btn btn-secondary btn-sm del-role" data-id="${r.id}">Delete</button>` : ""}
              </td>
            </tr>`
            )
            .join("")}</tbody></table>
        </div>
      </div>`;
    document.getElementById("add-role")?.addEventListener("click", () => showRoleModal(null, () => reloadView()));
    document.querySelectorAll(".edit-role").forEach((btn) => {
      const r = roles.find((x) => x.id === btn.dataset.id);
      btn.onclick = () => showRoleModal(r, () => reloadView()).catch((e) => sfError(e.message));
    });
    document.querySelectorAll(".del-role").forEach((btn) => {
      btn.onclick = async () => {
        if (!(await sfConfirm("Delete this role?", { danger: true, confirmText: "Delete" }))) return;
        await api("DELETE", `/admin/roles/${btn.dataset.id}`);
        reloadView();
      };
    });
}
