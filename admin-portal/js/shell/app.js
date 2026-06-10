import { state, $app } from "../core/state.js";
import { api, isAuthError } from "../core/api.js";
import { clearToken } from "../core/auth.js";
import { clearLastView } from "../core/viewState.js";
import { roleLabel } from "../utils/format.js";
import { can, getAdminNav, staffNav } from "../utils/permissions.js";
import { isReportView, reloadView, showAuth, setActiveView } from "./navigation.js";
import { renderAdminSidebar } from "../components/sidebar.js";
import { renderAdminView } from "../pages/admin/index.js";
import { renderCashierView } from "../pages/cashier/index.js";
import { sidebarBrandHtml, hideBootSplash } from "../core/brand.js";
import { DEFAULT_BRAND_NAME } from "../core/config.js";

export function renderApp() {
  hideBootSplash();
  const user = state.user;
  const nav = user.role === "admin" ? getAdminNav() : staffNav(user);
  const brandHtml = state.companyBrand
    ? sidebarBrandHtml(state.companyBrand)
    : sidebarBrandHtml({ name: DEFAULT_BRAND_NAME, logo_url: "" });

  $app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="sidebar-brand" id="sidebar-brand">${brandHtml}</div>
        <div class="sidebar-user">
          <strong>${user.name}</strong>
          <small>${user.role === "admin" ? user.admin_role_label || roleLabel(user.role) : roleLabel(user.role)}</small>
          ${user.is_super_admin ? '<span class="badge badge-blue" style="margin-top:6px;display:inline-block">Super Admin</span>' : ""}
        </div>
        <nav class="sidebar-nav" id="sidebar-nav"></nav>
        <div class="sidebar-footer">
          <button class="nav-item" id="logout-btn"><span class="nav-icon">⎋</span><span>Logout</span></button>
        </div>
      </aside>
      <div class="main">
        <header class="main-header" id="page-header"></header>
        <div class="main-content" id="page-content"><div class="page-loading"><div class="sf-loading-spinner"><span></span><span></span><span></span></div></div></div>
      </div>
    </div>`;

  const navEl = document.getElementById("sidebar-nav");
  if (user.role === "admin") {
    renderAdminSidebar(navEl, nav, renderApp);
    if (can("reports.view") && !state.reportMenu) {
      api("GET", "/admin/reports/menu", null, { silent: true })
        .then((menu) => {
          state.reportMenu = menu;
          if (isReportView()) renderApp();
        })
        .catch(() => {});
    }
  } else {
    nav.forEach((item) => {
      const btn = document.createElement("button");
      btn.className = `nav-item ${state.view === item.id ? "active" : ""}`;
      btn.innerHTML = `<span class="nav-icon">${item.icon}</span><span>${item.label}</span>`;
      btn.onclick = () => {
        setActiveView(item.id);
        renderApp();
      };
      navEl.appendChild(btn);
    });
  }

  document.getElementById("logout-btn").onclick = () => {
    clearLastView();
    clearToken();
    state.companyBrand = null;
    showAuth();
  };

  if (!state.companyBrand) {
    api("GET", "/admin/company", null, { silent: true })
      .then((company) => {
        state.companyBrand = company;
        const brandEl = document.getElementById("sidebar-brand");
        if (brandEl) brandEl.innerHTML = sidebarBrandHtml(company);
      })
      .catch(() => {});
  }

  loadView();
}

export async function loadView() {
  const user = state.user;
  const content = document.getElementById("page-content");
  const header = document.getElementById("page-header");

  try {
    if (user.role === "admin") await renderAdminView(header, content);
    else if ((user.portal_home || "") === "qr") await renderCashierView(header, content);
    else if ((user.portal_home || "") === "employer") {
      header.innerHTML = `<div><h1>Employer moved to app</h1><p>Use SafeFare mobile → Corporate</p></div>`;
      content.innerHTML = `<div class="card"><div class="card-body"><p>Company allowance is in the <strong>mobile app → Corporate</strong>. Admin registers companies under <strong>Corporate companies</strong> and gives them login credentials.</p></div></div>`;
    } else {
      header.innerHTML = `<div><h1>Dashboard</h1></div>`;
      content.innerHTML = `<div class="card"><div class="card-body"><p>Welcome, ${user.name}</p></div></div>`;
    }
  } catch (err) {
    if (isAuthError(err)) {
      clearToken();
      showAuth();
      return;
    }
    content.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

export { reloadView };
