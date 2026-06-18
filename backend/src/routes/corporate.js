const express = require("express");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const PaymentProvider = require("../models/PaymentProvider");
const CorporateEmployee = require("../models/CorporateEmployee");
const CorporateTopUpRequest = require("../models/CorporateTopUpRequest");
const Company = require("../models/Company");
const { requireAuth } = require("../middleware/auth");
const { validatePhone } = require("../lib/phone");
const { apiBaseUrl } = require("../lib/providerLogo");

const router = express.Router();

async function busCompanyId() {
  const c = await Company.findOne().sort({ createdAt: 1 });
  return c?._id || null;
}

async function getOrCreateWallet(userId) {
  let w = await Wallet.findOne({ user_id: userId });
  if (!w) w = await Wallet.create({ user_id: userId, balance_birr: 0 });
  return w;
}

function requireCorporate(req, res, next) {
  if (req.user.role !== "corporate") {
    return res.status(403).json({ detail: "Corporate account required" });
  }
  next();
}

router.use(requireAuth, requireCorporate);

router.get("/dashboard", async (req, res) => {
  const wallet = await getOrCreateWallet(req.user._id);
  const employees = await CorporateEmployee.find({ corporate_user_id: req.user._id });
  const registered = employees.filter((e) => e.passenger_user_id).length;
  res.json({
    company_name: req.user.corporate_name || req.user.name,
    balance_birr: wallet.balance_birr,
    employees_total: employees.length,
    employees_registered: registered,
  });
});

router.get("/payment-providers", async (req, res) => {
  const companyId = req.user.company_id || (await busCompanyId());
  if (!companyId) return res.json([]);
  const list = await PaymentProvider.find({ company_id: companyId, active: true }).sort({ sort_order: 1 });
  const base = apiBaseUrl(req);
  res.json(list.map((p) => p.toPublic(base)));
});

router.post("/topup", async (req, res) => {
  const amount = Number(req.body?.amount_birr);
  const providerId = req.body?.payment_provider_id;
  if (!amount || amount <= 0) return res.status(400).json({ detail: "Invalid amount" });
  if (!providerId) return res.status(400).json({ detail: "Choose payment provider" });

  const companyId = req.user.company_id || (await busCompanyId());
  const provider = await PaymentProvider.findOne({ _id: providerId, company_id: companyId, active: true });
  if (!provider) return res.status(400).json({ detail: "Invalid payment provider" });

  const wallet = await getOrCreateWallet(req.user._id);
  wallet.balance_birr += amount;
  await wallet.save();

  await Transaction.create({
    user_id: req.user._id,
    type: "topup",
    amount_birr: amount,
    balance_after_birr: wallet.balance_birr,
    description: `Company top-up via ${provider.name}`,
    payment_provider_id: provider._id,
  });

  res.json({ balance_birr: wallet.balance_birr, added_birr: amount });
});

router.get("/employees", async (req, res) => {
  const rows = await CorporateEmployee.find({ corporate_user_id: req.user._id }).sort({ createdAt: -1 });
  const passengerIds = rows.filter((r) => r.passenger_user_id).map((r) => r.passenger_user_id);
  const wallets = passengerIds.length
    ? await Wallet.find({ user_id: { $in: passengerIds } })
    : [];
  const walletMap = Object.fromEntries(wallets.map((w) => [w.user_id.toString(), w.balance_birr]));

  res.json(
    rows.map((r) => {
      const pub = r.toPublic();
      if (r.passenger_user_id) {
        pub.wallet_balance_birr = walletMap[r.passenger_user_id.toString()] ?? 0;
      }
      return pub;
    })
  );
});

router.post("/employees", async (req, res) => {
  const { phone, name } = req.body || {};
  const v = validatePhone(phone);
  if (!v.ok) return res.status(400).json({ detail: v.detail });

  const existing = await CorporateEmployee.findOne({
    corporate_user_id: req.user._id,
    phone: v.storage,
  });
  if (existing) return res.status(400).json({ detail: "Employee phone already added" });

  const passenger = await User.findOne({ phone: v.storage, role: "passenger" });
  const row = await CorporateEmployee.create({
    corporate_user_id: req.user._id,
    phone: v.storage,
    name: (name || "").trim(),
    passenger_user_id: passenger?._id || null,
  });

  if (passenger && !passenger.sponsored_by) {
    passenger.sponsored_by = req.user._id;
    await passenger.save();
    row.passenger_user_id = passenger._id;
    await row.save();
  }

  res.status(201).json(row.toPublic());
});

router.delete("/employees/:id", async (req, res) => {
  const row = await CorporateEmployee.findOne({
    _id: req.params.id,
    corporate_user_id: req.user._id,
  });
  if (!row) return res.status(404).json({ detail: "Not found" });

  if (row.passenger_user_id) {
    const p = await User.findById(row.passenger_user_id);
    if (p && p.sponsored_by?.toString() === req.user._id.toString()) {
      p.sponsored_by = null;
      await p.save();
    }
  }
  await row.deleteOne();
  res.json({ ok: true });
});

router.post("/employees/:id/allocate", async (req, res) => {
  const row = await CorporateEmployee.findOne({
    _id: req.params.id,
    corporate_user_id: req.user._id,
  });
  if (!row) return res.status(404).json({ detail: "Employee not found" });
  if (!row.passenger_user_id) {
    return res.status(400).json({ detail: "Customer not registered in app yet — wait until they sign up" });
  }

  const amount = Number(req.body?.amount_birr);
  if (!amount || amount <= 0) return res.status(400).json({ detail: "Invalid amount" });

  const passenger = await User.findById(row.passenger_user_id);
  if (!passenger || passenger.sponsored_by?.toString() !== req.user._id.toString()) {
    return res.status(400).json({ detail: "Customer no longer linked to your company" });
  }

  const corpWallet = await getOrCreateWallet(req.user._id);
  if (corpWallet.balance_birr < amount) {
    return res.status(400).json({ detail: "Insufficient company balance — top up company wallet first" });
  }

  let pWallet = await Wallet.findOne({ user_id: passenger._id });
  if (!pWallet) pWallet = await Wallet.create({ user_id: passenger._id, balance_birr: 0 });

  corpWallet.balance_birr -= amount;
  pWallet.balance_birr += amount;
  await corpWallet.save();
  await pWallet.save();

  const note = (req.body?.note || "").trim();
  await Transaction.create({
    user_id: passenger._id,
    type: "allocate",
    amount_birr: amount,
    balance_after_birr: pWallet.balance_birr,
    description: note || `Top-up from ${req.user.corporate_name || req.user.name}`,
    paid_by_corporate_id: req.user._id,
  });

  res.json({
    ok: true,
    employee: row.toPublic(),
    allocated_birr: amount,
    company_balance_birr: corpWallet.balance_birr,
    employee_balance_birr: pWallet.balance_birr,
  });
});

router.get("/fare-usage", async (req, res) => {
  const txs = await Transaction.find({
    paid_by_corporate_id: req.user._id,
    type: "fare",
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("user_id", "name phone");

  res.json(
    txs.map((t) => ({
      id: t._id.toString(),
      amount_birr: t.amount_birr,
      passenger: t.user_id?.name || "",
      phone: t.user_id?.phone || "",
      description: t.description,
      created_at: t.createdAt,
    }))
  );
});

router.get("/topup-requests", async (req, res) => {
  const status = (req.query.status || "pending").toString();
  const q = { corporate_user_id: req.user._id };
  if (status !== "all") q.status = status;
  const rows = await CorporateTopUpRequest.find(q).sort({ createdAt: -1 }).limit(100);
  const passengerIds = [...new Set(rows.map((r) => r.passenger_user_id.toString()))];
  const passengers = await User.find({ _id: { $in: passengerIds } }).select("name phone");
  const pMap = Object.fromEntries(passengers.map((p) => [p._id.toString(), p]));
  res.json(rows.map((r) => r.toPublic(pMap[r.passenger_user_id.toString()])));
});

router.post("/topup-requests/:id/approve", async (req, res) => {
  const row = await CorporateTopUpRequest.findOne({
    _id: req.params.id,
    corporate_user_id: req.user._id,
    status: "pending",
  });
  if (!row) return res.status(404).json({ detail: "Request not found or already handled" });

  const corpWallet = await getOrCreateWallet(req.user._id);
  if (corpWallet.balance_birr < row.amount_birr) {
    return res.status(400).json({ detail: "Insufficient company wallet — top up first" });
  }

  const passenger = await User.findById(row.passenger_user_id);
  if (!passenger || passenger.sponsored_by?.toString() !== req.user._id.toString()) {
    return res.status(400).json({ detail: "Employee no longer linked to your company" });
  }

  let pWallet = await Wallet.findOne({ user_id: passenger._id });
  if (!pWallet) pWallet = await Wallet.create({ user_id: passenger._id, balance_birr: 0 });

  corpWallet.balance_birr -= row.amount_birr;
  pWallet.balance_birr += row.amount_birr;
  await corpWallet.save();
  await pWallet.save();

  row.status = "approved";
  row.reviewed_at = new Date();
  await row.save();

  await Transaction.create({
    user_id: passenger._id,
    type: "allocate",
    amount_birr: row.amount_birr,
    balance_after_birr: pWallet.balance_birr,
    description: row.note || `Top-up approved by ${req.user.corporate_name || req.user.name}`,
    paid_by_corporate_id: req.user._id,
  });

  res.json({
    ok: true,
    request: row.toPublic(passenger),
    company_balance_birr: corpWallet.balance_birr,
    employee_balance_birr: pWallet.balance_birr,
  });
});

router.post("/topup-requests/:id/reject", async (req, res) => {
  const row = await CorporateTopUpRequest.findOne({
    _id: req.params.id,
    corporate_user_id: req.user._id,
    status: "pending",
  });
  if (!row) return res.status(404).json({ detail: "Request not found or already handled" });

  const passenger = await User.findById(row.passenger_user_id).select("name phone");
  row.status = "rejected";
  row.reviewed_at = new Date();
  row.rejection_reason = (req.body?.reason || "").trim();
  await row.save();

  res.json({ ok: true, request: row.toPublic(passenger) });
});

module.exports = router;
