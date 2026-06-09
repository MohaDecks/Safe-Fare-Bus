import { api } from "../../core/api.js";
import { can } from "../../utils/permissions.js";
import { formatBirr } from "../../utils/format.js";
import { reloadView } from "../../shell/navigation.js";
import { showBusModal, showAssignModal } from "../../modals/index.js";
import { sfError } from "../../components/dialog.js";

export async function renderBuses(content) {
    const buses = await api("GET", "/admin/buses");
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2>All buses &amp; routes</h2>
          ${can("buses.add") ? '<button class="btn btn-primary btn-sm" id="add-bus">+ Add bus / route</button>' : ""}
        </div>
        <div class="card-body table-wrap">
          ${
            buses.length
              ? `<table><thead><tr><th>Plate</th><th>Route</th><th>Fare</th><th>Cashier</th><th>Actions</th></tr></thead><tbody>
              ${buses
                .map(
                  (b) => `<tr>
                <td><strong>${b.plate}</strong></td>
                <td>${b.route_name}</td>
                <td>${formatBirr(b.fare_birr)}</td>
                <td>${b.cashier_id ? '<span class="badge badge-green">Assigned</span>' : '<span class="badge badge-amber">Unassigned</span>'}</td>
                <td class="table-actions">
                  ${can("buses.update") ? `<button type="button" class="btn btn-secondary btn-sm edit-bus-btn" data-id="${b.id}">Edit</button>` : ""}
                  ${can("buses.update") ? `<button type="button" class="btn btn-secondary btn-sm assign-btn" data-id="${b.id}">Assign cashier</button>` : "—"}
                </td>
              </tr>`
                )
                .join("")}</tbody></table>`
              : `<div class="empty-state">No buses yet. Click <strong>Add bus / route</strong>.</div>`
          }
        </div>
      </div>`;
    document.getElementById("add-bus")?.addEventListener("click", () => showBusModal(() => reloadView()));
    document.querySelectorAll(".edit-bus-btn").forEach((btn) => {
      const bus = buses.find((b) => b.id === btn.dataset.id);
      btn.onclick = () => showBusModal(() => reloadView(), bus);
    });
    document.querySelectorAll(".assign-btn").forEach((btn) => {
      btn.onclick = () => showAssignModal(buses, btn.dataset.id, () => reloadView()).catch((e) => sfError(e.message));
    });
}
