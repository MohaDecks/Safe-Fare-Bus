const express = require("express");
const Bus = require("../../models/Bus");
const QrSession = require("../../models/QrSession");
const Transaction = require("../../models/Transaction");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { loadAdminPermissions, requireAdminActive, requirePermission } = require("../../middleware/permissions");
const { tokenToDataUrl } = require("../../lib/qrImage");
const { createQrSessionForBus, deactivateBusSessions } = require("../../lib/qrSession");

const router = express.Router();
router.use(requireAuth, requireRole("admin"), requireAdminActive, loadAdminPermissions);

async function sessionToPublic(session, req) {
  const bus = await Bus.findById(session.bus_id).populate("cashier_id", "name email");
  const scans = await Transaction.countDocuments({ qr_session_id: session._id, type: "fare" });
  return {
    id: session._id.toString(),
    token: session.token,
    qr_image: await tokenToDataUrl(session.token),
    fare_birr: session.fare_birr,
    active: session.active,
    expires_at: session.expires_at,
    created_at: session.createdAt,
    scan_count: scans,
    bus_plate: bus?.plate || "",
    route_name: bus?.route_name || "",
    bus_id: bus?._id?.toString() || "",
    cashier_name: bus?.cashier_id?.name || "—",
    cashier_email: bus?.cashier_id?.email || "",
  };
}

async function sessionInCompany(sessionId, companyId) {
  const session = await QrSession.findById(sessionId);
  if (!session) return null;
  const bus = await Bus.findOne({ _id: session.bus_id, company_id: companyId });
  if (!bus) return null;
  return { session, bus };
}

router.get("/", requirePermission("qrcodes.view"), async (req, res) => {
  const buses = await Bus.find({ company_id: req.user.company_id }).select("_id");
  const busIds = buses.map((b) => b._id);
  const sessions = await QrSession.find({ bus_id: { $in: busIds } })
    .sort({ createdAt: -1 })
    .limit(50);

  const out = [];
  for (const s of sessions) {
    out.push(await sessionToPublic(s, req));
  }
  res.json(out);
});

router.post("/", requirePermission("qrcodes.add"), async (req, res) => {
  const { bus_id } = req.body || {};
  if (!bus_id) return res.status(400).json({ detail: "bus_id required" });

  const bus = await Bus.findOne({ _id: bus_id, company_id: req.user.company_id });
  if (!bus) return res.status(404).json({ detail: "Bus not found" });
  if (!bus.cashier_id) {
    return res.status(400).json({ detail: "Assign a cashier to this bus first (Buses & Routes)" });
  }

  const session = await createQrSessionForBus(bus, req.user._id);
  res.status(201).json(await sessionToPublic(session, req));
});

router.post("/:id/regenerate", requirePermission("qrcodes.update"), async (req, res) => {
  const found = await sessionInCompany(req.params.id, req.user.company_id);
  if (!found) return res.status(404).json({ detail: "QR session not found" });
  const { bus } = found;

  const session = await createQrSessionForBus(bus, req.user._id);
  res.json(await sessionToPublic(session, req));
});

router.patch("/:id", requirePermission("qrcodes.update"), async (req, res) => {
  const found = await sessionInCompany(req.params.id, req.user.company_id);
  if (!found) return res.status(404).json({ detail: "Not found" });
  const { session } = found;

  if (req.body?.active === false) {
    session.active = false;
    await session.save();
    return res.json(await sessionToPublic(session, req));
  }
  if (req.body?.active === true) {
    await deactivateBusSessions(session.bus_id);
    session.active = true;
    await session.save();
    return res.json(await sessionToPublic(session, req));
  }
  return res.status(400).json({ detail: "active: true|false required" });
});

router.delete("/:id", requirePermission("qrcodes.delete"), async (req, res) => {
  const found = await sessionInCompany(req.params.id, req.user.company_id);
  if (!found) return res.status(404).json({ detail: "Not found" });
  const { session } = found;
  session.active = false;
  await session.save();
  res.json({ ok: true });
});

module.exports = router;
