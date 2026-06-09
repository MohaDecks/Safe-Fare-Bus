const AdminRole = require("../models/AdminRole");
const { PERMISSION_MENUS, ALL_PERMISSION_KEYS } = require("./permissionConstants");

/** Expand legacy .manage checks */
function expandPermissionKeys(keys) {
  const out = new Set();
  for (const k of keys) {
    out.add(k);
    if (k.endsWith(".manage")) {
      const base = k.slice(0, -7);
      out.add(`${base}.add`);
      out.add(`${base}.update`);
      out.add(`${base}.delete`);
    }
  }
  return [...out];
}

function isSuperAdmin(user) {
  return user.role === "admin" && !!user.is_super_admin;
}

async function getPermissionsForUser(user) {
  if (user.role !== "admin") return [];
  if (isSuperAdmin(user)) return [...ALL_PERMISSION_KEYS];
  if (!user.admin_role_id) return [];
  const { permissionsToKeys } = require("./rolePermissions");
  const keys = await permissionsToKeys(user.admin_role_id);
  if (keys.length) return keys;
  const role = await AdminRole.findById(user.admin_role_id);
  if (!role) return [];
  const raw = role.permissions || [];
  return raw.filter((p) => ALL_PERMISSION_KEYS.includes(p) || p.endsWith(".manage"));
}

function hasPermission(userPermissions, key, user) {
  if (user && isSuperAdmin(user)) return true;
  const expanded = expandPermissionKeys([key]);
  return expanded.some((k) => userPermissions.includes(k));
}

function hasAnyPermission(userPermissions, keys, user) {
  if (user && isSuperAdmin(user)) return true;
  const expanded = expandPermissionKeys(keys);
  return expanded.some((k) => userPermissions.includes(k));
}

/** Nav / page access from .view keys */
function canViewPage(permissions, pageId, user) {
  if (user && isSuperAdmin(user)) return true;
  const map = {
    dashboard: "dashboard.view",
    buses: "buses.view",
    qrcodes: "qrcodes.view",
    staff: "staff.view",
    staffroles: "staffroles.view",
    customers: "customers.view",
    corporate: "corporate.view",
    reports: "reports.view",
    trips: "trips.view",
    payments: "payments.view",
    topup: "topup.view",
    admins: "admins.view",
    adminroles: "roles.view",
    permissions: "permissions.view",
  };
  const key = map[pageId];
  if (!key) return false;
  return hasPermission(permissions, key, user);
}

async function enrichAdminPublic(user) {
  const base = user.toPublic();
  if (user.role !== "admin") return base;

  const permissions = await getPermissionsForUser(user);
  let admin_role_label = isSuperAdmin(user) ? "Super Admin" : "No role assigned";
  if (!isSuperAdmin(user) && user.admin_role_id) {
    const ar = await AdminRole.findById(user.admin_role_id);
    if (ar) admin_role_label = ar.label;
  }

  return {
    ...base,
    is_super_admin: !!user.is_super_admin,
    admin_role_id: user.admin_role_id ? user.admin_role_id.toString() : null,
    admin_role_label,
    permissions,
  };
}

module.exports = {
  PERMISSION_MENUS,
  ALL_PERMISSION_KEYS,
  keysForMenu: require("./permissionConstants").keysForMenu,
  isSuperAdmin,
  getPermissionsForUser,
  hasPermission,
  hasAnyPermission,
  canViewPage,
  enrichAdminPublic,
};
