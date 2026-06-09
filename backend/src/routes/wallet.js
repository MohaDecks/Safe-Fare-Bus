const express = require("express");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const PaymentProvider = require("../models/PaymentProvider");
const Company = require("../models/Company");
const { requireAuth } = require("../middleware/auth");
const { requireMobileApp } = require("../middleware/staffRole");
const { apiBaseUrl } = require("../lib/providerLogo");

const router = express.Router();
router.use(requireAuth);

async function getOrCreateWallet(userId) {
  let wallet = await Wallet.findOne({ user_id: userId });
  if (!wallet) {
    wallet = await Wallet.create({ user_id: userId, balance_birr: 0 });
  }
  return wallet;
}

router.get("/", requireMobileApp, async (req, res) => {
  const wallet = await getOrCreateWallet(req.user._id);
  res.json({ balance_birr: wallet.balance_birr });
});

router.get("/transactions", requireMobileApp, async (req, res) => {
  const txs = await Transaction.find({ user_id: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json(txs.map((t) => t.toPublic()));
});

/** Trip history — fare payments only, with bus & route */
router.get("/trip-history", requireMobileApp, async (req, res) => {
  const txs = await Transaction.find({ user_id: req.user._id, type: "fare" })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("bus_id", "plate route_name fare_birr");

  res.json(
    txs.map((t) => ({
      id: t._id.toString(),
      amount_birr: t.amount_birr,
      balance_after_birr: t.balance_after_birr,
      description: t.description,
      created_at: t.createdAt,
      bus_plate: t.bus_id?.plate || "",
      route_name: t.bus_id?.route_name || "",
      fare_birr: t.bus_id?.fare_birr || t.amount_birr,
    }))
  );
});

async function resolvePassengerCompanyId(user) {
  if (user.company_id) return user.company_id;
  const company = await Company.findOne().sort({ createdAt: 1 });
  return company?._id || null;
}

/** Active mobile money / bank apps for top-up (managed by admin). */
router.get("/payment-providers", requireMobileApp, async (req, res) => {
  const companyId = await resolvePassengerCompanyId(req.user);
  if (!companyId) return res.json([]);

  const list = await PaymentProvider.find({ company_id: companyId, active: true }).sort({
    sort_order: 1,
    name: 1,
  });
  const base = apiBaseUrl(req);
  res.json(list.map((p) => p.toPublic(base)));
});

router.post("/topup", requireMobileApp, async (req, res) => {
  const amount = Number(req.body?.amount_birr);
  const providerId = req.body?.payment_provider_id;
  if (!amount || amount <= 0) {
    return res.status(400).json({ detail: "Invalid amount" });
  }
  if (!providerId) {
    return res.status(400).json({ detail: "Choose a payment provider" });
  }

  const companyId = await resolvePassengerCompanyId(req.user);
  const provider = await PaymentProvider.findOne({
    _id: providerId,
    company_id: companyId,
    active: true,
  });
  if (!provider) return res.status(400).json({ detail: "Invalid payment provider" });

  const wallet = await getOrCreateWallet(req.user._id);
  wallet.balance_birr += amount;
  await wallet.save();

  await Transaction.create({
    user_id: req.user._id,
    type: "topup",
    amount_birr: amount,
    balance_after_birr: wallet.balance_birr,
    description: `Top-up via ${provider.name}`,
    payment_provider_id: provider._id,
  });

  res.json({
    balance_birr: wallet.balance_birr,
    added_birr: amount,
    provider: provider.name,
  });
});

module.exports = router;
