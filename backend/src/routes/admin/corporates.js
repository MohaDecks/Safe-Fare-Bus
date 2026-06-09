const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const Wallet = require("../../models/Wallet");
const CorporateEmployee = require("../../models/CorporateEmployee");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { loadAdminPermissions, requireAdminActive, requirePermission } = require("../../middleware/permissions");
const { createCorporateAccount } = require("../../lib/createCorporateAccount");
const { formatPhoneDisplay } = require("../../lib/phone");

const router = express.Router();
router.use(requireAuth, requireRole("admin"), requireAdminActive, loadAdminPermissions);

router.get("/", requirePermission("corporate.view"), async (req, res) => {
  const list = await User.find({ role: "corporate", company_id: req.user.company_id }).sort({ createdAt: -1 });
  const ids = list.map((u) => u._id);
  const wallets = await Wallet.find({ user_id: { $in: ids } });
  const walletMap = Object.fromEntries(wallets.map((w) => [w.user_id.toString(), w.balance_birr]));
  const empCounts = await CorporateEmployee.aggregate([
    { $match: { corporate_user_id: { $in: ids } } },
    { $group: { _id: "$corporate_user_id", count: { $sum: 1 } } },
  ]);
  const empMap = Object.fromEntries(empCounts.map((e) => [e._id.toString(), e.count]));

  res.json(
    list.map((u, i) => ({
      id: u._id.toString(),
      row: i + 1,
      company_name: u.corporate_name || u.name,
      contact_name: u.name,
      email: u.email,
      phone: u.phone,
      phone_display: formatPhoneDisplay(u.phone) || "—",
      wallet_birr: walletMap[u._id.toString()] ?? 0,
      employees: empMap[u._id.toString()] ?? 0,
      active: u.active !== false,
      created_at: u.createdAt,
    }))
  );
});

router.post("/", requirePermission("corporate.add"), async (req, res) => {
  const { company_name, contact_name, email, password, phone } = req.body || {};
  const result = await createCorporateAccount({
    company_name,
    contact_name,
    email,
    password,
    phone,
    bus_company_id: req.user.company_id,
  });
  if (!result.ok) return res.status(400).json({ detail: result.detail });
  res.status(201).json({
    ...result.user.toPublic(),
    company_name: result.user.corporate_name,
    message: "Give this email and password to the company for app → Corporate login",
  });
});

router.patch("/:id", requirePermission("corporate.update"), async (req, res) => {
  const user = await User.findOne({
    _id: req.params.id,
    role: "corporate",
    company_id: req.user.company_id,
  });
  if (!user) return res.status(404).json({ detail: "Corporate account not found" });

  const { company_name, contact_name, email, password, phone, active } = req.body || {};
  if (company_name != null) user.corporate_name = String(company_name).trim();
  if (contact_name != null) user.name = String(contact_name).trim();
  if (email != null) {
    const mail = String(email).toLowerCase().trim();
    const dup = await User.findOne({ email: mail, _id: { $ne: user._id } });
    if (dup) return res.status(400).json({ detail: "Email already in use" });
    user.email = mail;
  }
  if (phone != null) user.phone = String(phone).replace(/\D/g, "");
  if (password) {
    if (password.length < 6) return res.status(400).json({ detail: "Password min 6 characters" });
    user.password_hash = await bcrypt.hash(password, 10);
  }
  if (active != null) user.active = !!active;
  await user.save();
  res.json(user.toPublic());
});

module.exports = router;
