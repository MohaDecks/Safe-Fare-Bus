import { api } from "../../core/api.js";
import { formatBirr } from "../../utils/format.js";
import { showCustomerDetailModal, showCustomerOtpModal } from "../../modals/index.js";
import { sfError } from "../../components/dialog.js";

export async function renderCustomers(content) {
    const customers = await api("GET", "/admin/customers");
    content.innerHTML = `
      <div class="card">
        <div class="card-header"><h2>Customers (mobile app)</h2></div>
        <p style="padding:0 22px 12px;color:var(--muted);font-size:0.85rem">
          Registered via phone + OTP in the passenger app. Staff &amp; admins are not listed here.
        </p>
        <div class="card-body table-wrap">
          ${
            customers.length
              ? `<table><thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Company</th><th>Wallet</th><th>Status</th><th>Registered</th><th>Action</th></tr></thead><tbody>
              ${customers
                .map(
                  (c) => `<tr>
                <td>${c.row}</td>
                <td><strong>${c.name}</strong><br/><small style="color:var(--muted)">${c.email}</small></td>
                <td>${c.phone_display || c.phone}</td>
                <td>${c.corporate_name ? `<span class="badge badge-blue">${c.corporate_name}</span>` : "—"}${c.pays_via_company ? '<br/><small style="color:var(--muted)">Company pays fare</small>' : ""}</td>
                <td>${formatBirr(c.wallet_birr)}</td>
                <td>${c.active ? '<span class="badge badge-green">Active</span>' : '<span class="badge">Off</span>'}${c.has_pending_otp ? ' <span class="badge badge-amber">OTP pending</span>' : ""}</td>
                <td><small>${new Date(c.created_at).toLocaleString()}</small></td>
                <td style="white-space:nowrap">
                  <button class="btn btn-secondary btn-sm cust-detail" data-id="${c.id}">View details</button>
                  <button class="btn btn-secondary btn-sm cust-otp" data-id="${c.id}">View OTP</button>
                </td></tr>`
                )
                .join("")}</tbody></table>`
              : `<div class="empty-state">No customers yet. They register in the mobile app with phone + OTP.</div>`
          }
        </div>
      </div>`;
    document.querySelectorAll(".cust-detail").forEach((btn) => {
      btn.onclick = () => showCustomerDetailModal(btn.dataset.id).catch((e) => sfError(e.message));
    });
    document.querySelectorAll(".cust-otp").forEach((btn) => {
      btn.onclick = () => showCustomerOtpModal(btn.dataset.id).catch((e) => sfError(e.message));
    });
}
