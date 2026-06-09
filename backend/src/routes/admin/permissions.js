const express = require("express");
const Menu = require("../../models/Menu");
const AdminRole = require("../../models/AdminRole");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { loadAdminPermissions, requireAdminActive, requirePermission } = require("../../middleware/permissions");
const { getRolePermissionMatrix, saveRolePermissions } = require("../../lib/rolePermissions");

const router = express.Router();
router.use(requireAuth, requireRole("admin"), requireAdminActive, loadAdminPermissions);

router.get("/menus", requirePermission("permissions.view", "roles.view"), async (_req, res) => {
  const menus = await Menu.find().sort({ sort_order: 1 });
  res.json({ menus: menus.map((m) => m.toPublic()) });
});

/** Matrix for one role — merged menus + saved flags */
router.get("/role/:roleId", requirePermission("permissions.view", "roles.view"), async (req, res) => {
  const role = await AdminRole.findOne({ _id: req.params.roleId, company_id: req.user.company_id });
  if (!role) return res.status(404).json({ detail: "Role not found" });

  const items = await getRolePermissionMatrix(req.user.company_id, role._id);
  res.json({
    role_id: role._id.toString(),
    role_label: role.label,
    items,
  });
});

/** Save like water-billing rolepermissions collection */
router.put("/role/:roleId", requirePermission("permissions.update"), async (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items)) return res.status(400).json({ detail: "items array required" });

  const keys = await saveRolePermissions(req.user.company_id, req.params.roleId, items);
  res.json({ ok: true, permissions: keys });
});

module.exports = router;
