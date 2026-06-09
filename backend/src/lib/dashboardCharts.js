const Bus = require("../models/Bus");
const User = require("../models/User");
const Transaction = require("../models/Transaction");

function dayKey(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

function buildDayRange(days) {
  const labels = [];
  const keys = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    keys.push(dayKey(d));
    labels.push(
      d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    );
  }
  const start = new Date(keys[0]);
  return { labels, keys, start };
}

function bucketSum(items, keys, getKey, getValue) {
  const map = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const item of items) {
    const k = getKey(item);
    if (map[k] !== undefined) map[k] += getValue(item);
  }
  return keys.map((k) => Math.round(map[k] * 100) / 100);
}

function bucketCount(items, keys, getKey) {
  return bucketSum(items, keys, getKey, () => 1);
}

async function getDashboardCharts(companyId, days = 14) {
  const { labels, keys, start } = buildDayRange(days);

  const buses = await Bus.find({ company_id: companyId }).select("_id");
  const busIds = buses.map((b) => b._id);

  const passengers = await User.find({ company_id: companyId, role: "passenger" }).select("_id");
  const passengerIds = passengers.map((u) => u._id);

  const [fareTx, topupTx, newCustomers] = await Promise.all([
    busIds.length
      ? Transaction.find({ type: "fare", bus_id: { $in: busIds }, createdAt: { $gte: start } })
      : [],
    passengerIds.length
      ? Transaction.find({
          type: "topup",
          user_id: { $in: passengerIds },
          createdAt: { $gte: start },
        })
      : [],
    User.find({ company_id: companyId, role: "passenger", createdAt: { $gte: start } }),
  ]);

  const revenue = bucketSum(fareTx, keys, (t) => dayKey(t.createdAt), (t) => t.amount_birr);
  const payments_count = bucketCount(fareTx, keys, (t) => dayKey(t.createdAt));
  const topup_amount = bucketSum(topupTx, keys, (t) => dayKey(t.createdAt), (t) => t.amount_birr);
  const customer_registrations = bucketCount(newCustomers, keys, (u) => dayKey(u.createdAt));

  const totalCustomers = await User.countDocuments({ company_id: companyId, role: "passenger" });

  return {
    labels,
    days,
    revenue,
    payments_count,
    topup_amount,
    customer_registrations,
    summary: {
      total_customers: totalCustomers,
      period_revenue_birr: revenue.reduce((a, b) => a + b, 0),
      period_payments: payments_count.reduce((a, b) => a + b, 0),
      period_topup_birr: topup_amount.reduce((a, b) => a + b, 0),
      period_new_customers: customer_registrations.reduce((a, b) => a + b, 0),
    },
  };
}

module.exports = { getDashboardCharts };
