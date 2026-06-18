const express = require("express");
const Role = require("../../models/Role");
const User = require("../../models/User");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { loadAdminPermissions, requireAdminActive, requirePermission } = require("../../middleware/permissions");
const { getRolesForCompany } = require("../../lib/roles");

const RESERVED_SLUG = "admin";

function parseAccess(body, fallback) {
  const portal = body.can_use_portal !== undefined ? !!body.can_use_portal : fallback.can_use_portal;
  const mobile = body.can_use_mobile !== undefined ? !!body.can_use_mobile : fallback.can_use_mobile;
  return { portal, mobile };
}

function parsePortalHome(body, portal, mobile, fallback) {
  const v = body.portal_home;
  if (v === "qr" || v === "dashboard" || v === "none") return v;
  if (!portal) return "none";
  if (mobile && !portal) return "none";
  return fallback.portal_home || "dashboard";
}

async function findRoleById(id, companyId) {
  let role = await Role.findOne({ _id: id, company_id: companyId });
  if (!role) role = await Role.findOne({ _id: id, company_id: null, slug: { $ne: RESERVED_SLUG } });
  return role;
}

const router = express.Router();
router.use(requireAuth, requireRole("admin"), requireAdminActive, loadAdminPermissions);

router.get("/", requirePermission("staffroles.view"), async (req, res) => {
  const roles = await getRolesForCompany(req.user.company_id);
  res.json(roles.map((r) => r.toPublic()));
});

router.post("/", requirePermission("staffroles.add"), async (req, res) => {
  const { label, slug, description, can_use_portal, can_use_mobile, portal_home } = req.body || {};
  if (!label || !slug) return res.status(400).json({ detail: "label and slug required" });
  const cleanSlug = slug.toLowerCase().trim().replace(/\s+/g, "_");
  if (cleanSlug === RESERVED_SLUG) {
    return res.status(400).json({ detail: "Slug admin is reserved" });
  }
  const exists = await Role.findOne({ company_id: req.user.company_id, slug: cleanSlug });
  if (exists) return res.status(400).json({ detail: "Role slug already exists" });

  const portal = can_use_portal !== false;
  const mobile = can_use_mobile === true;
  if (!portal && !mobile) {
    return res.status(400).json({ detail: "Enable portal and/or mobile access" });
  }

  const role = await Role.create({
    company_id: req.user.company_id,
    slug: cleanSlug,
    label: label.trim(),
    description: description || "",
    can_use_portal: portal,
    can_use_mobile: mobile,
    portal_home: parsePortalHome({ portal_home }, portal, mobile, { portal_home: "dashboard" }),
    is_system: false,
  });
  res.status(201).json(role.toPublic());
});

router.put("/:id", requirePermission("staffroles.update"), async (req, res) => {
  const { label, slug, description, can_use_portal, can_use_mobile, portal_home } = req.body || {};
  const role = await findRoleById(req.params.id, req.user.company_id);
  if (!role) return res.status(404).json({ detail: "Role not found" });
  if (role.slug === RESERVED_SLUG) return res.status(400).json({ detail: "Cannot edit admin role" });
  if (!label || !String(label).trim()) return res.status(400).json({ detail: "label required" });

  const { portal, mobile } = parseAccess({ can_use_portal, can_use_mobile }, role);
  if (!portal && !mobile) {
    return res.status(400).json({ detail: "Enable portal and/or mobile access" });
  }

  if (slug) {
    const cleanSlug = String(slug).toLowerCase().trim().replace(/\s+/g, "_");
    if (cleanSlug === RESERVED_SLUG) return res.status(400).json({ detail: "Slug admin is reserved" });
    const dup = await Role.findOne({
      slug: cleanSlug,
      _id: { $ne: role._id },
      $or: [{ company_id: req.user.company_id }, { company_id: null }],
    });
    if (dup) return res.status(400).json({ detail: "Role slug already exists" });
    const inUse = await User.countDocuments({ company_id: req.user.company_id, role: role.slug });
    if (inUse && cleanSlug !== role.slug) {
      return res.status(400).json({ detail: "Cannot change slug — staff already use this role" });
    }
    role.slug = cleanSlug;
  }

  role.label = String(label).trim();
  if (description !== undefined) role.description = String(description);
  role.can_use_portal = portal;
  role.can_use_mobile = mobile;
  role.portal_home = parsePortalHome({ portal_home }, portal, mobile, role);
  if (!portal) role.portal_home = "none";
  await role.save();
  res.json(role.toPublic());
});

router.delete("/:id", requirePermission("staffroles.delete"), async (req, res) => {
  const role = await findRoleById(req.params.id, req.user.company_id);
  if (!role) return res.status(404).json({ detail: "Role not found" });
  if (role.slug === RESERVED_SLUG) return res.status(400).json({ detail: "Cannot delete admin role" });

  const inUse = await User.countDocuments({
    company_id: req.user.company_id,
    role: role.slug,
  });
  if (inUse) {
    return res.status(400).json({ detail: `${inUse} staff account(s) use this role — reassign first` });
  }
  await role.deleteOne();
  res.json({ ok: true });
});

module.exports = router;
