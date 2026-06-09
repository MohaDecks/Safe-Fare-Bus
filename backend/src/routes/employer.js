const express = require("express");
const User = require("../models/User");
const Company = require("../models/Company");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const { requireAuth } = require("../middleware/auth");
const { requirePortalHome } = require("../middleware/staffRole");

const router = express.Router();
router.use(requireAuth, requirePortalHome("employer"));

router.get("/account", async (req, res) => {
  const wallet = await Wallet.findOne({ user_id: req.user._id });
  let company_name = "";
  if (req.user.company_id) {
    const company = await Company.findById(req.user.company_id);
    company_name = company?.name || "";
  }
  res.json({
    balance_birr: wallet?.balance_birr ?? 0,
    company_id: req.user.company_id,
    company_name,
  });
});

router.get("/staff", async (req, res) => {
  const staff = await User.find({ role: "passenger", company_id: req.user.company_id });
  res.json(staff.map((u) => u.toPublic()));
});

router.get("/allocations", async (req, res) => {
  const staff = await User.find({ role: "passenger", company_id: req.user.company_id }).select("_id");
  const staffIds = staff.map((s) => s._id);
  const txs = await Transaction.find({
    user_id: { $in: staffIds },
    type: "allocate",
  })
    .sort({ createdAt: -1 })
    .limit(30)
    .populate("user_id", "name email");
  res.json(
    txs.map((t) => ({
      ...t.toPublic(),
      staff_name: t.user_id?.name,
      staff_email: t.user_id?.email,
    }))
  );
});

router.post("/staff", async (req, res) => {
  const { staff_email, name, email, phone } = req.body || {};
  const emailToUse = (staff_email || email || "").toLowerCase().trim();
  if (!emailToUse) return res.status(400).json({ detail: "staff_email required" });

  let user = await User.findOne({ email: emailToUse });
  if (user) {
    if (user.role !== "passenger") {
      return res.status(400).json({
        detail: `This email is already registered as ${user.role}. Use a new email, or ask admin to add a passenger in Staff.`,
      });
    }
    if (user.company_id && user.company_id.toString() !== req.user.company_id?.toString()) {
      return res.status(400).json({ detail: "Staff already linked to another company" });
    }
    user.company_id = req.user.company_id;
    await user.save();
    let wallet = await Wallet.findOne({ user_id: user._id });
    if (!wallet) await Wallet.create({ user_id: user._id, balance_birr: 0 });
    return res.json(user.toPublic());
  }

  if (!name) return res.status(400).json({ detail: "name required for new staff" });
  const bcrypt = require("bcryptjs");
  user = await User.create({
    name,
    email: emailToUse,
    password_hash: await bcrypt.hash(req.body.password || "Staff123!", 10),
    role: "passenger",
    phone: phone || "",
    company_id: req.user.company_id,
  });
  await Wallet.create({ user_id: user._id, balance_birr: 0 });
  res.status(201).json(user.toPublic());
});

router.post("/allocate", async (req, res) => {
  const { staff_email, amount_birr, note } = req.body || {};
  const amount = Number(amount_birr);
  if (!staff_email || !amount || amount <= 0) {
    return res.status(400).json({ detail: "staff_email and amount_birr required" });
  }

  const staff = await User.findOne({
    email: staff_email.toLowerCase().trim(),
    role: "passenger",
    company_id: req.user.company_id,
  });
  if (!staff) return res.status(404).json({ detail: "Staff not found" });

  let employerWallet = await Wallet.findOne({ user_id: req.user._id });
  if (!employerWallet) {
    employerWallet = await Wallet.create({ user_id: req.user._id, balance_birr: 10000 });
  }
  if (employerWallet.balance_birr < amount) {
    return res.status(400).json({ detail: "Insufficient employer balance" });
  }

  let staffWallet = await Wallet.findOne({ user_id: staff._id });
  if (!staffWallet) {
    staffWallet = await Wallet.create({ user_id: staff._id, balance_birr: 0 });
  }

  employerWallet.balance_birr -= amount;
  staffWallet.balance_birr += amount;
  await employerWallet.save();
  await staffWallet.save();

  await Transaction.create({
    user_id: staff._id,
    type: "allocate",
    amount_birr: amount,
    balance_after_birr: staffWallet.balance_birr,
    description: note || `Allowance from ${req.user.name}`,
  });

  res.json({
    staff: staff.toPublic(),
    allocated_birr: amount,
    staff_balance_birr: staffWallet.balance_birr,
  });
});

module.exports = router;
