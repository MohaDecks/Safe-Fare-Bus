import { REPORT_NAV_FALLBACK, REPORT_NAV_ORDER } from "../core/config.js";
import { state } from "../core/state.js";
import { can } from "../utils/permissions.js";
import { goReport, isReportView, reportIdFromView } from "../shell/navigation.js";

export function renderAdminSidebar(navEl, nav, renderApp) {
  navEl.innerHTML = "";
  const showReports = can("reports.view");
  const reportsAfter = nav.findIndex((n) => n.id === "customers");
  const reportsInsert = reportsAfter >= 0 ? reportsAfter + 1 : nav.length;

  const nodes = nav.map((item) => createNavButton(item, renderApp));
  if (showReports) nodes.splice(reportsInsert, 0, buildReportsNavBlock(renderApp));
  nodes.forEach((n) => navEl.appendChild(n));

  function buildReportsNavBlock(renderAppFn) {
    const expanded = state.reportsExpanded === true;
    const block = document.createElement("div");
    block.className = `nav-reports-block${expanded ? " expanded" : ""}`;

    const parent = document.createElement("button");
    parent.type = "button";
    parent.className = `nav-item nav-reports-parent${isReportView() ? " active" : ""}`;
    parent.setAttribute("aria-expanded", expanded ? "true" : "false");
    parent.innerHTML = `<span class="nav-icon">📋</span><span>Reports</span><span class="nav-chevron">${expanded ? "▾" : "▸"}</span>`;
    parent.onclick = () => {
      if (expanded) {
        state.reportsExpanded = false;
        renderAppFn();
        return;
      }
      state.reportsExpanded = true;
      if (!isReportView()) goReport("daily_revenue");
      else renderAppFn();
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
        const rid = reportIdFromView();
        btn.className = `nav-item nav-report-item${rid === it.id ? " active" : ""}`;
        btn.textContent = it.label;
        btn.onclick = (e) => {
          e.stopPropagation();
          goReport(it.id);
        };
        sub.appendChild(btn);
      }
    }
    block.appendChild(sub);
    return block;
  }

  function createNavButton(item, renderAppFn) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `nav-item${state.view === item.id ? " active" : ""}`;
    btn.innerHTML = `<span class="nav-icon">${item.icon}</span><span>${item.label}</span>`;
    btn.onclick = () => {
      state.view = item.id;
      state.reportsExpanded = false;
      renderAppFn();
    };
    return btn;
  }
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
