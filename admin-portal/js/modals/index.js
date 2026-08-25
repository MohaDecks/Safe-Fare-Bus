import { openModal } from "../components/modal.js";
import { api } from "../core/api.js";
import { formatBirr } from "../utils/format.js";
import { prepareIconUpload } from "../utils/imageUpload.js";
import { sfWarning, sfSuccess } from "../components/dialog.js";

export function showGenerateQrModal(buses, reload) {
  const withCashier = buses.filter((b) => b.cashier_id);
  if (!withCashier.length) {
    sfWarning("No bus with cashier. Go to Buses & Routes → Assign cashier first.", "Cannot generate QR");
    return;
  }
  const opts = withCashier
    .map((b) => `<option value="${b.id}">${b.plate} — ${b.route_name}</option>`)
    .join("");
  openModal(
    "Generate fare QR",
    `<p style="font-size:0.85rem;color:var(--muted);margin-bottom:12px">Replaces any active QR on this bus. Passengers can scan many times until you regenerate.</p>
     <div class="form-group"><label>Bus</label><select id="m-bus">${opts}</select></div>`,
    async () => {
      await api("POST", "/admin/qr-sessions", { bus_id: document.getElementById("m-bus").value });
      reload();
    }
  );
}

export function showBusModal(reload, existing) {
  const isEdit = !!existing;
  openModal(
    isEdit ? "Edit bus &amp; route" : "Add bus &amp; route",
    `<div class="form-group"><label>Plate number</label><input id="m-plate" placeholder="AA-3-12345" value="${existing?.plate || ""}" /></div>
     <div class="form-group"><label>Route name</label><input id="m-route" placeholder="Bole - Magaalaya" value="${existing?.route_name || ""}" /></div>
     <div class="form-group"><label>Fare (ETB)</label><input id="m-fare" type="number" step="0.01" value="${existing?.fare_birr ?? ""}" /></div>`,
    async () => {
      const body = {
        plate: document.getElementById("m-plate").value.trim(),
        route_name: document.getElementById("m-route").value.trim(),
        fare_birr: parseFloat(document.getElementById("m-fare").value),
      };
      if (isEdit) await api("PATCH", `/admin/buses/${existing.id}`, body);
      else await api("POST", "/admin/buses", body);
      reload();
    }
  );
}

export function showCorporateModal(reload, existing) {
  const isEdit = !!existing;
  openModal(
    isEdit ? "Edit corporate company" : "Register corporate company",
    `<p style="font-size:0.85rem;color:var(--muted);margin-bottom:12px">Company logs in at <strong>/admin/</strong> with the email and password below (web portal — not mobile app).</p>
     <div class="form-group"><label>Company name</label><input id="m-cname" value="${existing?.company_name || ""}" placeholder="ABC Transport PLC" /></div>
     <div class="form-group"><label>Contact person</label><input id="m-contact" value="${existing?.contact_name || ""}" placeholder="Manager name" /></div>
     <div class="form-group"><label>Login email</label><input id="m-cemail" type="email" value="${existing?.email || ""}" placeholder="company@email.com" /></div>
     <div class="form-group"><label>${isEdit ? "New password (leave blank to keep)" : "Password"}</label><input id="m-cpass" type="password" placeholder="Min 6 characters" /></div>
     <div class="form-group"><label>Phone (optional)</label><input id="m-cphone" value="${existing?.phone || ""}" placeholder="0912345678" /></div>
     ${isEdit ? `<div class="form-group"><label><input type="checkbox" id="m-cactive" ${existing.active !== false ? "checked" : ""} /> Active — can login to portal</label></div>` : ""}`,
    async () => {
      const body = {
        company_name: document.getElementById("m-cname").value.trim(),
        contact_name: document.getElementById("m-contact").value.trim(),
        email: document.getElementById("m-cemail").value.trim(),
        phone: document.getElementById("m-cphone").value.trim(),
      };
      const pass = document.getElementById("m-cpass").value;
      if (!isEdit && (!pass || pass.length < 6)) throw new Error("Password required (min 6 characters)");
      if (pass) body.password = pass;
      if (isEdit) {
        body.active = document.getElementById("m-cactive").checked;
        await api("PATCH", `/admin/corporates/${existing.id}`, body);
      } else {
        const res = await api("POST", "/admin/corporates", body);
        reload();
        await sfSuccess(
          `Give them these login details:\n\nURL: /admin/\nEmail: ${res.email}\nPassword: (what you entered)\n\nCompany tops up wallet from portal, then Customers → top up each employee.`,
          "Company registered"
        );
        return;
      }
      reload();
    },
    false,
    isEdit ? "Company updated" : false
  );
}

export async function showAssignModal(buses, busId, reload) {
  const staff = await api("GET", "/admin/staff");
  const roles = await api("GET", "/admin/roles");
  const qrSlugs = roles.filter((r) => r.portal_home === "qr" || r.slug === "cashier").map((r) => r.slug);
  const qrSet = new Set(qrSlugs.map((s) => s.toLowerCase()));
  const cashiers = staff.filter((s) => qrSet.has((s.role || "").toLowerCase()));
  const busOpts = buses
    .map((b) => `<option value="${b.id}" ${b.id === busId ? "selected" : ""}>${b.plate} — ${b.route_name}</option>`)
    .join("");

  const qrRoleLabels = roles
    .filter((r) => r.portal_home === "qr" || r.slug === "cashier")
    .map((r) => r.label)
    .join(", ");
  const cashierField =
    cashiers.length > 0
      ? `<div class="form-group"><label>Cashier account</label>
         <select id="m-email">${cashiers.map((c) => `<option value="${c.email}">${c.name} (${c.email}) — ${c.role_label || c.role}</option>`).join("")}</select></div>`
      : `<div class="alert alert-error" style="margin-bottom:12px">
           <strong>No cashier staff account.</strong><br/>
           <strong>Staff roles</strong> only defines the role${qrRoleLabels ? ` (${qrRoleLabels})` : ""} — you still need a <strong>login user</strong>.<br/>
           Go to <strong>Staff</strong> → <strong>+ Add staff</strong> → Role: <strong>Cashier</strong> (or any role with QR portal).
         </div>
         <div class="form-group"><label>Cashier email</label><input id="m-email" placeholder="cashier@company.com" disabled /></div>`;

  openModal(
    "Assign cashier to bus",
    `<p style="font-size:0.85rem;color:var(--muted);margin-bottom:14px">Cashiers are registered under <strong>Staff</strong>, then assigned to a bus here.</p>
     <div class="form-group"><label>Bus</label><select id="m-bus">${busOpts}</select></div>
     ${cashierField}`,
    async () => {
      const emailEl = document.getElementById("m-email");
      if (!emailEl || emailEl.disabled) {
        throw new Error("Add a cashier in Staff menu first.");
      }
      await api("POST", "/admin/assign-cashier", {
        bus_id: document.getElementById("m-bus").value,
        cashier_email: emailEl.value.trim(),
      });
      reload();
    }
  );
  if (!cashiers.length) {
    document.getElementById("modal-save").disabled = true;
  }
}

export async function showStaffModal(reload) {
  const roles = (await api("GET", "/admin/roles")).filter((r) => r.can_use_portal || r.can_use_mobile);
  if (!roles.length) throw new Error("No roles on Staff roles page. Refresh or contact support.");
  const roleOpts = roles.map((r) => `<option value="${r.slug}">${r.label}</option>`).join("");
  openModal(
    "Add staff account (admin only)",
    `<div class="form-group"><label>Role</label>
      <select id="m-role">${roleOpts}</select></div>
     <div class="form-group"><label>Full name</label><input id="m-name" /></div>
     <div class="form-group"><label>Email</label><input id="m-email" type="email" /></div>
     <div class="form-group"><label>Phone</label><input id="m-phone" /></div>
     <div class="form-group"><label>Password</label><input id="m-pass" type="password" /></div>`,
    async () => {
      await api("POST", "/admin/staff", {
        role: document.getElementById("m-role").value,
        name: document.getElementById("m-name").value.trim(),
        email: document.getElementById("m-email").value.trim(),
        phone: document.getElementById("m-phone").value.trim(),
        password: document.getElementById("m-pass").value,
      });
      reload();
    }
  );
}

export function showPaymentProviderModal(existing, reload) {
  const isEdit = !!existing?.id;
  openModal(
    isEdit ? `Edit — ${existing.name}` : "Add top-up app",
    `<div class="form-group"><label>App name</label><input id="m-name" value="${existing?.name || ""}" placeholder="Telebirr" /></div>
     <div class="form-group"><label>Logo image</label><input id="m-logo" type="file" accept="image/png,image/jpeg,image/webp,image/gif" />
     <small style="color:var(--muted)">PNG or JPG, max ~600KB</small></div>
     <div class="form-group"><label>Sort order</label><input id="m-order" type="number" value="${existing?.sort_order ?? 0}" /></div>
     <div class="form-group"><label><input type="checkbox" id="m-active" ${existing?.active !== false ? "checked" : ""}/> Show in passenger app</label></div>`,
    async () => {
      const name = document.getElementById("m-name").value.trim();
      if (!name) throw new Error("Name required");
      const body = {
        name,
        active: document.getElementById("m-active").checked,
        sort_order: parseInt(document.getElementById("m-order").value, 10) || 0,
      };
      const file = document.getElementById("m-logo").files?.[0];
      if (file) body.logo_base64 = await prepareIconUpload(file);
      else if (!isEdit) throw new Error("Upload a logo image");

      if (isEdit) {
        await api("PATCH", `/admin/payment-providers/${existing.id}`, body);
      } else {
        await api("POST", "/admin/payment-providers", body);
      }
      reload();
    }
  );
}

export function showAppServiceModal(existing, reload) {
  const isEdit = !!existing?.id;
  const placement = existing?.placement === "mini_app" ? "mini_app" : "service";
  openModal(
    isEdit ? `Edit — ${existing.name}` : "Add app service",
    `<div class="form-group"><label>Service name</label><input id="m-name" value="${existing?.name || ""}" placeholder="APS / Airport Parking" /></div>
     <div class="form-group"><label>Link URL</label><input id="m-link" value="${existing?.link_url || ""}" placeholder="http://localhost:8082" />
     <small style="color:var(--muted)">Full URL — opens in browser when user taps icon in app</small></div>
     <div class="form-group"><label>Show on home</label>
       <select id="m-placement">
         <option value="service" ${placement === "service" ? "selected" : ""}>Our Services</option>
         <option value="mini_app" ${placement === "mini_app" ? "selected" : ""}>New Mini Apps</option>
       </select>
       <small style="color:var(--muted)">New Mini Apps appear in the section below Our Services</small>
     </div>
     <div class="form-group"><label>Icon image</label><input id="m-icon" type="file" accept="image/png,image/jpeg,image/webp,image/gif" />
     <small style="color:var(--muted)">PNG or JPG, max ~600KB${isEdit ? " — leave empty to keep current" : ""}</small></div>
     <div class="form-group"><label>Sort order</label><input id="m-order" type="number" value="${existing?.sort_order ?? 0}" /></div>
     <div class="form-group"><label><input type="checkbox" id="m-active" ${existing?.active !== false ? "checked" : ""}/> Show on mobile home</label></div>`,
    async () => {
      const name = document.getElementById("m-name").value.trim();
      const link_url = document.getElementById("m-link").value.trim();
      if (!name) throw new Error("Name required");
      if (!link_url) throw new Error("Link URL required");
      const body = {
        name,
        link_url,
        placement: document.getElementById("m-placement").value,
        active: document.getElementById("m-active").checked,
        sort_order: parseInt(document.getElementById("m-order").value, 10) || 0,
      };
      const file = document.getElementById("m-icon").files?.[0];
      if (file) body.icon_base64 = await prepareIconUpload(file);
      else if (!isEdit) throw new Error("Upload an icon image");

      if (isEdit) {
        await api("PATCH", `/admin/app-services/${existing.id}`, body);
      } else {
        await api("POST", "/admin/app-services", body);
      }
      reload();
    }
  );
}

export function showAdminRoleModal(existing, reload) {
  const isEdit = !!existing;
  openModal(
    isEdit ? `Edit role — ${existing.label}` : "Add role",
    `<div class="form-group"><label>Name</label><input id="m-label" value="${existing?.label || ""}" placeholder="Operations Manager"/></div>
     <div class="form-group"><label>Description</label><input id="m-desc" value="${existing?.description || ""}" placeholder="Short description"/></div>
     ${isEdit ? `<div class="form-group"><label><input type="checkbox" id="m-active" ${existing.active !== false ? "checked" : ""}/> Active</label></div>` : ""}
     <p style="font-size:0.85rem;color:var(--muted)">Set View/Add/Update/Delete on the <strong>Permissions</strong> page.</p>`,
    async () => {
      const body = {
        label: document.getElementById("m-label").value.trim(),
        description: document.getElementById("m-desc").value.trim(),
      };
      if (!body.label) throw new Error("Name required");
      if (isEdit) {
        body.active = document.getElementById("m-active").checked;
        await api("PATCH", `/admin/admin-roles/${existing.id}`, body);
      } else {
        body.slug = body.label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        body.permissions = [];
        await api("POST", "/admin/admin-roles", body);
      }
      reload();
    }
  );
}

export async function showAdminUserModal(existing, reload) {
  const roles = await api("GET", "/admin/admin-roles");
  const opts = roles.map((r) => `<option value="${r.id}" ${existing?.admin_role_id === r.id ? "selected" : ""}>${r.label}</option>`).join("");
  const isEdit = !!existing;
  openModal(
    isEdit ? `Edit admin — ${existing.name}` : "Register new admin",
    `<div class="form-group"><label>Full name</label><input id="m-name" value="${existing?.name || ""}"/></div>
     <div class="form-group"><label>Email</label><input id="m-email" type="email" value="${existing?.email || ""}" ${isEdit ? "readonly" : ""}/></div>
     <div class="form-group"><label>Phone</label><input id="m-phone" value="${existing?.phone || ""}"/></div>
     ${isEdit ? "" : '<div class="form-group"><label>Password</label><input id="m-pass" type="password"/></div>'}
     ${isEdit ? '<div class="form-group"><label>New password (optional)</label><input id="m-pass" type="password"/></div>' : ""}
     <div class="form-group"><label>Admin role</label><select id="m-arole"><option value="">— No role —</option>${opts}</select></div>
     ${isEdit ? `<div class="form-group"><label><input type="checkbox" id="m-active" ${existing.active !== false ? "checked" : ""}/> Account active</label></div>` : ""}`,
    async () => {
      const body = {
        name: document.getElementById("m-name").value.trim(),
        phone: document.getElementById("m-phone").value.trim(),
        admin_role_id: document.getElementById("m-arole").value || null,
      };
      const pass = document.getElementById("m-pass")?.value;
      if (pass) body.password = pass;
      if (isEdit) {
        body.active = document.getElementById("m-active").checked;
        await api("PATCH", `/admin/admins/${existing.id}`, body);
      } else {
        body.email = document.getElementById("m-email").value.trim();
        if (!body.email || !pass) throw new Error("Email and password required");
        await api("POST", "/admin/admins", body);
      }
      reload();
    }
  );
}

export function showRoleModal(existing, reload) {
  const isEdit = !!existing?.id;
  const home = existing?.portal_home || "dashboard";
  openModal(
    isEdit ? `Edit role — ${existing.label}` : "Add role",
    `<div class="form-group"><label>Display name</label><input id="m-label" value="${existing?.label || ""}" placeholder="Cashier" /></div>
     <div class="form-group"><label>Slug (code)</label><input id="m-slug" value="${existing?.slug || ""}" placeholder="cashier" /></div>
     <div class="form-group"><label>Description</label><input id="m-desc" value="${existing?.description || ""}" /></div>
     <div class="form-group"><label><input type="checkbox" id="m-portal" ${existing ? (existing.can_use_portal ? "checked" : "") : "checked"} /> Staff portal login</label></div>
     <div class="form-group"><label><input type="checkbox" id="m-mobile" ${existing?.can_use_mobile ? "checked" : ""} /> Mobile app (wallet)</label></div>
     <div class="form-group" id="portal-home-wrap"><label>Portal opens on</label>
       <select id="m-home">
         <option value="qr" ${home === "qr" ? "selected" : ""}>QR collect fare (cashier)</option>
         <option value="dashboard" ${home === "dashboard" ? "selected" : ""}>Dashboard only</option>
       </select></div>`,
    async () => {
      const portal = document.getElementById("m-portal").checked;
      const mobile = document.getElementById("m-mobile").checked;
      if (!portal && !mobile) throw new Error("Enable portal and/or mobile access");
      const body = {
        label: document.getElementById("m-label").value.trim(),
        slug: document.getElementById("m-slug").value.trim(),
        description: document.getElementById("m-desc").value.trim(),
        can_use_portal: portal,
        can_use_mobile: mobile,
        portal_home: portal ? document.getElementById("m-home").value : "none",
      };
      if (!body.label) throw new Error("Display name required");
      if (!body.slug) throw new Error("Slug required");
      if (isEdit) await api("PUT", `/admin/roles/${existing.id}`, body);
      else await api("POST", "/admin/roles", body);
      reload();
    }
  );
  const portalCb = document.getElementById("m-portal");
  const homeWrap = document.getElementById("portal-home-wrap");
  const syncHome = () => {
    homeWrap.style.display = portalCb.checked ? "block" : "none";
  };
  portalCb.onchange = syncHome;
  syncHome();
}

export async function showCustomerDetailModal(customerId) {
  const c = await api("GET", `/admin/customers/${customerId}`);
  const o = c.last_otp;
  const regDate = c.created_at ? new Date(c.created_at).toLocaleString() : "—";
  const otpBlock = o
    ? `<div class="form-group"><label>Last OTP</label>
         <p style="font-size:1.5rem;font-weight:800"><code>${o.code}</code></p>
         <p><small>${o.used ? "Used" : o.expired ? "Expired" : "Active"} · sent ${new Date(o.created_at).toLocaleString()}</small></p></div>`
    : `<p style="color:var(--muted)">No OTP sent yet.</p>`;
  openModal(
    `Customer — ${c.name}`,
    `<div class="form-group"><label>Name</label><p>${c.name}</p></div>
     <div class="form-group"><label>Phone</label><p>${c.phone_display || c.phone}</p></div>
     <div class="form-group"><label>Email</label><p><small>${c.email}</small></p></div>
     <div class="form-group"><label>Wallet</label><p>${formatBirr(c.wallet_balance_birr)}</p></div>
     <div class="form-group"><label>Registered</label><p><small>${regDate}</small></p></div>
     ${otpBlock}`,
    null,
    true
  );
}

export async function showCustomerOtpModal(customerId) {
  const o = await api("GET", `/admin/customers/${customerId}/otp`);
  if (!o.code) {
    openModal("OTP", `<p>${o.detail || "No OTP on file."}</p>`, null, true);
    return;
  }
  const status = o.used ? "Used" : o.expired ? "Expired" : "Valid — customer can enter this code";
  openModal(
    `OTP — ${o.phone_display || o.phone}`,
    `<p style="font-size:0.85rem;color:var(--muted);margin-bottom:12px">Latest OTP sent to this customer (for support / testing).</p>
     <p style="font-size:2rem;font-weight:800;letter-spacing:0.2em;text-align:center;margin:16px 0"><code>${o.code}</code></p>
     <p><strong>Status:</strong> ${status}</p>
     <p><strong>Expires:</strong> ${new Date(o.expires_at).toLocaleString()}</p>
     <p><strong>Sent:</strong> ${new Date(o.created_at).toLocaleString()}</p>`,
    null,
    true
  );
}

