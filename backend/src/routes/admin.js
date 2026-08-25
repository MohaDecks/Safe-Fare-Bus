const express = require("express");
const User = require("../models/User");
const Bus = require("../models/Bus");
const Transaction = require("../models/Transaction");
const { requireAuth, requireRole } = require("../middleware/auth");
const { loadAdminPermissions, requireAdminActive, requirePermission } = require("../middleware/permissions");

const router = express.Router();
router.use(requireAuth, requireRole("admin"), requireAdminActive, loadAdminPermissions);

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function companyBusContext(companyId) {
  const buses = await Bus.find({ company_id: companyId }).populate("cashier_id", "name email");
  const busMap = {};
  for (const b of buses) {
    busMap[b._id.toString()] = {
      plate: b.plate,
      route_name: b.route_name,
      cashier_name: b.cashier_id?.name || "—",
      cashier_email: b.cashier_id?.email || "",
      cashier_id: b.cashier_id?._id?.toString() || null,
    };
  }
  return { busIds: buses.map((b) => b._id), busMap };
}

function cashierFromTx(tx, busMap) {
  const qrCashier = tx.qr_session_id?.cashier_id;
  if (qrCashier?.name) {
    return { cashier_name: qrCashier.name, cashier_email: qrCashier.email || "" };
  }
  const bus = busMap[tx.bus_id?.toString()];
  if (bus) return { cashier_name: bus.cashier_name, cashier_email: bus.cashier_email };
  return { cashier_name: "—", cashier_email: "" };
}

router.get("/buses", requirePermission("buses.view"), async (req, res) => {
  const buses = await Bus.find({ company_id: req.user.company_id }).sort({ createdAt: -1 });
  res.json(buses.map((b) => b.toPublic()));
});

router.post("/buses", requirePermission("buses.add"), async (req, res) => {
  const { plate, route_name, fare_birr } = req.body || {};
  if (!plate || !route_name || fare_birr == null) {
    return res.status(400).json({ detail: "plate, route_name, fare_birr required" });
  }
  const bus = await Bus.create({
    plate,
    route_name,
    fare_birr: Number(fare_birr),
    company_id: req.user.company_id,
  });
  res.status(201).json(bus.toPublic());
});

router.patch("/buses/:id", requirePermission("buses.update"), async (req, res) => {
  const bus = await Bus.findOne({ _id: req.params.id, company_id: req.user.company_id });
  if (!bus) return res.status(404).json({ detail: "Bus not found" });
  const { plate, route_name, fare_birr } = req.body || {};
  if (plate != null) bus.plate = String(plate).trim();
  if (route_name != null) bus.route_name = String(route_name).trim();
  if (fare_birr != null) bus.fare_birr = Number(fare_birr);
  if (!bus.plate || !bus.route_name || Number.isNaN(bus.fare_birr)) {
    return res.status(400).json({ detail: "plate, route_name and valid fare_birr required" });
  }
  await bus.save();
  const QrSession = require("../models/QrSession");
  await QrSession.updateMany(
    { bus_id: bus._id, active: true },
    { $set: { fare_birr: bus.fare_birr } }
  );
  res.json(bus.toPublic());
});

router.post("/assign-cashier", requirePermission("buses.update"), async (req, res) => {
  const { getQrCollectorSlugs } = require("../lib/roles");
  const { cashier_email, bus_id } = req.body || {};
  if (!cashier_email || !bus_id) {
    return res.status(400).json({ detail: "cashier_email and bus_id required" });
  }
  const qrSlugs = await getQrCollectorSlugs(req.user.company_id);
  if (!qrSlugs.length) {
    return res.status(400).json({
      detail: "No QR cashier role on Staff roles page. Add a role with Portal opens on: QR collect fare.",
    });
  }
  const email = cashier_email.toLowerCase().trim();
  const { userRoleMatchesSlugs } = require("../lib/roles");
  const other = await User.findOne({ email, company_id: req.user.company_id });
  const cashier = other && userRoleMatchesSlugs(other.role, qrSlugs) ? other : null;
  if (!cashier) {
    if (other) {
      return res.status(404).json({
        detail: `This account is role "${other.role}", not a QR cashier. Staff → Add staff → pick a role with QR portal.`,
      });
    }
    return res.status(404).json({
      detail: "No staff user with this email. Staff roles page only defines the role — go to Staff → + Add staff and create the cashier login.",
    });
  }

  const bus = await Bus.findOne({ _id: bus_id, company_id: req.user.company_id });
  if (!bus) return res.status(404).json({ detail: "Bus not found" });

  bus.cashier_id = cashier._id;
  await bus.save();
  res.json(bus.toPublic());
});

router.get("/revenue", requirePermission("dashboard.view"), async (req, res) => {
  const today = startOfToday();
  const companyBuses = await Bus.find({ company_id: req.user.company_id }).select("_id");
  const busIds = companyBuses.map((b) => b._id);

  const todayTx = await Transaction.find({
    type: "fare",
    bus_id: { $in: busIds },
    createdAt: { $gte: today },
  });
  const allTx = await Transaction.find({ type: "fare", bus_id: { $in: busIds } });

  const sum = (arr) => arr.reduce((s, t) => s + t.amount_birr, 0);
  res.json({
    today_revenue_birr: sum(todayTx),
    total_revenue_birr: sum(allTx),
    today_trips: todayTx.length,
    total_trips: allTx.length,
  });
});

router.get("/dashboard/charts", requirePermission("dashboard.view"), async (req, res) => {
  const { getDashboardCharts } = require("../lib/dashboardCharts");
  const days = Math.min(30, Math.max(7, parseInt(req.query.days, 10) || 14));
  const data = await getDashboardCharts(req.user.company_id, days);
  res.json(data);
});

router.get("/company", requirePermission("dashboard.view"), async (req, res) => {
  const Company = require("../models/Company");
  const { logoUrl } = require("../lib/companyLogo");
  const company = await Company.findById(req.user.company_id);
  res.json({
    id: company?._id?.toString(),
    name: company?.name || "",
    logo_url: logoUrl(company?.logo_path || "", req),
    hub_banner_url: logoUrl(company?.hub_banner_path || "", req),
  });
});

router.patch("/company/logo", requirePermission("dashboard.view"), async (req, res) => {
  const Company = require("../models/Company");
  const { saveCompanyLogo, deleteCompanyLogo, logoUrl } = require("../lib/companyLogo");
  const { logo_base64 } = req.body || {};
  if (!logo_base64) return res.status(400).json({ detail: "logo_base64 required" });

  const company = await Company.findById(req.user.company_id);
  if (!company) return res.status(404).json({ detail: "Company not found" });

  let next;
  try {
    next = await saveCompanyLogo(logo_base64, company._id);
  } catch (e) {
    return res.status(400).json({ detail: e.message || "Invalid logo image" });
  }
  if (!next) return res.status(400).json({ detail: "Invalid logo image" });

  deleteCompanyLogo(company.logo_path);
  company.logo_path = next;
  await company.save();

  res.json({
    id: company._id.toString(),
    name: company.name,
    logo_url: logoUrl(company.logo_path, req),
    hub_banner_url: logoUrl(company.hub_banner_path || "", req),
  });
});

router.delete("/company/logo", requirePermission("dashboard.view"), async (req, res) => {
  const Company = require("../models/Company");
  const { deleteCompanyLogo, logoUrl } = require("../lib/companyLogo");
  const company = await Company.findById(req.user.company_id);
  if (!company) return res.status(404).json({ detail: "Company not found" });

  deleteCompanyLogo(company.logo_path);
  company.logo_path = "";
  await company.save();

  res.json({
    id: company._id.toString(),
    name: company.name,
    logo_url: "",
    hub_banner_url: logoUrl(company.hub_banner_path || "", req),
  });
});

router.patch("/company/hub-banner", requirePermission("dashboard.view"), async (req, res) => {
  const Company = require("../models/Company");
  const { saveHubBanner, deleteCompanyLogo, logoUrl } = require("../lib/companyLogo");
  const { banner_base64 } = req.body || {};
  if (!banner_base64) return res.status(400).json({ detail: "banner_base64 required" });

  const company = await Company.findById(req.user.company_id);
  if (!company) return res.status(404).json({ detail: "Company not found" });

  let next;
  try {
    next = await saveHubBanner(banner_base64);
  } catch (e) {
    return res.status(400).json({ detail: e.message || "Invalid banner image" });
  }
  if (!next) return res.status(400).json({ detail: "Invalid banner image" });

  deleteCompanyLogo(company.hub_banner_path);
  company.hub_banner_path = next;
  await company.save();

  res.json({
    id: company._id.toString(),
    name: company.name,
    logo_url: logoUrl(company.logo_path || "", req),
    hub_banner_url: logoUrl(company.hub_banner_path, req),
  });
});

router.delete("/company/hub-banner", requirePermission("dashboard.view"), async (req, res) => {
  const Company = require("../models/Company");
  const { deleteCompanyLogo, logoUrl } = require("../lib/companyLogo");
  const company = await Company.findById(req.user.company_id);
  if (!company) return res.status(404).json({ detail: "Company not found" });

  deleteCompanyLogo(company.hub_banner_path);
  company.hub_banner_path = "";
  await company.save();

  res.json({
    id: company._id.toString(),
    name: company.name,
    logo_url: logoUrl(company.logo_path || "", req),
    hub_banner_url: "",
  });
});

router.get("/staff", requirePermission("staff.view"), async (req, res) => {
  const { getAssignableRoleSlugs, getRoleLabelMap, userRoleMatchesSlugs, normSlug } = require("../lib/roles");
  const slugs = await getAssignableRoleSlugs(req.user.company_id);
  const labels = await getRoleLabelMap(req.user.company_id);
  const all = await User.find({ company_id: req.user.company_id }).sort({ createdAt: -1 });
  const staff = all.filter((u) => userRoleMatchesSlugs(u.role, slugs));
  res.json(
    staff.map((u) => ({
      ...u.toPublic(),
      role: normSlug(u.role),
      role_label: labels[normSlug(u.role)] || u.role,
    }))
  );
});

router.post("/staff", requirePermission("staff.add"), async (req, res) => {
  const bcrypt = require("bcryptjs");
  const Wallet = require("../models/Wallet");
  const { validateStaffRole } = require("../lib/roles");
  const { name, email, password, phone, role } = req.body || {};
  if (!name || !email || !password || !role) {
    return res.status(400).json({ detail: "name, email, password, role required" });
  }
  const check = await validateStaffRole(role, req.user.company_id);
  if (!check.ok) return res.status(400).json({ detail: check.detail });
  const roleMeta = check.role;
  const exists = await User.findOne({ email: email.toLowerCase().trim() });
  if (exists) return res.status(400).json({ detail: "Email already registered" });

  const { normSlug } = require("../lib/roles");
  const user = await User.create({
    name,
    email: email.toLowerCase().trim(),
    password_hash: await bcrypt.hash(password, 10),
    role: normSlug(role),
    phone: phone || "",
    company_id: req.user.company_id,
  });
  if (roleMeta.can_use_mobile) {
    await Wallet.create({ user_id: user._id, balance_birr: 0 });
  }
  res.status(201).json(user.toPublic());
});

router.get("/cashier-collections", requirePermission("payments.view"), async (req, res) => {
  const today = startOfToday();
  const { busIds, busMap } = await companyBusContext(req.user.company_id);
  if (!busIds.length) return res.json([]);

  const txs = await Transaction.find({ type: "fare", bus_id: { $in: busIds } })
    .populate({ path: "qr_session_id", populate: { path: "cashier_id", select: "name email" } });

  const agg = {};
  for (const t of txs) {
    const { cashier_name, cashier_email } = cashierFromTx(t, busMap);
    if (cashier_name === "—") continue;
    const key = cashier_email || cashier_name;
    if (!agg[key]) {
      agg[key] = {
        cashier_name,
        cashier_email,
        today_revenue_birr: 0,
        today_trips: 0,
        total_revenue_birr: 0,
        total_trips: 0,
      };
    }
    agg[key].total_revenue_birr += t.amount_birr;
    agg[key].total_trips += 1;
    if (t.createdAt >= today) {
      agg[key].today_revenue_birr += t.amount_birr;
      agg[key].today_trips += 1;
    }
  }
  res.json(
    Object.values(agg).sort((a, b) => b.today_revenue_birr - a.today_revenue_birr)
  );
});

router.get("/trip-history", requirePermission("trips.view"), async (req, res) => {
  const { busIds, busMap } = await companyBusContext(req.user.company_id);

  const txs = await Transaction.find({ type: "fare", bus_id: { $in: busIds } })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("user_id", "name email phone")
    .populate({ path: "qr_session_id", populate: { path: "cashier_id", select: "name email" } });

  res.json(
    txs.map((t) => {
      const c = cashierFromTx(t, busMap);
      return {
        id: t._id.toString(),
        amount_birr: t.amount_birr,
        passenger_name: t.user_id?.name || "",
        passenger_email: t.user_id?.email || "",
        passenger_phone: t.user_id?.phone || "",
        bus_plate: busMap[t.bus_id?.toString()]?.plate || "",
        route_name: busMap[t.bus_id?.toString()]?.route_name || "",
        cashier_name: c.cashier_name,
        cashier_email: c.cashier_email,
        created_at: t.createdAt,
      };
    })
  );
});

router.get("/recent-payments", requirePermission("payments.view"), async (req, res) => {
  const { busIds, busMap } = await companyBusContext(req.user.company_id);

  const txs = await Transaction.find({ type: "fare", bus_id: { $in: busIds } })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("user_id", "name email")
    .populate({ path: "qr_session_id", populate: { path: "cashier_id", select: "name email" } });

  res.json(
    txs.map((t) => {
      const c = cashierFromTx(t, busMap);
      return {
        id: t._id.toString(),
        amount_birr: t.amount_birr,
        passenger_name: t.user_id?.name || "Unknown",
        bus_plate: busMap[t.bus_id?.toString()]?.plate || "",
        route_name: busMap[t.bus_id?.toString()]?.route_name || "",
        cashier_name: c.cashier_name,
        cashier_email: c.cashier_email,
        created_at: t.createdAt,
      };
    })
  );
});

module.exports = router;
