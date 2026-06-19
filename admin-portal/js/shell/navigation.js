import { state } from "../core/state.js";
import { saveLastView } from "../core/viewState.js";

let _renderApp = null;
let _loadView = null;
let _renderAuth = null;

export function initNavigation({ renderApp, loadView, renderAuth }) {
  _renderApp = renderApp;
  _loadView = loadView;
  _renderAuth = renderAuth;
}

export function setActiveView(viewId, opts = {}) {
  state.view = viewId;
  if (opts.reportsExpanded !== undefined) state.reportsExpanded = opts.reportsExpanded;
  else if (viewId.startsWith("report:")) state.reportsExpanded = true;
  saveLastView(viewId, state.reportsExpanded);
}

export function syncSidebarNav() {
  const navEl = document.getElementById("sidebar-nav");
  if (!navEl) return;

  navEl.querySelectorAll(".nav-item.active, .nav-report-item.active").forEach((el) => {
    el.classList.remove("active");
  });

  const block = navEl.querySelector(".nav-reports-block");
  if (block) {
    const expanded = state.reportsExpanded === true;
    block.classList.toggle("expanded", expanded);
    const parent = block.querySelector(".nav-reports-parent");
    if (parent) {
      parent.setAttribute("aria-expanded", expanded ? "true" : "false");
      const chev = parent.querySelector(".nav-chevron");
      if (chev) chev.textContent = expanded ? "▾" : "▸";
    }
  }

  if (isReportView()) {
    navEl.querySelector(".nav-reports-parent")?.classList.add("active");
    const rid = reportIdFromView();
    if (rid) navEl.querySelector(`.nav-report-item[data-report-id="${rid}"]`)?.classList.add("active");
  } else if (state.view) {
    navEl.querySelector(`.nav-item[data-view="${state.view}"]`)?.classList.add("active");
  }
}

function scrollContentToTop() {
  document.getElementById("page-content")?.scrollTo(0, 0);
}

export function refreshApp() {
  _renderApp?.();
}

export function showAuth() {
  _renderAuth?.();
}

export function isReportView(view) {
  return String(view || state.view || "").startsWith("report:");
}

export function reportIdFromView(view) {
  const v = view || state.view;
  return isReportView(v) ? v.slice(7) : null;
}

export function goReport(reportId) {
  setActiveView(`report:${reportId}`, { reportsExpanded: true });
  syncSidebarNav();
  scrollContentToTop();
  _loadView?.();
}

export function goToView(viewId) {
  setActiveView(viewId, { reportsExpanded: false });
  syncSidebarNav();
  scrollContentToTop();
  _loadView?.();
}

export function reloadView() {
  _loadView?.();
}
