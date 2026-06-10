import { state, $app } from "../../core/state.js";
import { API } from "../../core/config.js";
import { api } from "../../core/api.js";
import { setToken, isRemembered } from "../../core/auth.js";
import { defaultStaffView } from "../../utils/permissions.js";
import { showAlert } from "../../utils/alerts.js";
import { refreshApp } from "../../shell/navigation.js";
import { restoreSession, applySessionUser } from "../../core/session.js";
import { saveLastView } from "../../core/viewState.js";
import { authBrandHtml, hideBootSplash } from "../../core/brand.js";

export function renderAuth(opts = {}) {
  const { retry = false, message = "" } = opts;
  state.user = null;
  hideBootSplash();
  $app.innerHTML = `
    <div class="auth-page">
      <div class="auth-brand" id="auth-brand">${authBrandHtml(null)}</div>
      <div class="auth-panel">
        <div class="auth-card">
          <h2 class="auth-card-title">Staff sign in</h2>
          <p class="auth-card-subtitle">Sign in with the email and password your company admin gave you.</p>
          <div id="auth-alert"></div>
          ${
            retry
              ? `<div class="alert alert-error auth-retry-banner">
                  Session saved — ${message || "server unreachable"}. <button type="button" class="auth-retry-link" id="auth-retry">Try again</button>
                </div>`
              : ""
          }
          <form id="login-form">
            <div class="form-group"><label>Email</label><input type="email" id="email" required placeholder="you@company.com" /></div>
            <div class="form-group"><label>Password</label><input type="password" id="password" required /></div>
            <label class="auth-remember">
              <input type="checkbox" id="remember-me" ${isRemembered() || retry ? "checked" : ""} />
              <span>Keep me signed in on this device</span>
            </label>
            <button type="submit" class="btn btn-primary">Sign in</button>
          </form>
          <p class="auth-card-footer">
            <strong>New staff?</strong> Ask your bus company admin to register you.
          </p>
        </div>
      </div>
    </div>`;

  fetch(`${API}/branding`)
    .then((r) => (r.ok ? r.json() : null))
    .then((branding) => {
      const el = document.getElementById("auth-brand");
      if (el && branding) el.innerHTML = authBrandHtml(branding);
    })
    .catch(() => {});

  document.getElementById("auth-retry")?.addEventListener("click", async () => {
    const btn = document.getElementById("auth-retry");
    if (btn) btn.disabled = true;
    const result = await restoreSession();
    if (result.ok) {
      applySessionUser(result.user);
      refreshApp();
      return;
    }
    if (btn) btn.disabled = false;
    showAlert("auth-alert", result.authFailed ? "Session expired — sign in again." : result.error || "Still unreachable", true);
  });

  document.getElementById("login-form").onsubmit = async (e) => {
    e.preventDefault();
    const remember = document.getElementById("remember-me")?.checked !== false;
    try {
      const res = await api("POST", "/auth/login", {
        email: document.getElementById("email").value.trim(),
        password: document.getElementById("password").value,
        remember,
      });
      if (res.user.role !== "admin" && !res.user.portal_home) {
        throw new Error("This role cannot use the staff portal.");
      }
      setToken(res.access_token, remember);
      state.user = res.user;
      state.view = res.user.role === "admin" ? "dashboard" : defaultStaffView(res.user);
      saveLastView(state.view, false);
      refreshApp();
    } catch (err) {
      showAlert("auth-alert", err.message, true);
    }
  };
}
