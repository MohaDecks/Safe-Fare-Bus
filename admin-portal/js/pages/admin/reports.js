import { api } from "../../core/api.js";
import { sfError, sfWarning } from "../../components/dialog.js";
import { formatBirr } from "../../utils/format.js";
import { reportIdFromView } from "../../shell/navigation.js";

let lastReportData = null;

const REPORTS_NO_DATE = new Set(["buses", "staff_summary", "today_trips", "today_registrations"]);

const REPORT_COLUMN_LABELS = {
  period: "Period",
  trips: "Trips",
  total_birr: "Total (ETB)",
  date: "Date",
  passenger: "Passenger",
  phone: "Phone",
  bus: "Bus",
  route: "Route",
  cashier: "Cashier",
  amount_birr: "Amount",
  plate: "Plate",
  route_name: "Route",
  destination: "Destination",
  fare_birr: "Fare",
  name: "Name",
  email: "Email",
  role: "Role",
  count: "Count",
  payment_app: "Payment app",
  balance_after: "Balance after",
};

function defaultReportDateInputs(_reportId) {
  const today = new Date().toISOString().slice(0, 10);
  return { from: today, to: today };
}

function formatReportCell(key, val) {
  if (val == null || val === "") return "—";
  if (key === "date") return `<small>${new Date(val).toLocaleString()}</small>`;
  if (key === "total_birr" || key === "amount_birr" || key === "fare_birr" || key === "balance_after")
    return `<strong>${formatBirr(val)}</strong>`;
  if (key === "period" && /^\d{4}-\d{2}-\d{2}$/.test(String(val))) return String(val);
  return String(val);
}

function reportSummaryHtml(data, from, to, phone) {
  const s = data.summary || {};
  const parts = [`<span><strong>${s.count ?? 0}</strong> ${data.report?.startsWith("daily_") && data.columns?.includes("period") ? "trips total" : "records"}</span>`];
  const moneyReports = new Set([
    "daily_revenue",
    "weekly_revenue",
    "monthly_revenue",
    "daily_trips_detail",
    "today_trips",
    "bus_activity",
    "topups",
    "fare_search",
  ]);
  if (moneyReports.has(data.report)) {
    parts.push(`<span>Total: <strong>${formatBirr(s.total_birr)}</strong></span>`);
  }
  if (s.extra?.unique_passengers != null) {
    parts.push(`<span>Unique passengers today: <strong>${s.extra.unique_passengers}</strong></span>`);
  }
  if (s.extra?.days != null) parts.push(`<span>Days with sales: <strong>${s.extra.days}</strong></span>`);
  if (s.extra?.buses != null) parts.push(`<span>Buses: <strong>${s.extra.buses}</strong></span>`);
  if (s.extra?.with_cashier != null) parts.push(`<span>With cashier: <strong>${s.extra.with_cashier}</strong> / ${s.count}</span>`);
  if (s.extra?.by_role?.length) {
    parts.push(
      `<span>By role: ${s.extra.by_role.map((x) => `<strong>${x.role}</strong> ${x.count}`).join(" · ")}</span>`
    );
  }
  if (!REPORTS_NO_DATE.has(data.report) && (from || to)) {
    parts.push(`<span style="color:var(--muted);font-size:0.85rem">${from || "…"} → ${to || "…"}${phone ? ` · phone: ${phone}` : ""}</span>`);
  } else if (phone) {
    parts.push(`<span style="color:var(--muted);font-size:0.85rem">phone: ${phone}</span>`);
  }
  return parts.join("");
}

function renderReportTable(data) {
  const sumEl = document.getElementById("report-summary");
  const tableEl = document.getElementById("report-table");
  const from = document.getElementById("r-from")?.value;
  const to = document.getElementById("r-to")?.value;
  const phone = document.getElementById("r-phone")?.value?.trim() || "";
  sumEl.innerHTML = `<div class="report-sum-row">${reportSummaryHtml(data, from, to, phone)}</div>`;

  const cols = data.columns || [];
  if (!data.rows?.length) {
    tableEl.innerHTML = `<div class="empty-state">No records for these filters.</div>`;
    return;
  }
  const th = cols.map((c) => `<th>${REPORT_COLUMN_LABELS[c] || c}</th>`).join("");
  const body = data.rows
    .map((r) => `<tr>${cols.map((c) => `<td>${formatReportCell(c, r[c])}</td>`).join("")}</tr>`)
    .join("");
  tableEl.innerHTML = `<table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>`;
}

export async function renderReports(content) {
  const reportId = reportIdFromView() || "daily_revenue";
  const def = defaultReportDateInputs(reportId);
  const showDates = !REPORTS_NO_DATE.has(reportId);

  content.innerHTML = `
      <div class="card report-card">
        <div class="card-body">
          <div class="report-filters">
            ${showDates ? `<div class="form-group"><label>From date</label><input type="date" id="r-from" value="${def.from}" /></div>
            <div class="form-group"><label>To date</label><input type="date" id="r-to" value="${def.to}" /></div>` : ""}
            <div class="form-group report-phone">
              <label>Phone search</label>
              <input type="text" id="r-phone" placeholder="09xx or partial digits" maxlength="15" />
            </div>
            <div class="report-actions">
              <button type="button" class="btn btn-primary" id="run-report">Search</button>
              <button type="button" class="btn btn-secondary" id="export-report">Export CSV</button>
            </div>
          </div>
          <div id="report-summary" class="report-summary"></div>
          <div id="report-table" class="table-wrap" style="margin-top:16px"></div>
        </div>
      </div>`;

  document.getElementById("run-report").onclick = () => loadReportTable().catch((e) => sfError(e.message));
  document.getElementById("export-report").onclick = () => exportReportCsv();
  loadReportTable().catch((e) => sfError(e.message));
}

async function loadReportTable() {
  const report = reportIdFromView() || "daily_revenue";
  const phone = document.getElementById("r-phone")?.value?.trim() || "";
  const qs = new URLSearchParams({ report, limit: "500" });
  if (!REPORTS_NO_DATE.has(report)) {
    const from = document.getElementById("r-from")?.value;
    const to = document.getElementById("r-to")?.value;
    if (from) qs.set("date_from", from);
    if (to) qs.set("date_to", to);
  }
  if (phone) qs.set("phone", phone);
  const data = await api("GET", `/admin/reports?${qs.toString()}`);
  lastReportData = data;
  renderReportTable(data);
}

function exportReportCsv() {
  if (!lastReportData?.rows?.length) {
    sfWarning("Run search first — no data to export.", "Nothing to export");
    return;
  }
  const cols = lastReportData.columns || Object.keys(lastReportData.rows[0] || {});
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = lastReportData.rows.map((r) =>
    cols.map((c) => {
      const v = r[c];
      if (c === "date" && v) return new Date(v).toISOString();
      return v;
    })
  );
  const csv = [cols.join(","), ...lines.map((row) => row.map(esc).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `safefare-report-${lastReportData.report || "data"}-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
