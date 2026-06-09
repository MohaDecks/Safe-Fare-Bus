const Role = require("../models/Role");

function normSlug(s) {
  return String(s || "").toLowerCase().trim();
}

async function getRolesForCompany(companyId) {
  const company = companyId
    ? await Role.find({ company_id: companyId }).sort({ sort_order: 1, label: 1 })
    : [];
  const legacy = await Role.find({ company_id: null, slug: { $ne: "admin" } }).sort({ sort_order: 1 });
  return [...legacy, ...company];
}

async function findRoleForUser(user) {
  const slug = normSlug(user?.role);
  if (!slug) return null;
  if (!user?.company_id) {
    return Role.findOne({ company_id: null, slug });
  }
  let role = await Role.findOne({ company_id: user.company_id, slug });
  if (!role) role = await Role.findOne({ company_id: null, slug });
  return role;
}

function resolvePortalHome(roleDef, userRole) {
  if (roleDef?.portal_home && roleDef.portal_home !== "none") return roleDef.portal_home;
  if (userRole === "cashier") return "qr";
  if (userRole === "employer") return "employer";
  return "dashboard";
}

async function userHasPortalAccess(user) {
  if (user.role === "admin") return true;
  const roleDef = await findRoleForUser(user);
  if (roleDef) return !!roleDef.can_use_portal;
  return user.role === "cashier" || user.role === "employer";
}

async function userHasMobileAccess(user) {
  if (user.role === "passenger") return true;
  const roleDef = await findRoleForUser(user);
  return !!roleDef?.can_use_mobile;
}

/** Roles that may be chosen when admin adds staff */
async function getAssignableRoleSlugs(companyId) {
  const roles = await getRolesForCompany(companyId);
  return roles.filter((r) => r.can_use_portal || r.can_use_mobile).map((r) => r.slug);
}

async function validateStaffRole(slug, companyId) {
  const roles = await getRolesForCompany(companyId);
  const want = normSlug(slug);
  const role = roles.find((r) => normSlug(r.slug) === want);
  if (!role) return { ok: false, detail: "Invalid role — add it on Staff roles page first" };
  if (want === "admin") return { ok: false, detail: "Cannot create admin here. Use Admin users page." };
  if (!role.can_use_portal && !role.can_use_mobile) {
    return { ok: false, detail: "Role has no portal or mobile access" };
  }
  return { ok: true, role };
}

async function getRoleLabelMap(companyId) {
  const roles = await getRolesForCompany(companyId);
  const map = {};
  for (const r of roles) map[normSlug(r.slug)] = r.label;
  return map;
}

function userRoleMatchesSlugs(userRole, slugs) {
  const u = normSlug(userRole);
  return slugs.some((s) => normSlug(s) === u);
}

async function getQrCollectorSlugs(companyId) {
  const roles = await getRolesForCompany(companyId);
  return roles.filter((r) => r.portal_home === "qr" || r.slug === "cashier").map((r) => r.slug);
}

module.exports = {
  normSlug,
  userRoleMatchesSlugs,
  getRolesForCompany,
  findRoleForUser,
  resolvePortalHome,
  userHasPortalAccess,
  userHasMobileAccess,
  getAssignableRoleSlugs,
  validateStaffRole,
  getRoleLabelMap,
  getQrCollectorSlugs,
};
