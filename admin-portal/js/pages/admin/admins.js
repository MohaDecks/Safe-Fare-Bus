import { api } from "../../core/api.js";
import { reloadView } from "../../shell/navigation.js";
import { showAdminUserModal } from "../../modals/index.js";
import { sfError, sfConfirm } from "../../components/dialog.js";

export async function renderAdmins(content) {
    const admins = await api("GET", "/admin/admins");
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2>Portal admin accounts</h2>
          <button class="btn btn-primary btn-sm" id="add-admin">+ Register admin</button>
        </div>
        <p style="padding:0 22px 12px;color:var(--muted);font-size:0.85rem">
          Only <strong>you</strong> (Super Admin) can add or disable admins. Assign them a role on <strong>Permissions</strong>.
        </p>
        <div class="card-body table-wrap">
          <table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
          <tbody>${admins
            .map(
              (a) => `<tr>
              <td><strong>${a.name}</strong></td>
              <td>${a.email}</td>
              <td>${a.is_super_admin ? '<span class="badge badge-blue">Super Admin</span>' : a.admin_role_label || "—"}</td>
              <td>${a.active !== false ? '<span class="badge badge-green">Active</span>' : '<span class="badge">Disabled</span>'}</td>
              <td>
                ${!a.is_super_admin ? `<button class="btn btn-secondary btn-sm edit-admin" data-id="${a.id}">Edit</button>` : ""}
                ${!a.is_super_admin ? `<button class="btn btn-secondary btn-sm del-admin" data-id="${a.id}">Disable</button>` : ""}
              </td></tr>`
            )
            .join("")}</tbody></table>
        </div>
      </div>`;
    document.getElementById("add-admin")?.addEventListener("click", () =>
      showAdminUserModal(null, () => reloadView()).catch((e) => sfError(e.message))
    );
    document.querySelectorAll(".edit-admin").forEach((btn) => {
      const a = admins.find((x) => x.id === btn.dataset.id);
      btn.onclick = () => showAdminUserModal(a, () => reloadView()).catch((e) => sfError(e.message));
    });
    document.querySelectorAll(".del-admin").forEach((btn) => {
      btn.onclick = async () => {
        if (!(await sfConfirm("Disable this admin?", { danger: true, confirmText: "Disable" }))) return;
        await api("DELETE", `/admin/admins/${btn.dataset.id}`);
        reloadView();
      };
    });
}
