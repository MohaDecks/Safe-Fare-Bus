import { ADMIN_NAV_ALL, CASHIER_NAV, CORPORATE_NAV } from "./config.js";
import { state } from "./state.js";
import { defaultStaffView, expandPermKeys } from "../utils/permissions.js";

const VIEW_KEY = "sf_last_view";
const REPORTS_EXPANDED_KEY = "sf_reports_expanded";

function adminCan(user, ...keys) {
  if (user.is_super_admin) return true;
  const perms = user.permissions || [];
  return expandPermKeys(keys).some((k) => perms.includes(k));
}

function isViewAllowed(user, view) {
  if (!view || typeof view !== "string") return false;

  if (user.role === "admin") {
    if (view === "admins" && !user.is_super_admin) return false;
    if (view.startsWith("report:")) return adminCan(user, "reports.view");
    return ADMIN_NAV_ALL.some((item) => {
      if (item.id !== view) return false;
      if (item.id === "admins" && !user.is_super_admin) return false;
      return adminCan(user, ...item.perm);
    });
  }

  const home = user.portal_home || "dashboard";
  if (home === "qr") return CASHIER_NAV.some((n) => n.id === view);
  if (home === "corporate") return CORPORATE_NAV.some((n) => n.id === view);
  return view === "dashboard";
}

function defaultView(user) {
  if (user.role === "admin") {
    const nav = ADMIN_NAV_ALL.filter((item) => {
      if (item.id === "admins" && !user.is_super_admin) return false;
      return adminCan(user, ...item.perm);
    });
    return nav.find((n) => n.id === "dashboard") ? "dashboard" : nav[0]?.id || "dashboard";
  }
  return defaultStaffView(user);
}

export function resolveViewForUser(user) {
  const saved = localStorage.getItem(VIEW_KEY);
  if (saved && isViewAllowed(user, saved)) {
    if (saved.startsWith("report:")) {
      state.reportsExpanded = localStorage.getItem(REPORTS_EXPANDED_KEY) === "1";
    }
    return saved;
  }
  return defaultView(user);
}

export function saveLastView(view, reportsExpanded) {
  if (!view) return;
  localStorage.setItem(VIEW_KEY, view);
  if (reportsExpanded !== undefined) {
    localStorage.setItem(REPORTS_EXPANDED_KEY, reportsExpanded ? "1" : "0");
  } else if (view.startsWith("report:")) {
    localStorage.setItem(REPORTS_EXPANDED_KEY, "1");
  }
}

export function clearLastView() {
  localStorage.removeItem(VIEW_KEY);
  localStorage.removeItem(REPORTS_EXPANDED_KEY);
}
