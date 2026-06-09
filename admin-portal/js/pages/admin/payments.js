import { api } from "../../core/api.js";
import { formatBirr } from "../../utils/format.js";

export async function renderPayments(content) {
    const [collections, payments] = await Promise.all([
      api("GET", "/admin/cashier-collections"),
      api("GET", "/admin/recent-payments"),
    ]);
    const collCards =
      collections.length > 0
        ? `<div class="stats-grid" style="margin-bottom:24px">
            ${collections
              .map(
                (c) => `<div class="stat-card success">
              <label>${c.cashier_name}</label>
              <div class="value">${formatBirr(c.today_revenue_birr)}</div>
              <small style="color:var(--muted)">Today · ${c.today_trips} trips · Total ${formatBirr(c.total_revenue_birr)}</small>
            </div>`
              )
              .join("")}
          </div>`
        : `<p class="alert alert-error" style="margin-bottom:16px">No cashier collections yet. Assign cashier to bus → cashier starts QR → passenger pays.</p>`;

    content.innerHTML = `
      ${collCards}
      <div class="card">
        <div class="card-header"><h2>Payment details (who collected)</h2></div>
        <div class="card-body table-wrap">
          ${
            payments.length
              ? `<table><thead><tr><th>Cashier</th><th>Passenger</th><th>Bus</th><th>Route</th><th>Amount</th><th>Time</th></tr></thead><tbody>
              ${payments
                .map(
                  (p) => `<tr>
                <td><strong>${p.cashier_name || "—"}</strong><br/><small>${p.cashier_email || ""}</small></td>
                <td>${p.passenger_name}</td><td>${p.bus_plate}</td><td>${p.route_name}</td>
                <td><strong>${formatBirr(p.amount_birr)}</strong></td>
                <td>${new Date(p.created_at).toLocaleString()}</td></tr>`
                )
                .join("")}</tbody></table>`
              : `<div class="empty-state">No payments yet.</div>`
          }
        </div>
      </div>`;
}
