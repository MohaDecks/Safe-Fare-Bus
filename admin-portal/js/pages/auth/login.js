import { state, $app } from "../../core/state.js";
import { api } from "../../core/api.js";
import { setToken } from "../../core/auth.js";
import { defaultStaffView } from "../../utils/permissions.js";
import { showAlert } from "../../utils/alerts.js";
import { refreshApp } from "../../shell/navigation.js";

export function renderAuth() {
  state.user = null;
  $app.innerHTML = `
    <div class="auth-page">
      <div class="auth-brand">
        <h1>SafeFare</h1>
        <p>Professional bus fare &amp; ticketing platform. Staff sign in here; only your <strong>admin</strong> can add new users.</p>
        <div class="auth-features">
          <div class="auth-feature"><div class="auth-feature-icon">📊</div><div><strong>Admin</strong><br/>Adds cashiers &amp; employers after login</div></div>
          <div class="auth-feature"><div class="auth-feature-icon">🎫</div><div><strong>Passengers</strong><br/>Mobile app only</div></div>
        </div>
      </div>
      <div class="auth-panel">
        <div class="auth-card">
          <h2 style="font-size:1.35rem;font-weight:800;margin-bottom:6px">Staff sign in</h2>
          <p style="color:var(--muted);font-size:0.9rem;margin-bottom:24px">Admin, cashier, or employer — account from your company admin.</p>
          <div id="auth-alert"></div>
          <form id="login-form">
            <div class="form-group"><label>Email</label><input type="email" id="email" required placeholder="you@company.com" /></div>
            <div class="form-group"><label>Password</label><input type="password" id="password" required /></div>
            <button type="submit" class="btn btn-primary">Sign in</button>
          </form>
          <p style="margin-top:20px;font-size:0.8rem;color:var(--muted);text-align:center;line-height:1.5">
            <strong>New staff?</strong> Ask your bus company admin to register you.
          </p>
        </div>
      </div>
    </div>`;

  document.getElementById("login-form").onsubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api("POST", "/auth/login", {
        email: document.getElementById("email").value.trim(),
        password: document.getElementById("password").value,
      });
      if (res.user.role !== "admin" && !res.user.portal_home) {
        throw new Error("This role cannot use the staff portal.");
      }
      setToken(res.access_token);
      state.user = res.user;
      state.view = res.user.role === "admin" ? "dashboard" : defaultStaffView(res.user);
      refreshApp();
    } catch (err) {
      showAlert("auth-alert", err.message, true);
    }
  };
}
