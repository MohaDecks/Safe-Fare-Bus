import { ADMIN_NAV_ALL } from "./core/config.js";
import { state } from "./core/state.js";
import { api } from "./core/api.js";
import { getToken, setToken } from "./core/auth.js";
import { defaultStaffView } from "./utils/permissions.js";
import { initNavigation } from "./shell/navigation.js";
import { renderAuth } from "./pages/auth/login.js";
import { renderApp, loadView } from "./shell/app.js";

initNavigation({ renderApp, loadView, renderAuth });

async function boot() {
  const token = getToken();
  if (!token) {
    renderAuth();
    return;
  }
  try {
    const user = await api("GET", "/auth/me");
    if (user.role !== "admin" && !user.portal_home) {
      setToken(null);
      renderAuth();
      return;
    }
    state.user = user;
    if (user.role === "admin") {
      const nav = ADMIN_NAV_ALL.filter((item) => {
        if (user.is_super_admin) return true;
        const perms = user.permissions || [];
        return item.perm.some((k) => perms.includes(k));
      });
      state.view = nav.find((n) => n.id === "dashboard") ? "dashboard" : nav[0]?.id || "dashboard";
    } else state.view = defaultStaffView(user);
    renderApp();
  } catch (_) {
    setToken(null);
    renderAuth();
  }
}

boot();
