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
  else if (opts.reportsExpanded === false) state.reportsExpanded = false;
  saveLastView(viewId, state.reportsExpanded);
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
  _renderApp?.();
}

export function goToView(viewId) {
  setActiveView(viewId, { reportsExpanded: false });
  _renderApp?.();
}

export function reloadView() {
  _loadView?.();
}
