import { REPORT_NAV_FALLBACK } from "../../core/config.js";
import { state } from "../../core/state.js";
import { can } from "../../utils/permissions.js";
import { isReportView, reportIdFromView } from "../../shell/navigation.js";
import { renderDashboard } from "./dashboard.js";
import { renderBuses } from "./buses.js";
import { renderQrcodes } from "./qrcodes.js";
import { renderStaff } from "./staff.js";
import { renderStaffroles } from "./staffroles.js";
import { renderCustomers } from "./customers.js";
import { renderCorporate } from "./corporate.js";
import { renderTrips } from "./trips.js";
import { renderPayments } from "./payments.js";
import { renderTopup } from "./topup.js";
import { renderAppServices } from "./appservices.js";
import { renderAdmins } from "./admins.js";
import { renderAdminroles } from "./adminroles.js";
import { renderPermissions } from "./permissions.js";
import { renderReports } from "./reports.js";

const TITLES = {
  dashboard: ["Dashboard", "Overview of your bus company"],
  buses: ["Buses & Routes", "Manage fleet, routes and fares (ETB)"],
  qrcodes: ["QR Codes", "Generate fare QR for each bus — cashier only displays"],
  staff: ["Staff", "Register cashiers & employers — then assign to buses"],
  staffroles: ["Staff roles", "Cashier / employer role types"],
  customers: ["Customers", "App registrations — phone + OTP"],
  corporate: ["Corporate companies", "Register companies — they login in app with email & password you set"],
  trips: ["Trip history", "All passenger bus trips (fare payments)"],
  payments: ["Cashier collections", "Money collected by each cashier (QR fares)"],
  topup: ["Top-up payment apps", "Ethiopian mobile money — logos shown in passenger app"],
  appservices: ["App services", "Linked apps (APS, parking…) — icons on mobile login screen"],
  admins: ["Admin users", "Only you (Super Admin) can register other admins"],
  adminroles: ["Roles", "Portal admin roles — name & description"],
  permissions: ["Permissions", "Toggle View / Add / Update / Delete per menu"],
};

const VIEW_PERM = {
  dashboard: ["dashboard.view"],
  buses: ["buses.view"],
  qrcodes: ["qrcodes.view"],
  staff: ["staff.view"],
  staffroles: ["staffroles.view"],
  customers: ["customers.view"],
  corporate: ["corporate.view"],
  trips: ["trips.view"],
  payments: ["payments.view"],
  topup: ["topup.view"],
  appservices: ["appservices.view"],
  adminroles: ["roles.view"],
  permissions: ["permissions.view"],
};

const RENDERERS = {
  dashboard: renderDashboard,
  buses: renderBuses,
  qrcodes: renderQrcodes,
  staff: renderStaff,
  staffroles: renderStaffroles,
  customers: renderCustomers,
  corporate: renderCorporate,
  trips: renderTrips,
  payments: renderPayments,
  topup: renderTopup,
  appservices: renderAppServices,
  admins: renderAdmins,
  adminroles: renderAdminroles,
  permissions: renderPermissions,
};

export async function renderAdminView(header, content) {
  if (state.view === "admins" && !state.user.is_super_admin) {
    header.innerHTML = `<div><h1>Access denied</h1></div>`;
    content.innerHTML = `<div class="alert alert-error">Only Super Admin can manage admin accounts.</div>`;
    return;
  }

  let need = VIEW_PERM[state.view];
  if (isReportView()) need = ["reports.view"];
  if (need && !can(...need)) {
    header.innerHTML = `<div><h1>Access denied</h1></div>`;
    content.innerHTML = `<div class="alert alert-error">You do not have permission for this page.</div>`;
    return;
  }

  let t;
  let sub;
  if (isReportView()) {
    const rid = reportIdFromView();
    const label =
      (state.reportMenu || REPORT_NAV_FALLBACK).find((m) => m.id === rid)?.label || rid || "Report";
    t = label;
    sub = "Reports";
  } else {
    [t, sub] = TITLES[state.view] || TITLES.dashboard;
  }
  header.innerHTML = `<div><h1>${t}</h1><p>${sub}</p></div>`;

  if (isReportView()) {
    await renderReports(content);
    return;
  }

  const render = RENDERERS[state.view];
  if (render) await render(content);
}
