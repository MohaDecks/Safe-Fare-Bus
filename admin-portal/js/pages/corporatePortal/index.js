import { state } from "../../core/state.js";
import { api } from "../../core/api.js";
import { formatBirr } from "../../utils/format.js";
import { reloadView, goToView } from "../../shell/navigation.js";
import { openModal } from "../../components/modal.js";
import { sfConfirm, sfError } from "../../components/dialog.js";

function showAddCustomerModal(reload) {
  openModal(
    "Add customer",
    `<p class="corp-modal-lead">Enter the customer's phone number. When they sign up in the mobile app, they will appear here automatically.</p>
     <div class="form-group">
       <label for="m-cust-phone">Phone number</label>
       <input id="m-cust-phone" type="tel" inputmode="numeric" placeholder="0912345678" autocomplete="tel" />
       <small class="field-hint">10 digits, starts with 0 — e.g. 0912345678</small>
     </div>
     <div class="form-group">
       <label for="m-cust-name">Full name <span class="label-optional">(optional)</span></label>
       <input id="m-cust-name" type="text" placeholder="Customer name" autocomplete="name" />
     </div>`,
    async () => {
      const phone = document.getElementById("m-cust-phone").value.trim();
      const name = document.getElementById("m-cust-name").value.trim();
      if (!/^0\d{9}$/.test(phone)) {
        throw new Error("Enter a valid phone: 10 digits starting with 0");
      }
      await api("POST", "/corporate/employees", { phone, name });
      reload();
    },
    false,
    "Customer added"
  );
  setTimeout(() => document.getElementById("m-cust-phone")?.focus(), 50);
}

function showAllocateModal(employee, companyBalance, reload) {
  openModal(
    `Top up — ${employee.name || employee.phone}`,
    `<div class="corp-wallet-summary">
       <div><span>Company balance</span><strong>${formatBirr(companyBalance)}</strong></div>
       <div><span>Customer wallet</span><strong>${formatBirr(employee.wallet_balance_birr ?? 0)}</strong></div>
     </div>
     <div class="form-group">
       <label for="m-alloc-amt">Amount (ETB)</label>
       <input id="m-alloc-amt" type="number" min="1" step="1" value="200" />
     </div>
     <div class="form-group">
       <label for="m-alloc-note">Note <span class="label-optional">(optional)</span></label>
       <input id="m-alloc-note" placeholder="Monthly allowance…" />
     </div>
     <p class="field-hint">Amount is deducted from company wallet and added to the customer's app wallet.</p>`,
    async () => {
      const amount_birr = Number(document.getElementById("m-alloc-amt").value);
      const note = document.getElementById("m-alloc-note").value.trim();
      if (!amount_birr || amount_birr <= 0) throw new Error("Enter a valid amount");
      await api("POST", `/corporate/employees/${employee.id}/allocate`, { amount_birr, note });
      reload();
    },
    false,
    "Customer wallet topped up"
  );
}

function showCompanyTopUpModal(providers, reload) {
  const providerOpts = providers.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
  openModal(
    "Top up company wallet",
    `<p class="corp-modal-lead">Add money to your company balance before topping up customers.</p>
     <div class="form-group">
       <label for="m-corp-provider">Payment app</label>
       <select id="m-corp-provider">${providerOpts}</select>
     </div>
     <div class="form-group">
       <label for="m-corp-amount">Amount (ETB)</label>
       <input id="m-corp-amount" type="number" min="1" step="1" value="1000" />
     </div>`,
    async () => {
      const amount = Number(document.getElementById("m-corp-amount").value);
      const payment_provider_id = document.getElementById("m-corp-provider").value;
      if (!amount || amount <= 0) throw new Error("Enter a valid amount");
      await api("POST", "/corporate/topup", { amount_birr: amount, payment_provider_id });
      reload();
    },
    false,
    "Company wallet topped up"
  );
}

async function renderDashboard(header, content) {
  header.innerHTML = `
    <div>
      <h1>Company wallet</h1>
      <p class="page-subtitle">${state.user.company_name || state.user.name}</p>
    </div>`;
  const dash = await api("GET", "/corporate/dashboard");
  const providers = await api("GET", "/corporate/payment-providers");

  content.innerHTML = `
    <div class="stats-grid corp-stats">
      <div class="stat-card success">
        <label>Company balance</label>
        <div class="value">${formatBirr(dash.balance_birr)}</div>
      </div>
      <div class="stat-card primary">
        <label>Customers</label>
        <div class="value">${dash.employees_total}</div>
      </div>
      <div class="stat-card">
        <label>In mobile app</label>
        <div class="value">${dash.employees_registered}</div>
      </div>
    </div>
    <div class="card corp-card">
      <div class="card-header">
        <h2>Top up company wallet</h2>
      </div>
      <div class="card-body">
        <p class="corp-help">
          Add money here first, then go to <strong>Customers</strong> and top up each person from this balance.
        </p>
        ${
          providers.length
            ? `<button type="button" class="btn btn-primary" id="corp-topup-btn">+ Add to company wallet</button>`
            : `<div class="alert alert-error">No payment apps configured. Ask your bus admin to add top-up apps.</div>`
        }
      </div>
    </div>`;

  document.getElementById("corp-topup-btn")?.addEventListener("click", () => {
    showCompanyTopUpModal(providers, () => reloadView());
  });
}

async function renderEmployees(header, content) {
  header.innerHTML = `
    <div>
      <h1>Customers</h1>
      <p class="page-subtitle">Top up each customer from your company wallet</p>
    </div>`;
  const dash = await api("GET", "/corporate/dashboard");
  const rows = await api("GET", "/corporate/employees");

  content.innerHTML = `
    <div class="corp-balance-banner">
      <div class="corp-balance-banner__text">
        <span class="corp-balance-banner__label">Company balance</span>
        <span class="corp-balance-banner__value">${formatBirr(dash.balance_birr)}</span>
        <span class="corp-balance-banner__hint">Deducted when you top up customers</span>
      </div>
      <button type="button" class="btn btn-secondary btn-sm" id="goto-wallet">Top up company wallet</button>
    </div>
    <div class="card corp-card">
      <div class="card-header">
        <h2>Customer list</h2>
        <button type="button" class="btn btn-primary btn-sm" id="add-emp">+ Add customer</button>
      </div>
      <p class="corp-help corp-help--pad">
        Add phone numbers below. When customers register in the app they link automatically. Use <strong>Top up</strong> to send money from company balance.
      </p>
      <div class="card-body table-wrap">
        ${
          rows.length
            ? `<table class="corp-table"><thead><tr>
                <th>Name</th><th>Phone</th><th>App wallet</th><th>Status</th><th></th>
              </tr></thead><tbody>
              ${rows
                .map(
                  (e) => `<tr>
                <td><strong>${e.name || "—"}</strong></td>
                <td><code class="phone-code">${e.phone}</code></td>
                <td>${e.registered ? `<span class="wallet-amt">${formatBirr(e.wallet_balance_birr ?? 0)}</span>` : "—"}</td>
                <td>${e.registered ? '<span class="badge badge-green">In app</span>' : '<span class="badge">Waiting signup</span>'}</td>
                <td class="corp-actions">
                  ${e.registered ? `<button type="button" class="btn btn-primary btn-sm alloc-emp" data-id="${e.id}">Top up</button>` : ""}
                  <button type="button" class="btn btn-secondary btn-sm del-emp" data-id="${e.id}">Remove</button>
                </td>
              </tr>`
                )
                .join("")}</tbody></table>`
            : `<div class="empty-state corp-empty">
                <div class="corp-empty-icon">👥</div>
                <p><strong>No customers yet</strong></p>
                <p class="corp-help">Click <strong>Add customer</strong> and enter their phone number.</p>
              </div>`
        }
      </div>
    </div>`;

  document.getElementById("goto-wallet")?.addEventListener("click", () => goToView("dashboard"));
  document.getElementById("add-emp")?.addEventListener("click", () => showAddCustomerModal(() => reloadView()));

  document.querySelectorAll(".alloc-emp").forEach((btn) => {
    const row = rows.find((e) => e.id === btn.dataset.id);
    btn.onclick = () => showAllocateModal(row, dash.balance_birr, () => reloadView());
  });

  document.querySelectorAll(".del-emp").forEach((btn) => {
    btn.onclick = async () => {
      const ok = await sfConfirm("Remove this customer from your company?", {
        danger: true,
        confirmText: "Remove",
        title: "Remove customer",
      });
      if (!ok) return;
      try {
        await api("DELETE", `/corporate/employees/${btn.dataset.id}`);
        reloadView();
      } catch (e) {
        sfError(e.message);
      }
    };
  });
}

export async function renderCorporatePortalView(header, content) {
  if (state.view === "employees") return renderEmployees(header, content);
  return renderDashboard(header, content);
}
