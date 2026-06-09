const express = require("express");
const Bus = require("../models/Bus");
const BusTripLeg = require("../models/BusTripLeg");
const QrSession = require("../models/QrSession");
const Transaction = require("../models/Transaction");
const { requireAuth } = require("../middleware/auth");
const { requireCashierRole } = require("../middleware/staffRole");
const { tokenToDataUrl } = require("../lib/qrImage");
const { parseRouteName } = require("../lib/routeParse");

const router = express.Router();
router.use(requireAuth, requireCashierRole);

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function parseDateRange(query) {
  let from = null;
  let to = null;
  if (query.date_from) {
    from = new Date(query.date_from);
    if (!Number.isNaN(from.getTime())) from.setHours(0, 0, 0, 0);
    else from = null;
  }
  if (query.date_to) {
    to = new Date(query.date_to);
    if (!Number.isNaN(to.getTime())) to.setHours(23, 59, 59, 999);
    else to = null;
  }
  if (!from && !to) {
    from = startOfToday();
    to = endOfToday();
  }
  return { from, to };
}

const sessionTimeOk = {
  $or: [{ expires_at: null }, { expires_at: { $gt: new Date() } }],
};

async function getAssignedBus(userId) {
  return Bus.findOne({ cashier_id: userId });
}

router.get("/my-bus", async (req, res) => {
  const bus = await getAssignedBus(req.user._id);
  if (!bus) return res.status(404).json({ detail: "No bus assigned" });
  res.json(bus.toPublic());
});

router.get("/dashboard", async (req, res) => {
  const bus = await getAssignedBus(req.user._id);
  if (!bus) {
    return res.json({ bus: null, today: { trips: 0, revenue_birr: 0 }, active_trip: null });
  }
  const today = startOfToday();
  const txs = await Transaction.find({
    type: "fare",
    bus_id: bus._id,
    createdAt: { $gte: today },
  });
  const active = await BusTripLeg.findOne({
    bus_id: bus._id,
    cashier_id: req.user._id,
    status: "active",
  }).sort({ started_at: -1 });

  res.json({
    bus: bus.toPublic(),
    today: {
      trips: txs.length,
      revenue_birr: txs.reduce((s, t) => s + t.amount_birr, 0),
    },
    active_trip: active ? active.toPublic() : null,
  });
});

router.get("/qr/active", async (req, res) => {
  const bus = await getAssignedBus(req.user._id);
  if (!bus) return res.json(null);

  const session = await QrSession.findOne({
    bus_id: bus._id,
    active: true,
    ...sessionTimeOk,
  }).sort({ createdAt: -1 });

  if (!session) return res.json(null);

  const scans = await Transaction.countDocuments({ qr_session_id: session._id, type: "fare" });
  res.json({
    token: session.token,
    qr_image: await tokenToDataUrl(session.token),
    fare_birr: session.fare_birr,
    expires_at: session.expires_at,
    scan_count: scans,
    admin_managed: true,
    bus: bus.toPublic(),
  });
});

router.post("/qr/start", (_req, res) => {
  res.status(403).json({
    detail: "Only admin can generate QR codes. Ask your company admin in Staff portal → QR Codes.",
  });
});

router.get("/today", async (req, res) => {
  const bus = await getAssignedBus(req.user._id);
  if (!bus) return res.json({ trips: 0, revenue_birr: 0 });
  const today = startOfToday();
  const txs = await Transaction.find({
    type: "fare",
    bus_id: bus._id,
    createdAt: { $gte: today },
  });
  res.json({
    trips: txs.length,
    revenue_birr: txs.reduce((s, t) => s + t.amount_birr, 0),
  });
});

/** Active trip leg for this cashier + bus */
router.get("/trip/active", async (req, res) => {
  const bus = await getAssignedBus(req.user._id);
  if (!bus) return res.json(null);
  const leg = await BusTripLeg.findOne({
    bus_id: bus._id,
    cashier_id: req.user._id,
    status: "active",
  }).sort({ started_at: -1 });
  res.json(leg ? leg.toPublic() : null);
});

/** Start outbound: first stop → second stop (from route name) */
router.post("/trip/start", async (req, res) => {
  const bus = await getAssignedBus(req.user._id);
  if (!bus) return res.status(404).json({ detail: "No bus assigned" });

  const existing = await BusTripLeg.findOne({
    bus_id: bus._id,
    cashier_id: req.user._id,
    status: "active",
  });
  if (existing) {
    return res.status(400).json({ detail: "Finish current trip before starting a new one" });
  }

  const { from, to } = parseRouteName(bus.route_name);
  const leg = await BusTripLeg.create({
    company_id: bus.company_id,
    bus_id: bus._id,
    cashier_id: req.user._id,
    route_name: bus.route_name,
    from_stop: from,
    to_stop: to,
    direction: "outbound",
    status: "active",
  });
  res.json(leg.toPublic());
});

/** End trip at destination (complete leg) */
router.post("/trip/complete", async (req, res) => {
  const bus = await getAssignedBus(req.user._id);
  if (!bus) return res.status(404).json({ detail: "No bus assigned" });

  const leg = await BusTripLeg.findOne({
    bus_id: bus._id,
    cashier_id: req.user._id,
    status: "active",
  });
  if (!leg) return res.status(400).json({ detail: "No active trip" });

  leg.status = "completed";
  leg.ended_at = new Date();
  await leg.save();
  res.json(leg.toPublic());
});

/** Start return leg: swap from/to of route */
router.post("/trip/return", async (req, res) => {
  const bus = await getAssignedBus(req.user._id);
  if (!bus) return res.status(404).json({ detail: "No bus assigned" });

  const active = await BusTripLeg.findOne({
    bus_id: bus._id,
    cashier_id: req.user._id,
    status: "active",
  });
  if (active) {
    return res.status(400).json({ detail: "Finish current trip before starting return" });
  }

  const { from, to } = parseRouteName(bus.route_name);
  const leg = await BusTripLeg.create({
    company_id: bus.company_id,
    bus_id: bus._id,
    cashier_id: req.user._id,
    route_name: bus.route_name,
    from_stop: to,
    to_stop: from,
    direction: "return",
    status: "active",
  });
  res.json(leg.toPublic());
});

/** Trip legs + fares — default today; pass date_from/date_to for range */
router.get("/reports", async (req, res) => {
  const bus = await getAssignedBus(req.user._id);
  if (!bus) {
    return res.json({ filters: {}, summary: { trips: 0, revenue_birr: 0 }, legs: [], payments: [] });
  }

  const { from, to } = parseDateRange(req.query);
  const legs = await BusTripLeg.find({
    bus_id: bus._id,
    cashier_id: req.user._id,
    started_at: { $lte: to },
    $or: [{ ended_at: null }, { ended_at: { $gte: from } }],
  }).sort({ started_at: -1 });

  const txs = await Transaction.find({
    type: "fare",
    bus_id: bus._id,
    createdAt: { $gte: from, $lte: to },
  })
    .sort({ createdAt: -1 })
    .populate("user_id", "name phone")
    .limit(500);

  const legStats = legs.map((leg) => {
    const legTxs = txs.filter((t) => t.trip_leg_id?.toString() === leg._id.toString());
    return {
      ...leg.toPublic(),
      trips: legTxs.length,
      revenue_birr: legTxs.reduce((s, t) => s + t.amount_birr, 0),
    };
  });

  res.json({
    filters: { date_from: from, date_to: to },
    summary: {
      trips: txs.length,
      revenue_birr: txs.reduce((s, t) => s + t.amount_birr, 0),
    },
    legs: legStats,
    payments: txs.map((t) => ({
      date: t.createdAt,
      amount_birr: t.amount_birr,
      passenger: t.user_id?.name || "",
      trip_label: legStats.find((l) => l.id === t.trip_leg_id?.toString())?.label || bus.route_name,
    })),
  });
});

module.exports = router;
