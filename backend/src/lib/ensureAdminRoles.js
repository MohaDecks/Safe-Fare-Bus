const AdminRole = require("../models/AdminRole");
const Menu = require("../models/Menu");
const RolePermission = require("../models/RolePermission");

async function syncRolePermissions(companyId, roleSlug, permDefs) {
  const role = await AdminRole.findOne({ company_id: companyId, slug: roleSlug });
  if (!role) return;

  const menus = await Menu.find();
  const bySlug = {};
  for (const m of menus) bySlug[m.slug] = m;

  for (const def of permDefs) {
    const menu = bySlug[def.slug];
    if (!menu) continue;
    await RolePermission.findOneAndUpdate(
      { company_id: companyId, admin_role_id: role._id, menu_id: menu._id },
      {
        company_id: companyId,
        admin_role_id: role._id,
        menu_id: menu._id,
        canView: !!def.canView,
        canAdd: !!def.canAdd,
        canUpdate: !!def.canUpdate,
        canDelete: !!def.canDelete,
      },
      { upsert: true, new: true }
    );
  }

  const { permissionsToKeys } = require("./rolePermissions");
  role.permissions = await permissionsToKeys(role._id);
  await role.save();
}

async function ensureDefaultAdminRoles(companyId) {
  const defaults = [
    {
      slug: "operations",
      label: "Operations Manager",
      description: "View buses, QR, trips, payments",
      perms: [
        { slug: "dashboard", canView: true },
        { slug: "buses", canView: true },
        { slug: "qrcodes", canView: true, canAdd: true, canUpdate: true },
        { slug: "staff", canView: true, canAdd: true },
        { slug: "trips", canView: true },
        { slug: "payments", canView: true },
      ],
    },
    {
      slug: "finance",
      label: "Finance",
      description: "Dashboard, payments, top-up apps",
      perms: [
        { slug: "dashboard", canView: true },
        { slug: "payments", canView: true },
        { slug: "trips", canView: true },
        { slug: "topup", canView: true, canAdd: true, canUpdate: true },
      ],
    },
  ];

  for (const d of defaults) {
    await AdminRole.findOneAndUpdate(
      { company_id: companyId, slug: d.slug },
      {
        company_id: companyId,
        label: d.label,
        slug: d.slug,
        description: d.description,
        is_system: false,
        active: true,
      },
      { upsert: true, new: true }
    );
    await syncRolePermissions(companyId, d.slug, d.perms);
  }
}

module.exports = { ensureDefaultAdminRoles, syncRolePermissions };
