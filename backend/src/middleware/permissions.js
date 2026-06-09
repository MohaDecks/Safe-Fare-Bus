const { getPermissionsForUser, hasAnyPermission, isSuperAdmin } = require("../lib/permissions");

async function loadAdminPermissions(req, res, next) {
  if (req.user.role !== "admin") {
    req.adminPermissions = [];
    return next();
  }
  req.adminPermissions = await getPermissionsForUser(req.user);
  req.isSuperAdmin = isSuperAdmin(req.user);
  next();
}

function requireAdminActive(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ detail: "Admin only" });
  if (req.user.active === false) return res.status(403).json({ detail: "Account disabled" });
  next();
}

/** One of the listed permissions required (super admin bypasses). */
function requirePermission(...keys) {
  return (req, res, next) => {
    if (req.user.role !== "admin") return res.status(403).json({ detail: "Forbidden" });
    if (req.isSuperAdmin) return next();
    if (!keys.length) return next();
    if (hasAnyPermission(req.adminPermissions || [], keys, req.user)) return next();
    return res.status(403).json({
      detail: `Permission required: ${keys.join(" or ")}`,
    });
  };
}

function requireSuperAdmin(req, res, next) {
  if (!req.isSuperAdmin) {
    return res.status(403).json({ detail: "Super admin only" });
  }
  next();
}

module.exports = { loadAdminPermissions, requireAdminActive, requirePermission, requireSuperAdmin };
