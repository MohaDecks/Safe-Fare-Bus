const { normalizePhone, formatPhoneDisplay } = require("./phone");

function parseDateRange(query) {
  let from = null;
  let to = null;
  if (query.date_from) {
    from = new Date(query.date_from);
    if (Number.isNaN(from.getTime())) from = null;
    else from.setHours(0, 0, 0, 0);
  }
  if (query.date_to) {
    to = new Date(query.date_to);
    if (Number.isNaN(to.getTime())) to = null;
    else to.setHours(23, 59, 59, 999);
  }
  return { from, to };
}

/** Partial or full phone — digits only for search */
function phoneDigitsForSearch(input) {
  const d = String(input || "").replace(/\D/g, "");
  if (!d || d.length < 3) return null;
  if (d.length === 10 && d.startsWith("0")) return d.slice(1);
  if (d.startsWith("251") && d.length >= 6) return d.slice(3);
  return d;
}

function buildPhoneFilter(digitsFragment) {
  if (!digitsFragment) return null;
  return { $regex: digitsFragment, $options: "i" };
}

function defaultDateRange(days = 30) {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

function isoDate(d) {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

module.exports = {
  parseDateRange,
  phoneDigitsForSearch,
  buildPhoneFilter,
  defaultDateRange,
  isoDate,
  formatPhoneDisplay,
  normalizePhone,
};
