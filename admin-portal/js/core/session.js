import { state } from "./state.js";
import { api, isAuthError } from "./api.js";
import { getToken, setToken, isRemembered } from "./auth.js";
import { resolveViewForUser } from "./viewState.js";

export function applySessionUser(user) {
  state.user = user;
  state.view = resolveViewForUser(user);
}

async function extendSession() {
  try {
    const res = await api("POST", "/auth/refresh", { remember: isRemembered() }, { silent: true });
    if (res?.access_token) setToken(res.access_token, isRemembered());
  } catch (_) {}
}

export async function restoreSession() {
  if (!getToken()) return { ok: false, authFailed: false };

  try {
    const user = await api("GET", "/auth/me", null, { silent: true });
    if (user.role !== "admin" && !user.portal_home) {
      setToken(null);
      return { ok: false, authFailed: true };
    }
    extendSession();
    return { ok: true, user };
  } catch (err) {
    if (isAuthError(err)) {
      setToken(null);
      return { ok: false, authFailed: true };
    }
    return { ok: false, authFailed: false, error: err.message || "Could not reach server" };
  }
}
