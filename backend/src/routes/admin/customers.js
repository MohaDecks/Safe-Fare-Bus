const express = require("express");
const User = require("../../models/User");
const Wallet = require("../../models/Wallet");
const OtpCode = require("../../models/OtpCode");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { loadAdminPermissions, requireAdminActive, requirePermission } = require("../../middleware/permissions");
const { formatPhoneDisplay } = require("../../lib/phone");

const router = express.Router();
router.use(requireAuth, requireRole("admin"), requireAdminActive, loadAdminPermissions);

router.get("/", requirePermission("customers.view"), async (req, res) => {
  const users = await User.find({
    company_id: req.user.company_id,
    role: "passenger",
  }).sort({ createdAt: -1 });

  const ids = users.map((u) => u._id);
  const wallets = await Wallet.find({ user_id: { $in: ids } });
  const byUser = Object.fromEntries(wallets.map((w) => [w.user_id.toString(), w.balance_birr]));

  const list = await Promise.all(
    users.map(async (u, i) => {
      const lastOtp = await OtpCode.findOne({
        phone: u.phone,
        company_id: req.user.company_id,
      }).sort({ createdAt: -1 });
      let corporate_name = "";
      if (u.sponsored_by) {
        const corp = await User.findById(u.sponsored_by).select("corporate_name name");
        corporate_name = corp?.corporate_name || corp?.name || "";
      }
      return {
        id: u._id.toString(),
        row: i + 1,
        name: u.name,
        email: u.email,
        phone: u.phone,
        phone_display: formatPhoneDisplay(u.phone),
        wallet_birr: byUser[u._id.toString()] ?? 0,
        corporate_name,
        pays_via_company: !!u.sponsored_by,
        active: u.active !== false,
        created_at: u.createdAt,
        has_pending_otp: !!(lastOtp && !lastOtp.used && lastOtp.expires_at > new Date()),
      };
    })
  );
  res.json(list);
});

router.get("/:id", requirePermission("customers.view"), async (req, res) => {
  const user = await User.findOne({
    _id: req.params.id,
    company_id: req.user.company_id,
    role: "passenger",
  });
  if (!user) return res.status(404).json({ detail: "Customer not found" });

  const wallet = await Wallet.findOne({ user_id: user._id });
  const lastOtp = await OtpCode.findOne({
    phone: user.phone,
    company_id: req.user.company_id,
  }).sort({ createdAt: -1 });

  res.json({
    ...user.toPublic(),
    phone_display: formatPhoneDisplay(user.phone),
    wallet_balance_birr: wallet?.balance_birr ?? 0,
    created_at: user.createdAt,
    last_otp: lastOtp
      ? {
          code: lastOtp.code,
          used: lastOtp.used,
          expires_at: lastOtp.expires_at,
          created_at: lastOtp.createdAt,
          expired: lastOtp.expires_at <= new Date(),
        }
      : null,
  });
});

router.get("/:id/otp", requirePermission("customers.view"), async (req, res) => {
  const user = await User.findOne({
    _id: req.params.id,
    company_id: req.user.company_id,
    role: "passenger",
  });
  if (!user) return res.status(404).json({ detail: "Customer not found" });

  const otp = await OtpCode.findOne({
    phone: user.phone,
    company_id: req.user.company_id,
  }).sort({ createdAt: -1 });

  if (!otp) return res.json({ otp: null, detail: "No OTP sent yet for this phone" });

  res.json({
    phone: user.phone,
    phone_display: formatPhoneDisplay(user.phone),
    code: otp.code,
    used: otp.used,
    expires_at: otp.expires_at,
    expired: otp.expires_at <= new Date(),
    created_at: otp.createdAt,
  });
});

module.exports = router;
