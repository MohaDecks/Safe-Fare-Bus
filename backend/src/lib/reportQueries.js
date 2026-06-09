const User = require("../models/User");
const Bus = require("../models/Bus");
const Transaction = require("../models/Transaction");
const {
  parseDateRange,
  phoneDigitsForSearch,
  buildPhoneFilter,
  defaultDateRange,
  formatPhoneDisplay,
} = require("./reportFilters");
const { getAssignableRoleSlugs, getRoleLabelMap, userRoleMatchesSlugs } = require("./roles");

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayKey(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

function weekLabel(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const onejan = new Date(x.getFullYear(), 0, 1);
  const week = Math.ceil(((x - onejan) / 86400000 + onejan.getDay() + 1) / 7);
  return `${x.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function monthKey(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
}

async function companyBusContext(companyId) {
  const buses = await Bus.find({ company_id: companyId }).populate("cashier_id", "name email");
  const busMap = {};
  for (const b of buses) {
    busMap[b._id.toString()] = {
      plate: b.plate,
      route_name: b.route_name,
      fare_birr: b.fare_birr,
      cashier_name: b.cashier_id?.name || "—",
      cashier_email: b.cashier_id?.email || "",
    };
  }
  return { busIds: buses.map((b) => b._id), busMap, buses };
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

async function passengerIdsByPhone(companyId, phoneQuery) {
  const fragment = phoneDigitsForSearch(phoneQuery);
  if (!fragment) return null;
  const users = await User.find({
    company_id: companyId,
    role: "passenger",
    phone: buildPhoneFilter(fragment),
  }).select("_id");
  return users.map((u) => u._id);
}

async function fetchFareTx(companyId, from, to, passengerFilter) {
  const { busIds, busMap } = await companyBusContext(companyId);
  if (!busIds.length) return { txs: [], busMap };
  const q = { type: "fare", bus_id: { $in: busIds } };
  if (from || to) {
    q.createdAt = {};
    if (from) q.createdAt.$gte = from;
    if (to) q.createdAt.$lte = to;
  }
  if (passengerFilter) q.user_id = { $in: passengerFilter };
  const txs = await Transaction.find(q)
    .sort({ createdAt: -1 })
    .populate("user_id", "name email phone")
    .populate({ path: "qr_session_id", populate: { path: "cashier_id", select: "name email" } });
  return { txs, busMap };
}

function aggregatePeriod(rows, keyFn, labelFn) {
  const map = new Map();
  for (const t of rows) {
    const k = keyFn(t.createdAt);
    if (!map.has(k)) map.set(k, { period: labelFn(t.createdAt), trips: 0, total_birr: 0 });
    const row = map.get(k);
    row.trips += 1;
    row.total_birr += t.amount_birr;
  }
  return [...map.values()]
    .map((r) => ({ ...r, total_birr: Math.round(r.total_birr * 100) / 100 }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

const REPORT_DEFINITIONS = [
  { id: "daily_revenue", label: "Daily — trip money collected", group: "Rev" },
  { id: "weekly_revenue", label: "Weekly — revenue", group: "Rev" },
  { id: "monthly_revenue", label: "Monthly — revenue", group: "Rev" },
  { id: "daily_trips_detail", label: "Daily trips — detail list", group: "Rev" },
  { id: "today_trips", label: "Today — who paid fare (trips)", group: "Today" },
  { id: "today_registrations", label: "Today — app sign-ups", group: "Today" },
  { id: "buses", label: "Buses — count & where they go", group: "Fleet" },
  { id: "bus_activity", label: "Each bus — trips & money", group: "Fleet" },
  { id: "staff_summary", label: "Staff — how many", group: "Staff" },
  { id: "customers", label: "Customer registrations", group: "Cus" },
  { id: "topups", label: "Wallet top-ups", group: "Cus" },
  { id: "fare_search", label: "Search trips by phone", group: "Cus" },
];

async function runReport(companyId, reportId, query) {
  let { from, to } = parseDateRange(query);
  if (!from && !to && !["buses", "staff_summary", "today_trips", "today_registrations"].includes(reportId)) {
    const def = defaultDateRange(1);
    from = def.from;
    to = def.to;
  }
  const phoneQ = query.phone || "";
  const limit = Math.min(500, Math.max(1, parseInt(query.limit, 10) || 200));
  const passengerFilter = await passengerIdsByPhone(companyId, phoneQ);

  if (phoneQ && passengerFilter && !passengerFilter.length && reportId !== "buses" && reportId !== "staff_summary") {
    return emptyResponse(reportId, from, to, phoneQ);
  }

  switch (reportId) {
    case "daily_revenue":
      return dailyRevenue(companyId, from, to, passengerFilter, phoneQ);
    case "weekly_revenue":
      return weeklyRevenue(companyId, from, to, passengerFilter, phoneQ);
    case "monthly_revenue":
      return monthlyRevenue(companyId, from, to, passengerFilter, phoneQ);
    case "daily_trips_detail":
      return dailyTripsDetail(companyId, from, to, passengerFilter, phoneQ, limit);
    case "today_trips":
      return todayTrips(companyId, phoneQ, limit);
    case "today_registrations":
      return todayRegistrations(companyId, phoneQ, limit);
    case "buses":
      return busesReport(companyId);
    case "bus_activity":
      return busActivity(companyId, from, to, passengerFilter, phoneQ);
    case "staff_summary":
      return staffSummary(companyId);
    case "customers":
      return customersReport(companyId, from, to, passengerFilter, phoneQ, limit);
    case "topups":
      return topupsReport(companyId, from, to, passengerFilter, phoneQ, limit);
    case "fare_search":
      return fareSearch(companyId, from, to, passengerFilter, phoneQ, limit);
    default:
      return dailyRevenue(companyId, from, to, passengerFilter, phoneQ);
  }
}

function emptyResponse(type, from, to, phone) {
  return {
    report: type,
    title: REPORT_DEFINITIONS.find((r) => r.id === type)?.label || type,
    filters: { date_from: from, date_to: to, phone },
    summary: { count: 0, total_birr: 0, extra: {} },
    rows: [],
    columns: [],
  };
}

function wrap(reportId, title, filters, summary, rows, columns) {
  return { report: reportId, title, filters, summary, rows, columns };
}

async function dailyRevenue(companyId, from, to, passengerFilter, phone) {
  const { txs } = await fetchFareTx(companyId, from, to, passengerFilter);
  const rows = aggregatePeriod(
    txs,
    (d) => dayKey(d),
    (d) => dayKey(d)
  );
  const total_birr = rows.reduce((s, r) => s + r.total_birr, 0);
  const trips = rows.reduce((s, r) => s + r.trips, 0);
  return wrap(
    "daily_revenue",
    "Daily trip revenue",
    { date_from: from, date_to: to, phone },
    { count: trips, total_birr, extra: { days: rows.length } },
    rows,
    ["period", "trips", "total_birr"]
  );
}

async function weeklyRevenue(companyId, from, to, passengerFilter, phone) {
  const { txs } = await fetchFareTx(companyId, from, to, passengerFilter);
  const rows = aggregatePeriod(txs, weekLabel, weekLabel);
  const total_birr = rows.reduce((s, r) => s + r.total_birr, 0);
  const trips = rows.reduce((s, r) => s + r.trips, 0);
  return wrap("weekly_revenue", "Weekly revenue", { date_from: from, date_to: to, phone }, { count: trips, total_birr }, rows, [
    "period",
    "trips",
    "total_birr",
  ]);
}

async function monthlyRevenue(companyId, from, to, passengerFilter, phone) {
  const { txs } = await fetchFareTx(companyId, from, to, passengerFilter);
  const rows = aggregatePeriod(txs, monthKey, monthKey);
  const total_birr = rows.reduce((s, r) => s + r.total_birr, 0);
  const trips = rows.reduce((s, r) => s + r.trips, 0);
  return wrap("monthly_revenue", "Monthly revenue", { date_from: from, date_to: to, phone }, { count: trips, total_birr }, rows, [
    "period",
    "trips",
    "total_birr",
  ]);
}

async function dailyTripsDetail(companyId, from, to, passengerFilter, phone, limit) {
  const { txs, busMap } = await fetchFareTx(companyId, from, to, passengerFilter);
  const slice = txs.slice(0, limit);
  const rows = slice.map((t) => mapFareRow(t, busMap));
  const total_birr = slice.reduce((s, t) => s + t.amount_birr, 0);
  return wrap(
    "daily_trips_detail",
    "Daily trips (detail)",
    { date_from: from, date_to: to, phone },
    { count: slice.length, total_birr },
    rows,
    ["date", "passenger", "phone", "bus", "route", "cashier", "amount_birr"]
  );
}

async function todayTrips(companyId, phone, limit) {
  const today = startOfToday();
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const passengerFilter = await passengerIdsByPhone(companyId, phone);
  const { txs, busMap } = await fetchFareTx(companyId, today, end, passengerFilter);
  const uniquePassengers = new Set(txs.map((t) => t.user_id?.toString()).filter(Boolean));
  const slice = txs.slice(0, limit);
  const rows = slice.map((t) => mapFareRow(t, busMap));
  const total_birr = txs.reduce((s, t) => s + t.amount_birr, 0);
  return wrap(
    "today_trips",
    "Today — trips via app (QR pay)",
    { date_from: today, date_to: end, phone },
    {
      count: txs.length,
      total_birr,
      extra: { unique_passengers: uniquePassengers.size },
    },
    rows,
    ["date", "passenger", "phone", "bus", "route", "amount_birr"]
  );
}

async function todayRegistrations(companyId, phone, limit) {
  const today = startOfToday();
  const q = { company_id: companyId, role: "passenger", createdAt: { $gte: today } };
  if (phone) {
    const pf = await passengerIdsByPhone(companyId, phone);
    if (!pf?.length) return emptyResponse("today_registrations", today, new Date(), phone);
    q._id = { $in: pf };
  }
  const users = await User.find(q).sort({ createdAt: -1 }).limit(limit);
  const rows = users.map((u) => ({
    date: u.createdAt,
    name: u.name,
    phone: formatPhoneDisplay(u.phone),
    email: u.email,
  }));
  return wrap(
    "today_registrations",
    "Today — app registrations",
    { date_from: today, phone },
    { count: rows.length, total_birr: 0, extra: {} },
    rows,
    ["date", "name", "phone", "email"]
  );
}

async function busesReport(companyId) {
  const { buses } = await companyBusContext(companyId);
  const rows = buses.map((b) => ({
    plate: b.plate,
    route_name: b.route_name,
    destination: b.route_name,
    fare_birr: b.fare_birr,
    cashier: b.cashier_id?.name || "—",
    has_cashier: !!b.cashier_id,
  }));
  return wrap(
    "buses",
    "Buses — count & routes (where they go)",
    {},
    { count: rows.length, total_birr: 0, extra: { with_cashier: rows.filter((r) => r.has_cashier).length } },
    rows,
    ["plate", "route_name", "destination", "fare_birr", "cashier"]
  );
}

async function busActivity(companyId, from, to, passengerFilter, phone) {
  const { buses } = await companyBusContext(companyId);
  const agg = {};
  for (const b of buses) {
    agg[b._id.toString()] = {
      plate: b.plate,
      route_name: b.route_name,
      destination: b.route_name,
      trips: 0,
      total_birr: 0,
    };
  }
  const filtered = await fetchFareTx(companyId, from, to, passengerFilter);
  for (const t of filtered.txs) {
    const id = t.bus_id?.toString();
    if (!id || !agg[id]) continue;
    agg[id].trips += 1;
    agg[id].total_birr += t.amount_birr;
  }
  const rows = Object.values(agg).map((r) => ({
    ...r,
    total_birr: Math.round(r.total_birr * 100) / 100,
  }));
  const total_birr = rows.reduce((s, r) => s + r.total_birr, 0);
  const trips = rows.reduce((s, r) => s + r.trips, 0);
  return wrap(
    "bus_activity",
    "Each bus — trips & revenue",
    { date_from: from, date_to: to, phone },
    { count: trips, total_birr, extra: { buses: rows.length } },
    rows,
    ["plate", "route_name", "destination", "trips", "total_birr"]
  );
}

async function staffSummary(companyId) {
  const slugs = await getAssignableRoleSlugs(companyId);
  const labels = await getRoleLabelMap(companyId);
  const all = await User.find({ company_id: companyId }).sort({ createdAt: -1 });
  const staff = all.filter((u) => userRoleMatchesSlugs(u.role, slugs));
  const byRole = {};
  for (const u of staff) {
    const key = labels[u.role] || u.role;
    byRole[key] = (byRole[key] || 0) + 1;
  }
  const summaryRows = Object.entries(byRole).map(([role, count]) => ({ role, count }));
  const rows = staff.map((u) => ({
    name: u.name,
    role: labels[u.role] || u.role,
    email: u.email,
    phone: formatPhoneDisplay(u.phone) || u.phone || "—",
    date: u.createdAt,
  }));
  return wrap(
    "staff_summary",
    "Staff — how many",
    {},
    { count: staff.length, total_birr: 0, extra: { by_role: summaryRows } },
    rows,
    ["name", "role", "email", "phone", "date"]
  );
}

async function customersReport(companyId, from, to, passengerFilter, phone, limit) {
  const q = { company_id: companyId, role: "passenger" };
  if (from || to) {
    q.createdAt = {};
    if (from) q.createdAt.$gte = from;
    if (to) q.createdAt.$lte = to;
  }
  if (passengerFilter) q._id = { $in: passengerFilter };
  const users = await User.find(q).sort({ createdAt: -1 }).limit(limit);
  const rows = users.map((u) => ({
    date: u.createdAt,
    name: u.name,
    phone: formatPhoneDisplay(u.phone),
    email: u.email,
  }));
  return wrap("customers", "Customer registrations", { date_from: from, date_to: to, phone }, { count: rows.length, total_birr: 0 }, rows, [
    "date",
    "name",
    "phone",
    "email",
  ]);
}

async function topupsReport(companyId, from, to, passengerFilter, phone, limit) {
  const passengers = await User.find({ company_id: companyId, role: "passenger" }).select("_id");
  const ids = passengers.map((u) => u._id);
  const q = { type: "topup", user_id: { $in: passengerFilter || ids } };
  if (from || to) {
    q.createdAt = {};
    if (from) q.createdAt.$gte = from;
    if (to) q.createdAt.$lte = to;
  }
  const txs = await Transaction.find(q)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("user_id", "name phone")
    .populate("payment_provider_id", "name");
  const rows = txs.map((t) => ({
    date: t.createdAt,
    passenger: t.user_id?.name || "",
    phone: formatPhoneDisplay(t.user_id?.phone),
    payment_app: t.payment_provider_id?.name || "—",
    amount_birr: t.amount_birr,
    balance_after: t.balance_after_birr,
  }));
  const total_birr = rows.reduce((s, r) => s + r.amount_birr, 0);
  return wrap("topups", "Wallet top-ups", { date_from: from, date_to: to, phone }, { count: rows.length, total_birr }, rows, [
    "date",
    "passenger",
    "phone",
    "payment_app",
    "amount_birr",
    "balance_after",
  ]);
}

async function fareSearch(companyId, from, to, passengerFilter, phone, limit) {
  return dailyTripsDetail(companyId, from, to, passengerFilter, phone, limit);
}

function mapFareRow(t, busMap) {
  const c = cashierFromTx(t, busMap);
  const bus = busMap[t.bus_id?.toString()] || {};
  return {
    date: t.createdAt,
    passenger: t.user_id?.name || "",
    phone: formatPhoneDisplay(t.user_id?.phone),
    bus: bus.plate || "",
    route: bus.route_name || "",
    cashier: c.cashier_name,
    amount_birr: t.amount_birr,
  };
}

module.exports = { REPORT_DEFINITIONS, runReport };
