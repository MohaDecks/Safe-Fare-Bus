const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const AdminRole = require("../../models/AdminRole");
const { requireAuth, requireRole } = require("../../middleware/auth");
const {
  loadAdminPermissions,
  requireAdminActive,
  requirePermission,
  requireSuperAdmin,
} = require("../../middleware/permissions");
const { enrichAdminPublic } = require("../../lib/permissions");

const router = express.Router();
router.use(requireAuth, requireRole("admin"), requireAdminActive, loadAdminPermissions, requireSuperAdmin);

router.get("/", async (req, res) => {
  const admins = await User.find({ company_id: req.user.company_id, role: "admin" }).sort({ createdAt: -1 });
  const out = [];
  for (const u of admins) {
    out.push(await enrichAdminPublic(u));
  }
  res.json(out);
});

router.post("/", async (req, res) => {
  const { name, email, password, phone, admin_role_id } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ detail: "name, email, password required" });
  }

  const exists = await User.findOne({ email: email.toLowerCase().trim() });
  if (exists) return res.status(400).json({ detail: "Email already registered" });

  let roleId = admin_role_id || null;
  if (roleId) {
    const ar = await AdminRole.findOne({ _id: roleId, company_id: req.user.company_id });
    if (!ar) return res.status(400).json({ detail: "Invalid admin role" });
  }

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password_hash: await bcrypt.hash(password, 10),
    role: "admin",
    phone: phone || "",
    company_id: req.user.company_id,
    is_super_admin: false,
    admin_role_id: roleId,
    active: true,
  });

  res.status(201).json(await enrichAdminPublic(user));
});

router.patch("/:id", async (req, res) => {
  const user = await User.findOne({
    _id: req.params.id,
    company_id: req.user.company_id,
    role: "admin",
  });
  if (!user) return res.status(404).json({ detail: "Not found" });

  if (user.is_super_admin && !req.isSuperAdmin) {
    return res.status(403).json({ detail: "Cannot edit super admin" });
  }

  const { name, phone, admin_role_id, active, password } = req.body || {};
  if (name?.trim()) user.name = name.trim();
  if (phone !== undefined) user.phone = phone;

  if (admin_role_id !== undefined) {
    if (user.is_super_admin) {
      return res.status(400).json({ detail: "Super admin has all permissions" });
    }
    if (admin_role_id) {
      const ar = await AdminRole.findOne({ _id: admin_role_id, company_id: req.user.company_id });
      if (!ar) return res.status(400).json({ detail: "Invalid admin role" });
      user.admin_role_id = ar._id;
    } else {
      user.admin_role_id = null;
    }
  }

  if (active === false && user.is_super_admin) {
    return res.status(400).json({ detail: "Cannot disable super admin" });
  }
  if (active !== undefined && !user.is_super_admin) user.active = !!active;

  if (password) user.password_hash = await bcrypt.hash(password, 10);

  await user.save();
  res.json(await enrichAdminPublic(user));
});

router.delete("/:id", async (req, res) => {

  const user = await User.findOne({
    _id: req.params.id,
    company_id: req.user.company_id,
    role: "admin",
  });
  if (!user) return res.status(404).json({ detail: "Not found" });
  if (user.is_super_admin) return res.status(400).json({ detail: "Cannot delete super admin" });
  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({ detail: "Cannot delete yourself" });
  }

  user.active = false;
  await user.save();
  res.json({ ok: true });
});

module.exports = router;
