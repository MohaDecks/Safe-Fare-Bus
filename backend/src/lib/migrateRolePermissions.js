const AdminRole = require("../models/AdminRole");
const Menu = require("../models/Menu");
const RolePermission = require("../models/RolePermission");
const { permissionsToKeys, saveRolePermissions } = require("./rolePermissions");

/** Move legacy AdminRole.permissions[] into rolepermissions collection */
async function migrateLegacyRolePermissions() {
  const menus = await Menu.find();
  const bySlug = {};
  for (const m of menus) bySlug[m.slug] = m;

  const roles = await AdminRole.find({ permissions: { $exists: true, $ne: [] } });
  for (const role of roles) {
    const count = await RolePermission.countDocuments({ admin_role_id: role._id });
    if (count > 0) continue;

    const items = [];
    for (const key of role.permissions || []) {
      const [slug, action] = key.split(".");
      const menu = bySlug[slug];
      if (!menu) continue;
      let row = items.find((i) => i.menu_id === menu._id.toString());
      if (!row) {
        row = {
          menu_id: menu._id.toString(),
          canView: false,
          canAdd: false,
          canUpdate: false,
          canDelete: false,
        };
        items.push(row);
      }
      if (action === "view") row.canView = true;
      if (action === "add") row.canAdd = true;
      if (action === "update") row.canUpdate = true;
      if (action === "delete") row.canDelete = true;
    }
    if (items.length) {
      await saveRolePermissions(role.company_id, role._id, items);
    }
  }
}

module.exports = { migrateLegacyRolePermissions };
