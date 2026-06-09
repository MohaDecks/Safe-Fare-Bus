const express = require("express");
const AdminRole = require("../../models/AdminRole");
const User = require("../../models/User");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { loadAdminPermissions, requireAdminActive, requirePermission } = require("../../middleware/permissions");
const { roleToPublic, deleteRolePermissions, saveRolePermissions } = require("../../lib/rolePermissions");

const router = express.Router();
router.use(requireAuth, requireRole("admin"), requireAdminActive, loadAdminPermissions);

router.get("/", requirePermission("roles.view"), async (req, res) => {
  const roles = await AdminRole.find({ company_id: req.user.company_id }).sort({ label: 1 });
  const out = [];
  for (const r of roles) {
    out.push(await roleToPublic(r));
  }
  res.json(out);
});

router.post("/", requirePermission("roles.add"), async (req, res) => {
  const { label, slug, description } = req.body || {};
  if (!label?.trim()) return res.status(400).json({ detail: "label required" });
  const cleanSlug = (slug || label)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!cleanSlug) return res.status(400).json({ detail: "Invalid slug" });

  const exists = await AdminRole.findOne({ company_id: req.user.company_id, slug: cleanSlug });
  if (exists) return res.status(400).json({ detail: "Role slug already exists" });

  const role = await AdminRole.create({
    company_id: req.user.company_id,
    label: label.trim(),
    slug: cleanSlug,
    description: description || "",
    permissions: [],
  });
  res.status(201).json(await roleToPublic(role));
});

router.patch("/:id", requirePermission("roles.update"), async (req, res) => {
  const role = await AdminRole.findOne({ _id: req.params.id, company_id: req.user.company_id });
  if (!role) return res.status(404).json({ detail: "Not found" });
  if (role.is_system) return res.status(400).json({ detail: "System role cannot be edited" });

  const { label, description, active, items } = req.body || {};
  if (label?.trim()) role.label = label.trim();
  if (description !== undefined) role.description = description;
  if (active !== undefined) role.active = !!active;
  await role.save();

  if (items && Array.isArray(items)) {
    await saveRolePermissions(req.user.company_id, role._id, items);
  }

  res.json(await roleToPublic(role));
});

router.delete("/:id", requirePermission("roles.delete"), async (req, res) => {
  const role = await AdminRole.findOne({ _id: req.params.id, company_id: req.user.company_id });
  if (!role) return res.status(404).json({ detail: "Not found" });
  if (role.is_system) return res.status(400).json({ detail: "System role cannot be deleted" });

  const inUse = await User.countDocuments({ admin_role_id: role._id, role: "admin" });
  if (inUse) return res.status(400).json({ detail: "Role is assigned to admins. Reassign them first." });

  await deleteRolePermissions(role._id);
  await role.deleteOne();
  res.json({ ok: true });
});

module.exports = router;
