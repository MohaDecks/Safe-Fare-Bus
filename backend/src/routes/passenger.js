const express = require("express");
const QrSession = require("../models/QrSession");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const Bus = require("../models/Bus");
const BusTripLeg = require("../models/BusTripLeg");
const { requireAuth } = require("../middleware/auth");
const { requireMobileApp } = require("../middleware/staffRole");

const router = express.Router();
router.use(requireAuth, requireMobileApp);

router.post("/pay", async (req, res) => {
  const qr_token = (req.body?.qr_token || "").trim();
  if (!qr_token) return res.status(400).json({ detail: "qr_token required" });

  const session = await QrSession.findOne({ token: qr_token, active: true });
  if (!session) return res.status(400).json({ detail: "Invalid or inactive QR code" });
  if (session.expires_at && session.expires_at <= new Date()) {
    return res.status(400).json({ detail: "QR code expired — ask admin for a new one" });
  }

  const bus = await Bus.findById(session.bus_id);
  if (!bus) return res.status(400).json({ detail: "Bus not found" });

  let wallet = await Wallet.findOne({ user_id: req.user._id });
  if (!wallet) wallet = await Wallet.create({ user_id: req.user._id, balance_birr: 0 });

  let payWallet = wallet;
  let corporateId = null;
  if (req.user.sponsored_by) {
    const corp = await require("../models/User").findOne({
      _id: req.user.sponsored_by,
      role: "corporate",
    });
    if (corp) {
      let corpWallet = await Wallet.findOne({ user_id: corp._id });
      if (!corpWallet) corpWallet = await Wallet.create({ user_id: corp._id, balance_birr: 0 });
      payWallet = corpWallet;
      corporateId = corp._id;
    }
  }

  if (payWallet.balance_birr < session.fare_birr) {
    const msg = corporateId
      ? "Company wallet has insufficient balance — ask your employer to top up"
      : "Insufficient balance";
    return res.status(400).json({ detail: msg });
  }

  payWallet.balance_birr -= session.fare_birr;
  await payWallet.save();

  const activeLeg = await BusTripLeg.findOne({
    bus_id: bus._id,
    status: "active",
  }).sort({ started_at: -1 });

  await Transaction.create({
    user_id: req.user._id,
    type: "fare",
    amount_birr: session.fare_birr,
    balance_after_birr: payWallet.balance_birr,
    description: activeLeg
      ? `Fare — ${activeLeg.from_stop} → ${activeLeg.to_stop} (${bus.plate})`
      : `Fare — ${bus.route_name} (${bus.plate})`,
    bus_id: bus._id,
    qr_session_id: session._id,
    trip_leg_id: activeLeg?._id || null,
    paid_by_corporate_id: corporateId,
  });

  res.json({
    fare_birr: session.fare_birr,
    balance_birr: corporateId ? wallet.balance_birr : payWallet.balance_birr,
    paid_by_company: !!corporateId,
    bus_plate: bus.plate,
    route_name: bus.route_name,
  });
});

module.exports = router;
