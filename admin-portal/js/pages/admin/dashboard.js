import { api } from "../../core/api.js";
import { can } from "../../utils/permissions.js";
import { formatBirr } from "../../utils/format.js";
import { destroyDashboardCharts, paintDashboardCharts } from "../../components/charts.js";
import { goReport, goToView } from "../../shell/navigation.js";

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
      <div class="dash-grid">
        <div class="card">
          <div class="card-header"><h2>Summary</h2></div>
          <div class="card-body">
            <ul class="dash-list">
              <li>Total trips (all time): <strong>${rev.total_trips}</strong></li>
              <li>Staff (cashier / employer): <strong>${staff.length}</strong></li>
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
