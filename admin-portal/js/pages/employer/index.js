import { state } from "../../core/state.js";
import { api } from "../../core/api.js";
import { formatBirr } from "../../utils/format.js";
import { reloadView } from "../../shell/navigation.js";
import { showEmpStaffModal, showAllocateModal } from "../../modals/index.js";

/** Legacy employer views — not wired from loadView (employer portal moved to mobile app). */
export async function renderEmployerView(header, content) {
  const account = await api("GET", "/employer/account");

  if (state.view === "dashboard") {
    header.innerHTML = `<div><h1>Employer dashboard</h1><p>Transport allowance for staff</p></div>`;
    const staff = await api("GET", "/employer/staff");
    content.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card success"><label>Company wallet</label><div class="value">${formatBirr(account.balance_birr)}</div></div>
        <div class="stat-card primary"><label>Staff members</label><div class="value">${staff.length}</div></div>
      </div>`;
  } else if (state.view === "staff") {
    header.innerHTML = `<div><h1>Staff</h1><p>Passengers linked to your company</p></div>`;
    const staff = await api("GET", "/employer/staff");
    content.innerHTML = `
      <div class="card">
        <div class="card-header"><h2>Staff list</h2>
          <button class="btn btn-primary btn-sm" id="add-emp-staff">+ Register employee</button></div>
        <p style="padding:0 22px 12px;color:var(--muted);font-size:0.85rem">
          Create a <strong>passenger</strong> account for your company (bus fare wallet). Cannot use cashier/admin emails.
        </p>
        <div class="card-body">
        ${
          staff.length
            ? staff
                .map(
                  (s) =>
                    `<div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)">
                    <div><strong>${s.name}</strong><br/><small>${s.email}</small></div>
                    <button class="btn btn-secondary btn-sm alloc-emp" data-email="${s.email}">Allocate</button></div>`
                )
                .join("")
            : `<div class="empty-state">No staff yet.</div>`
        }
        </div>
      </div>`;
    document.getElementById("add-emp-staff")?.addEventListener("click", () => showEmpStaffModal(() => reloadView()));
    document.querySelectorAll(".alloc-emp").forEach((b) => {
      b.onclick = () => showAllocateModal(b.dataset.email, () => reloadView());
    });
  } else if (state.view === "allocate") {
    header.innerHTML = `<div><h1>Allowances</h1><p>Recent allocations to staff</p></div>`;
    const allocs = await api("GET", "/employer/allocations");
    content.innerHTML = `
      <div class="card"><div class="card-header"><h2>History</h2></div><div class="card-body">
      ${
        allocs.length
          ? allocs
              .map(
                (a) =>
                  `<div style="padding:10px 0;border-bottom:1px solid var(--border)">
                  <strong>${formatBirr(a.amount_birr)}</strong> — ${a.staff_name || a.description || "Allocation"}
                  <br/><small>${a.staff_email || ""}</small></div>`
              )
              .join("")
          : `<div class="empty-state">No allocations yet.</div>`
      }
      </div></div>`;
  }
}
