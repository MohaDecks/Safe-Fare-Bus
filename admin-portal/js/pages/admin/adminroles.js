import { api } from "../../core/api.js";
import { can } from "../../utils/permissions.js";
import { reloadView } from "../../shell/navigation.js";
import { showAdminRoleModal } from "../../modals/index.js";
import { sfError, sfConfirm } from "../../components/dialog.js";

export async function renderAdminroles(content) {
    const roles = await api("GET", "/admin/admin-roles");
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2>Roles</h2>
          ${can("roles.add") ? '<button class="btn btn-primary btn-sm" id="add-arole">+ Add Role</button>' : ""}
        </div>
        <div class="card-body table-wrap">
          <table class="roles-table"><thead><tr><th>Name</th><th>Description</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>${roles
            .map(
              (r) => `<tr>
              <td><strong>${r.label}</strong></td>
              <td>${r.description || "—"}</td>
              <td>${r.active !== false ? '<span class="badge badge-green">Active</span>' : '<span class="badge">Inactive</span>'}</td>
              <td class="roles-actions">
                ${can("roles.update") ? `<button type="button" class="btn-icon edit-arole" data-id="${r.id}" title="Edit">✎</button>` : ""}
                ${can("roles.delete") ? `<button type="button" class="btn-icon del-arole danger" data-id="${r.id}" title="Delete">🗑</button>` : ""}
              </td></tr>`
            )
            .join("")}</tbody></table>
        </div>
      </div>
      <p style="margin-top:12px;color:var(--muted);font-size:0.85rem">Set access rights on the <strong>Permissions</strong> page.</p>`;
    document.getElementById("add-arole")?.addEventListener("click", () =>
      showAdminRoleModal(null, () => reloadView()).catch((e) => sfError(e.message))
    );
    document.querySelectorAll(".edit-arole").forEach((btn) => {
      const r = roles.find((x) => x.id === btn.dataset.id);
      btn.onclick = () => showAdminRoleModal(r, () => reloadView()).catch((e) => sfError(e.message));
    });
    document.querySelectorAll(".del-arole").forEach((btn) => {
      btn.onclick = async () => {
        if (!(await sfConfirm("Delete this role?", { danger: true, confirmText: "Delete" }))) return;
        await api("DELETE", `/admin/admin-roles/${btn.dataset.id}`);
        reloadView();
      };
    });
}
