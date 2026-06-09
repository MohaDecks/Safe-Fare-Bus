import { api } from "../../core/api.js";
import { state } from "../../core/state.js";
import { can } from "../../utils/permissions.js";
import { reloadView } from "../../shell/navigation.js";
import { sfSuccess, sfWarning } from "../../components/dialog.js";

function permToggleCell(item, field, readonly) {
  const allowKey = `allow_${field}`;
  if (!item[allowKey]) {
    return `<td class="perm-na">—</td>`;
  }
  const flag = `can${field.charAt(0).toUpperCase()}${field.slice(1)}`;
  const on = !!item[flag];
  return `<td>
    <label class="perm-switch">
      <input type="checkbox" data-menu-id="${item.menu_id}" data-flag="${flag}" ${on ? "checked" : ""} ${readonly ? "disabled" : ""}/>
      <span class="perm-slider"></span>
    </label>
  </td>`;
}

function buildPermTableRows(items, readonly) {
  return items
    .map(
      (item) => `<tr data-menu-id="${item.menu_id}">
        <td><strong>${item.menu}</strong></td>
        <td>${item.parent}</td>
        ${permToggleCell(item, "view", readonly)}
        ${permToggleCell(item, "add", readonly)}
        ${permToggleCell(item, "update", readonly)}
        ${permToggleCell(item, "delete", readonly)}
      </tr>`
    )
    .join("");
}

export async function renderPermissions(content) {
  const roles = await api("GET", "/admin/admin-roles");
  const readonly = !can("permissions.update") && !state.user.is_super_admin;
  let selectedRoleId = roles[0]?.id || "";
  let matrixItems = [];

  async function loadMatrix() {
    if (!selectedRoleId) {
      matrixItems = [];
      return;
    }
    const data = await api("GET", `/admin/permissions/role/${selectedRoleId}`);
    matrixItems = data.items || [];
  }

  await loadMatrix();

  const roleOpts = roles.map((r) => `<option value="${r.id}">${r.label}</option>`).join("");

  content.innerHTML = `
    <div class="perm-toolbar">
      <p class="perm-hint">Toggle permissions for each menu below. Saved in <strong>rolepermissions</strong> collection (per role + menu).</p>
      <div class="perm-toolbar-right">
        <label>Select Role</label>
        <select id="perm-role-select" class="perm-select">${roleOpts || '<option value="">No roles — add on Roles page</option>'}</select>
        <button type="button" class="btn btn-secondary btn-sm" id="perm-refresh">Refresh</button>
        ${readonly ? "" : '<button type="button" class="btn btn-primary btn-sm" id="perm-save">Save Permissions</button>'}
      </div>
    </div>
    <div class="card">
      <div class="card-body table-wrap">
        <table class="perm-table">
          <thead><tr><th>Menu</th><th>Parent</th><th>View</th><th>Add</th><th>Update</th><th>Delete</th></tr></thead>
          <tbody id="perm-tbody">${buildPermTableRows(matrixItems, readonly)}</tbody>
        </table>
      </div>
    </div>`;

  const selEl = document.getElementById("perm-role-select");
  if (selEl) {
    selEl.value = selectedRoleId;
    selEl.onchange = async () => {
      selectedRoleId = selEl.value;
      await loadMatrix();
      document.getElementById("perm-tbody").innerHTML = buildPermTableRows(matrixItems, readonly);
    };
  }

  document.getElementById("perm-refresh")?.addEventListener("click", () => reloadView());
  document.getElementById("perm-save")?.addEventListener("click", async () => {
    if (!selectedRoleId) return sfWarning("Select a role first", "No role selected");
    const byMenu = {};
    for (const item of matrixItems) {
      byMenu[item.menu_id] = {
        menu_id: item.menu_id,
        canView: false,
        canAdd: false,
        canUpdate: false,
        canDelete: false,
      };
    }
    document.querySelectorAll("#perm-tbody [data-menu-id]").forEach((el) => {
      const mid = el.dataset.menuId;
      const flag = el.dataset.flag;
      if (el.checked && byMenu[mid]) byMenu[mid][flag] = true;
    });
    const items = Object.values(byMenu);
    await api("PUT", `/admin/permissions/role/${selectedRoleId}`, { items }, { loadingText: "Saving permissions…" });
    await sfSuccess("Permissions saved to database.", "Saved");
    await loadMatrix();
    document.getElementById("perm-tbody").innerHTML = buildPermTableRows(matrixItems, readonly);
  });
}
