import { ADMIN_NAV_ALL, CASHIER_NAV, EMPLOYER_NAV } from "../core/config.js";
import { state } from "../core/state.js";

export function expandPermKeys(keys) {
  const out = new Set();
  for (const k of keys) {
    out.add(k);
    if (k.endsWith(".manage")) {
      const base = k.slice(0, -7);
      out.add(`${base}.add`);
      out.add(`${base}.update`);
      out.add(`${base}.delete`);
    }
  }
  return [...out];
}

export function can(...keys) {
  const u = state.user;
  if (!u || u.role !== "admin") return false;
  if (u.is_super_admin) return true;
  const perms = u.permissions || [];
  return expandPermKeys(keys).some((k) => perms.includes(k));
}

export function getAdminNav() {
  return ADMIN_NAV_ALL.filter((item) => {
    if (item.id === "admins" && !state.user?.is_super_admin) return false;
    return can(...item.perm);
  });
}

export function staffNav(user) {
  const home = user.portal_home || "dashboard";
  if (home === "qr") return CASHIER_NAV;
  if (home === "employer") return EMPLOYER_NAV;
  return [{ id: "dashboard", icon: "📊", label: "Dashboard" }];
}

export function defaultStaffView(user) {
  const home = user.portal_home || "dashboard";
  if (home === "qr") return "qr";
  return "dashboard";
}
