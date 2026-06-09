import { state } from "../core/state.js";

let _renderApp = null;
let _loadView = null;
let _renderAuth = null;

export function initNavigation({ renderApp, loadView, renderAuth }) {
  _renderApp = renderApp;
  _loadView = loadView;
  _renderAuth = renderAuth;
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
  state.view = `report:${reportId}`;
  state.reportsExpanded = true;
  _renderApp?.();
}

export function goToView(viewId) {
  state.view = viewId;
  state.reportsExpanded = false;
  _renderApp?.();
}

export function reloadView() {
  _loadView?.();
}
