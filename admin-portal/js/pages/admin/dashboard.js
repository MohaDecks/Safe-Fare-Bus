import { state } from "../../core/state.js";
import { api } from "../../core/api.js";
import { can } from "../../utils/permissions.js";
import { formatBirr } from "../../utils/format.js";
import { destroyDashboardCharts, paintDashboardCharts } from "../../components/charts.js";
import { goReport, goToView, refreshApp } from "../../shell/navigation.js";
import { sfConfirm, sfError } from "../../components/dialog.js";
import { DEFAULT_LOGO } from "../../core/config.js";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const LOGO_MAX_BYTES = 2 * 1024 * 1024;

function resizeImageFile(file, maxDim = 512, quality = 0.88) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/webp", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image file"));
    };
    img.src = url;
  });
}

async function prepareLogoUpload(file) {
  if (file.type === "image/svg+xml") {
    if (file.size > LOGO_MAX_BYTES) throw new Error("SVG logo must be under 2MB");
    return readFileAsDataUrl(file);
  }
  if (file.size <= LOGO_MAX_BYTES) return readFileAsDataUrl(file);
  return resizeImageFile(file);
}

export async function renderDashboard(content) {
    destroyDashboardCharts();
    const [rev, buses, company, staff, charts] = await Promise.all([
      api("GET", "/admin/revenue"),
      api("GET", "/admin/buses"),
      api("GET", "/admin/company"),
      can("staff.view") ? api("GET", "/admin/staff").catch(() => []) : Promise.resolve([]),
      api("GET", "/admin/dashboard/charts?days=14").catch(() => null),
    ]);
    const s = charts?.summary || {};
    content.innerHTML = `
      <div class="dash-hero">
        <div>
          <h2>${company.name || "Your company"}</h2>
          <p>SafeFare overview — last ${charts?.days || 14} days</p>
        </div>
        <div class="dash-hero-stats">
          <div class="dash-hero-stat"><label>Customers</label><strong>${s.total_customers ?? "—"}</strong></div>
          <div class="dash-hero-stat"><label>Period revenue</label><strong>${formatBirr(s.period_revenue_birr)}</strong></div>
          <div class="dash-hero-stat"><label>New customers</label><strong>${s.period_new_customers ?? 0}</strong></div>
        </div>
      </div>
      <div class="dash-stats">
        <div class="dash-stat"><div class="dash-stat-icon blue">🚌</div><div><label>Active buses</label><div class="dash-stat-val">${buses.length}</div></div></div>
        <div class="dash-stat"><div class="dash-stat-icon green">🎫</div><div><label>Today trips</label><div class="dash-stat-val">${rev.today_trips}</div></div></div>
        <div class="dash-stat"><div class="dash-stat-icon teal">💳</div><div><label>Today revenue</label><div class="dash-stat-val">${formatBirr(rev.today_revenue_birr)}</div></div></div>
        <div class="dash-stat"><div class="dash-stat-icon amber">💰</div><div><label>Total revenue</label><div class="dash-stat-val">${formatBirr(rev.total_revenue_birr)}</div></div></div>
        <div class="dash-stat"><div class="dash-stat-icon purple">👤</div><div><label>App customers</label><div class="dash-stat-val">${s.total_customers ?? 0}</div></div></div>
      </div>
      <div class="dash-charts">
        <div class="chart-card">
          <div class="chart-card-header">
            <h3>Earnings (revenue)</h3>
            <p>Daily fare collected · ETB</p>
          </div>
          <div class="chart-wrap"><canvas id="chart-revenue"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-card-header">
            <h3>Customer registration</h3>
            <p>New app sign-ups per day</p>
          </div>
          <div class="chart-wrap"><canvas id="chart-customers"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-card-header">
            <h3>Payments (trips)</h3>
            <p>QR fare scans per day</p>
          </div>
          <div class="chart-wrap"><canvas id="chart-payments"></canvas></div>
        </div>
      </div>
      <div class="card" style="margin-bottom:24px">
        <div class="card-header"><h2>Company logo</h2></div>
        <p style="padding:0 22px 12px;color:var(--muted);font-size:0.85rem">
          Shown on the staff login page. PNG, JPG, WebP, GIF, or SVG (large photos are auto-resized).
        </p>
        <div class="card-body company-branding-panel">
          <div class="company-branding-preview">
            ${
              company.logo_url
                ? `<img src="${company.logo_url}" alt="${company.name || "Company logo"}" class="company-branding-logo" />`
                : `<img src="${DEFAULT_LOGO}" alt="Safe Fare default logo" class="company-branding-logo" />`
            }
          </div>
          <div class="company-branding-actions">
            <label class="btn btn-secondary btn-sm company-branding-upload">
              ${company.logo_url ? "Change logo" : "Upload logo"}
              <input type="file" id="company-logo-file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" hidden />
            </label>
            ${company.logo_url ? '<button type="button" class="btn btn-secondary btn-sm" id="company-logo-delete">Remove logo</button>' : ""}
          </div>
        </div>
      </div>
      <div class="dash-grid">
        <div class="card">
          <div class="card-header"><h2>Summary</h2></div>
          <div class="card-body">
            <ul class="dash-list">
              <li>Total trips (all time): <strong>${rev.total_trips}</strong></li>
              <li>Staff (cashiers): <strong>${staff.length}</strong></li>
              <li>Payments (14 days): <strong>${s.period_payments ?? 0}</strong></li>
              <li>Top-ups (14 days): <strong>${formatBirr(s.period_topup_birr)}</strong></li>
            </ul>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h2>Quick links</h2></div>
          <div class="card-body dash-quick">
            ${can("buses.view") ? '<button type="button" class="btn btn-secondary btn-sm" data-go="buses">Buses & Routes</button>' : ""}
            ${can("qrcodes.view") ? '<button type="button" class="btn btn-secondary btn-sm" data-go="qrcodes">QR Codes</button>' : ""}
            ${can("customers.view") ? '<button type="button" class="btn btn-secondary btn-sm" data-go="customers">Customers</button>' : ""}
            ${can("reports.view") ? '<button type="button" class="btn btn-secondary btn-sm" data-go="report:daily_revenue">Reports</button>' : ""}
            ${can("staff.view") ? '<button type="button" class="btn btn-secondary btn-sm" data-go="staff">Staff</button>' : ""}
            ${can("payments.view") ? '<button type="button" class="btn btn-secondary btn-sm" data-go="payments">Cashier money</button>' : ""}
          </div>
        </div>
      </div>`;
    requestAnimationFrame(() => paintDashboardCharts(charts));
    document.getElementById("company-logo-file")?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      try {
        const logo_base64 = await prepareLogoUpload(file);
        const updated = await api("PATCH", "/admin/company/logo", { logo_base64 });
        state.companyBrand = updated;
        refreshApp();
      } catch (err) {
        sfError(err.message);
      }
    });
    document.getElementById("company-logo-delete")?.addEventListener("click", async () => {
      if (!(await sfConfirm("Remove the company logo from the login page?", { danger: true, confirmText: "Remove" }))) return;
      try {
        const updated = await api("DELETE", "/admin/company/logo");
        state.companyBrand = updated;
        refreshApp();
      } catch (err) {
        sfError(err.message);
      }
    });
    content.querySelectorAll("[data-go]").forEach((btn) => {
      btn.onclick = () => {
        const go = btn.dataset.go;
        if (go.startsWith("report:")) {
          goReport(go.slice(7));
          return;
        }
        goToView(go);
      };
    });
}
