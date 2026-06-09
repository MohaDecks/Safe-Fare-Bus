import { api } from "../../core/api.js";
import { formatBirr } from "../../utils/format.js";

export async function renderTrips(content) {
    const trips = await api("GET", "/admin/trip-history");
    content.innerHTML = `
      <div class="card">
        <div class="card-header"><h2>All trips (passenger fare payments)</h2></div>
        <div class="card-body table-wrap">
          ${
            trips.length
              ? `<table><thead><tr><th>Cashier</th><th>Passenger</th><th>Phone</th><th>Route</th><th>Bus</th><th>Fare</th><th>Date &amp; time</th></tr></thead><tbody>
              ${trips
                .map(
                  (t) => `<tr>
                <td><strong>${t.cashier_name || "—"}</strong></td>
                <td><strong>${t.passenger_name}</strong><br/><small>${t.passenger_email}</small></td>
                <td>${t.passenger_phone || "—"}</td>
                <td>${t.route_name}</td>
                <td>${t.bus_plate}</td>
                <td><strong>${formatBirr(t.amount_birr)}</strong></td>
                <td>${new Date(t.created_at).toLocaleString()}</td></tr>`
                )
                .join("")}</tbody></table>`
              : `<div class="empty-state">No trips yet. Cashier starts QR → passenger scans in mobile app.</div>`
          }
        </div>
      </div>`;
}
