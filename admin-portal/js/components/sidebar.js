import { REPORT_NAV_FALLBACK, REPORT_NAV_ORDER } from "../core/config.js";
import { state } from "../core/state.js";
import { can } from "../utils/permissions.js";
import { saveLastView } from "../core/viewState.js";
import { goReport, goToView, isReportView, syncSidebarNav } from "../shell/navigation.js";

export function renderAdminSidebar(navEl, nav) {
  navEl.innerHTML = "";
  const showReports = can("reports.view");
  const reportsAfter = nav.findIndex((n) => n.id === "customers");
  const reportsInsert = reportsAfter >= 0 ? reportsAfter + 1 : nav.length;

  const nodes = nav.map((item) => createNavButton(item));
  if (showReports) nodes.splice(reportsInsert, 0, createReportsNavBlock());
  nodes.forEach((n) => navEl.appendChild(n));
  syncSidebarNav();
}

export function refreshReportsNavBlock() {
  const navEl = document.getElementById("sidebar-nav");
  const old = navEl?.querySelector(".nav-reports-block");
  if (!navEl || !old) return;
  old.replaceWith(createReportsNavBlock());
  syncSidebarNav();
}

function createReportsNavBlock() {
  const block = document.createElement("div");
  block.className = "nav-reports-block";

  const parent = document.createElement("button");
  parent.type = "button";
  parent.className = "nav-item nav-reports-parent";
  parent.innerHTML = `<span class="nav-icon">📋</span><span>Reports</span><span class="nav-chevron">▸</span>`;
  parent.onclick = () => {
    const nowExpanded = state.reportsExpanded !== true;
    state.reportsExpanded = nowExpanded;
    saveLastView(state.view, nowExpanded);
    syncSidebarNav();
    if (nowExpanded && !isReportView()) goReport("daily_revenue");
  };
  block.appendChild(parent);

  const sub = document.createElement("div");
  sub.className = "nav-reports-sub";
  const groups = buildReportNavGroups(state.reportMenu || REPORT_NAV_FALLBACK);
  for (const { group, items } of groups) {
    const gl = document.createElement("div");
    gl.className = "nav-report-group";
    gl.textContent = group;
    sub.appendChild(gl);
    for (const it of items) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.reportId = it.id;
      btn.className = "nav-item nav-report-item";
      btn.textContent = it.label;
      btn.onclick = (e) => {
        e.stopPropagation();
        goReport(it.id);
        btn.blur();
      };
      sub.appendChild(btn);
    }
  }
  block.appendChild(sub);
  return block;
}

function createNavButton(item) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.dataset.view = item.id;
  btn.className = "nav-item";
  btn.innerHTML = `<span class="nav-icon">${item.icon}</span><span>${item.label}</span>`;
  btn.onclick = () => goToView(item.id);
  return btn;
}

function buildReportNavGroups(menu) {
  const byGroup = {};
  for (const item of menu) {
    const g = item.group || "Rev";
    if (!byGroup[g]) byGroup[g] = [];
    byGroup[g].push(item);
  }
  return REPORT_NAV_ORDER.filter((g) => byGroup[g]?.length).map((g) => ({ group: g, items: byGroup[g] }));
}
