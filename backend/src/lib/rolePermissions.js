const Menu = require("../models/Menu");
const RolePermission = require("../models/RolePermission");
const AdminRole = require("../models/AdminRole");
const { ALL_PERMISSION_KEYS } = require("./permissionConstants");

/** Flat keys for middleware: buses.view, buses.add, … */
function rowToKeys(menu, row) {
  const keys = [];
  if (menu.allow_view && row.canView) keys.push(`${menu.slug}.view`);
  if (menu.allow_add && row.canAdd) keys.push(`${menu.slug}.add`);
  if (menu.allow_update && row.canUpdate) keys.push(`${menu.slug}.update`);
  if (menu.allow_delete && row.canDelete) keys.push(`${menu.slug}.delete`);
  return keys;
}

async function permissionsToKeys(adminRoleId) {
  const rows = await RolePermission.find({ admin_role_id: adminRoleId }).populate("menu_id");
  const keys = [];
  for (const row of rows) {
    const menu = row.menu_id;
    if (!menu) continue;
    keys.push(...rowToKeys(menu, row));
  }
  return keys.filter((k) => ALL_PERMISSION_KEYS.includes(k));
}

async function getRolePermissionMatrix(companyId, adminRoleId) {
  const menus = await Menu.find().sort({ sort_order: 1 });
  const existing = await RolePermission.find({ company_id: companyId, admin_role_id: adminRoleId });
  const byMenu = {};
  for (const r of existing) {
    byMenu[r.menu_id.toString()] = r;
  }

  return menus.map((menu) => {
    const row = byMenu[menu._id.toString()];
    return {
      menu_id: menu._id.toString(),
      menu: menu.label,
      parent: menu.parent,
      slug: menu.slug,
      allow_view: menu.allow_view,
      allow_add: menu.allow_add,
      allow_update: menu.allow_update,
      allow_delete: menu.allow_delete,
      canView: row ? row.canView : false,
      canAdd: row ? row.canAdd : false,
      canUpdate: row ? row.canUpdate : false,
      canDelete: row ? row.canDelete : false,
    };
  });
}

async function saveRolePermissions(companyId, adminRoleId, items) {
  const role = await AdminRole.findOne({ _id: adminRoleId, company_id: companyId });
  if (!role) throw new Error("Role not found");

  const menus = await Menu.find();
  const menuMap = {};
  for (const m of menus) menuMap[m._id.toString()] = m;

  for (const item of items || []) {
    const menuId = item.menu_id;
    const menu = menuMap[menuId];
    if (!menu) continue;

    await RolePermission.findOneAndUpdate(
      { company_id: companyId, admin_role_id: adminRoleId, menu_id: menuId },
      {
        company_id: companyId,
        admin_role_id: adminRoleId,
        menu_id: menuId,
        canView: !!(menu.allow_view && item.canView),
        canAdd: !!(menu.allow_add && item.canAdd),
        canUpdate: !!(menu.allow_update && item.canUpdate),
        canDelete: !!(menu.allow_delete && item.canDelete),
      },
      { upsert: true, new: true }
    );
  }

  role.permissions = await permissionsToKeys(adminRoleId);
  await role.save();
  return permissionsToKeys(adminRoleId);
}

async function deleteRolePermissions(adminRoleId) {
  await RolePermission.deleteMany({ admin_role_id: adminRoleId });
}

async function roleToPublic(role) {
  const permissions = await permissionsToKeys(role._id);
  return {
    id: role._id.toString(),
    slug: role.slug,
    label: role.label,
    description: role.description,
    permissions,
    active: role.active !== false,
    is_system: role.is_system,
    company_id: role.company_id.toString(),
  };
}

module.exports = {
  permissionsToKeys,
  getRolePermissionMatrix,
  saveRolePermissions,
  deleteRolePermissions,
  roleToPublic,
};
