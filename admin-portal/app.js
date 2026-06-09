const API = `${window.location.origin}/api`;
const TOKEN_KEY = "sf_token";
function staffNav(user) {
  const home = user.portal_home || "dashboard";
  if (home === "qr") return CASHIER_NAV;
  if (home === "employer") return EMPLOYER_NAV;
  return [{ id: "dashboard", icon: "📊", label: "Dashboard" }];
}

function defaultStaffView(user) {
  const home = user.portal_home || "dashboard";
  if (home === "qr") return "qr";
  return "dashboard";
}

const $app = document.getElementById("app");
let state = { user: null, view: "dashboard" };

const formatBirr = (n) =>
  `ETB ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const chartInstances = {};

function destroyDashboardCharts() {
  Object.keys(chartInstances).forEach((id) => {
    chartInstances[id]?.destroy();
    delete chartInstances[id];
  });
}

function renderDashboardChart(canvasId, type, labels, data, opts) {
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
    delete chartInstances[canvasId];
  }
  const el = document.getElementById(canvasId);
  if (!el || typeof Chart === "undefined") return;
  chartInstances[canvasId] = new Chart(el, {
    type,
    data: {
      labels,
      datasets: [
        {
          label: opts.label,
          data,
          borderColor: opts.color,
          backgroundColor: opts.bg,
          fill: type === "line",
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderRadius: type === "bar" ? 6 : 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: "#0f172a", padding: 10, cornerRadius: 8 },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: "#f1f5f9" },
          ticks: { color: "#64748b", font: { size: 11 } },
        },
        x: {
          grid: { display: false },
          ticks: { color: "#64748b", font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 },
        },
      },
    },
  });
}

function paintDashboardCharts(charts) {
  if (!charts?.labels) return;
  destroyDashboardCharts();
  renderDashboardChart("chart-revenue", "line", charts.labels, charts.revenue, {
    label: "Revenue (ETB)",
    color: "#2563eb",
    bg: "rgba(37, 99, 235, 0.12)",
  });
  renderDashboardChart("chart-customers", "bar", charts.labels, charts.customer_registrations, {
    label: "New customers",
    color: "#7c3aed",
    bg: "rgba(124, 58, 237, 0.35)",
  });
  renderDashboardChart("chart-payments", "bar", charts.labels, charts.payments_count, {
    label: "Fare payments",
    color: "#059669",
    bg: "rgba(5, 150, 105, 0.35)",
  });
}

const getToken = () => localStorage.getItem(TOKEN_KEY);
const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

const roleLabel = (r) =>
  ({ admin: "Bus Company Admin", cashier: "Cashier", employer: "Employer (Employee)" }[r] || r);

function expandPermKeys(keys) {
  const out = new Set();
  for (const k of keys) {
    out.add(k);
    if (k.endsWith(".manage")) {
      const base = k.slice(0, -7);
      out.add(`${base}.add`);
      out.add(`${base}.update`);
      out.add(`${base}.delete`);
    }
  }
  return [...out];
}

function can(...keys) {
  const u = state.user;
  if (!u || u.role !== "admin") return false;
  if (u.is_super_admin) return true;
  const perms = u.permissions || [];
  return expandPermKeys(keys).some((k) => perms.includes(k));
}

const ADMIN_NAV_ALL = [
  { id: "dashboard", icon: "📊", label: "Dashboard", perm: ["dashboard.view"] },
  { id: "buses", icon: "🚌", label: "Buses & Routes", perm: ["buses.view"] },
  { id: "qrcodes", icon: "▣", label: "QR Codes", perm: ["qrcodes.view"] },
  { id: "staff", icon: "👥", label: "Staff", perm: ["staff.view"] },
  { id: "staffroles", icon: "🏷️", label: "Staff roles", perm: ["staffroles.view"] },
  { id: "customers", icon: "📱", label: "Customers", perm: ["customers.view"] },
  { id: "corporate", icon: "🏢", label: "Corporate companies", perm: ["corporate.view"] },
  { id: "trips", icon: "🎫", label: "Trip history", perm: ["trips.view"] },
  { id: "payments", icon: "💳", label: "Cashier money", perm: ["payments.view"] },
  { id: "topup", icon: "📲", label: "Top-up apps", perm: ["topup.view"] },
  { id: "admins", icon: "👤", label: "Admin users", perm: ["admins.view"] },
  { id: "adminroles", icon: "🛡️", label: "Roles", perm: ["roles.view"] },
  { id: "permissions", icon: "🔐", label: "Permissions", perm: ["permissions.view"] },
];

function getAdminNav() {
  return ADMIN_NAV_ALL.filter((item) => {
    if (item.id === "admins" && !state.user?.is_super_admin) return false;
    return can(...item.perm);
  });
}

const REPORT_NAV_ORDER = ["Rev", "Today", "Fleet", "Staff", "Cus"];

function isReportView(view) {
  return String(view || state.view || "").startsWith("report:");
}

function reportIdFromView(view) {
  const v = view || state.view;
  return isReportView(v) ? v.slice(7) : null;
}

function goReport(reportId) {
  state.view = `report:${reportId}`;
  state.reportsExpanded = true;
  renderApp();
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

function renderAdminSidebar(navEl, nav) {
  navEl.innerHTML = "";
  const showReports = can("reports.view");
  const reportsAfter = nav.findIndex((n) => n.id === "customers");
  const reportsInsert = reportsAfter >= 0 ? reportsAfter + 1 : nav.length;

  const nodes = nav.map((item) => createNavButton(item));
  if (showReports) nodes.splice(reportsInsert, 0, buildReportsNavBlock());
  nodes.forEach((n) => navEl.appendChild(n));

  function buildReportsNavBlock() {
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
        renderApp();
        return;
      }
      state.reportsExpanded = true;
      if (!isReportView()) goReport("daily_revenue");
      else renderApp();
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

  function createNavButton(item) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `nav-item${state.view === item.id ? " active" : ""}`;
    btn.innerHTML = `<span class="nav-icon">${item.icon}</span><span>${item.label}</span>`;
    btn.onclick = () => {
      state.view = item.id;
      state.reportsExpanded = false;
      renderApp();
    };
    return btn;
  }
}

const REPORT_NAV_FALLBACK = [
  { id: "daily_revenue", label: "Daily — trip money collected", group: "Rev" },
  { id: "weekly_revenue", label: "Weekly — revenue", group: "Rev" },
  { id: "monthly_revenue", label: "Monthly — revenue", group: "Rev" },
  { id: "daily_trips_detail", label: "Daily trips — detail list", group: "Rev" },
  { id: "today_trips", label: "Today — who paid fare (trips)", group: "Today" },
  { id: "today_registrations", label: "Today — app sign-ups", group: "Today" },
  { id: "buses", label: "Buses — count & where they go", group: "Fleet" },
  { id: "bus_activity", label: "Each bus — trips & money", group: "Fleet" },
  { id: "staff_summary", label: "Staff — how many", group: "Staff" },
  { id: "customers", label: "Customer registrations", group: "Cus" },
  { id: "topups", label: "Wallet top-ups", group: "Cus" },
  { id: "fare_search", label: "Search trips by phone", group: "Cus" },
];

async function api(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  if (getToken()) headers.Authorization = `Bearer ${getToken()}`;
  const opts = { method, headers, body: body ? JSON.stringify(body) : null };
  const res = await fetch(`${API}${path}`, opts);
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (_) {}
  }
  if (!res.ok) throw new Error(data?.detail || "Request failed");
  return data;
}

/* ───────── AUTH ───────── */

function renderAuth() {
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
      renderApp();
    } catch (err) {
      showAlert("auth-alert", err.message, true);
    }
  };
}

function showAlert(id, msg, isError) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = `<div class="alert ${isError ? "alert-error" : "alert-success"}">${msg}</div>`;
}

/* ───────── SHELL ───────── */

const CASHIER_NAV = [
  { id: "qr", icon: "📱", label: "QR Collect fare" },
  { id: "dashboard", icon: "📊", label: "Dashboard" },
];

const EMPLOYER_NAV = [
  { id: "dashboard", icon: "📊", label: "Dashboard" },
  { id: "staff", icon: "👥", label: "Staff" },
  { id: "allocate", icon: "💰", label: "Allowances" },
];

function renderApp() {
  const user = state.user;
  const nav = user.role === "admin" ? getAdminNav() : staffNav(user);

  $app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="sidebar-brand"><h2>SafeFare</h2><span>Staff portal</span></div>
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
        <div class="main-content" id="page-content"><p>Loading…</p></div>
      </div>
    </div>`;

  const navEl = document.getElementById("sidebar-nav");
  if (user.role === "admin") {
    renderAdminSidebar(navEl, nav);
    if (can("reports.view") && !state.reportMenu) {
      api("GET", "/admin/reports/menu")
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
        state.view = item.id;
        renderApp();
      };
      navEl.appendChild(btn);
    });
  }

  document.getElementById("logout-btn").onclick = () => {
    setToken(null);
    renderAuth();
  };

  loadView();
}

async function loadView() {
  const user = state.user;
  const content = document.getElementById("page-content");
  const header = document.getElementById("page-header");

  try {
    if (user.role === "admin") await renderAdminView(header, content);
    else if ((user.portal_home || "") === "qr") await renderCashierView(header, content);
    else if ((user.portal_home || "") === "employer") {
      header.innerHTML = `<div><h1>Employer moved to app</h1><p>Use SafeFare mobile → Corporate</p></div>`;
      content.innerHTML = `<div class="card"><div class="card-body"><p>Company allowance is in the <strong>mobile app → Corporate</strong>. Admin registers companies under <strong>Corporate companies</strong> and gives them login credentials.</p></div></div>`;
    }
    else {
      header.innerHTML = `<div><h1>Dashboard</h1></div>`;
      content.innerHTML = `<div class="card"><div class="card-body"><p>Welcome, ${user.name}</p></div></div>`;
    }
  } catch (err) {
    if (String(err.message).includes("401") || String(err.message).toLowerCase().includes("token")) {
      setToken(null);
      renderAuth();
      return;
    }
    content.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

/* ───────── ADMIN VIEWS ───────── */

async function renderAdminView(header, content) {
  const titles = {
    dashboard: ["Dashboard", "Overview of your bus company"],
    buses: ["Buses & Routes", "Manage fleet, routes and fares (ETB)"],
    qrcodes: ["QR Codes", "Generate fare QR for each bus — cashier only displays"],
    staff: ["Staff", "Register cashiers & employers — then assign to buses"],
    staffroles: ["Staff roles", "Cashier / employer role types"],
    customers: ["Customers", "App registrations — phone + OTP"],
    corporate: ["Corporate companies", "Register companies — they login in app with email & password you set"],
    trips: ["Trip history", "All passenger bus trips (fare payments)"],
    payments: ["Cashier collections", "Money collected by each cashier (QR fares)"],
    topup: ["Top-up payment apps", "Ethiopian mobile money — logos shown in passenger app"],
    admins: ["Admin users", "Only you (Super Admin) can register other admins"],
    adminroles: ["Roles", "Portal admin roles — name & description"],
    permissions: ["Permissions", "Toggle View / Add / Update / Delete per menu"],
  };
  if (state.view === "admins" && !state.user.is_super_admin) {
    header.innerHTML = `<div><h1>Access denied</h1></div>`;
    content.innerHTML = `<div class="alert alert-error">Only Super Admin can manage admin accounts.</div>`;
    return;
  }
  const viewPerm = {
    dashboard: ["dashboard.view"],
    buses: ["buses.view"],
    qrcodes: ["qrcodes.view"],
    staff: ["staff.view"],
    staffroles: ["staffroles.view"],
    customers: ["customers.view"],
    corporate: ["corporate.view"],
    trips: ["trips.view"],
    payments: ["payments.view"],
    topup: ["topup.view"],
    adminroles: ["roles.view"],
    permissions: ["permissions.view"],
  };
  let need = viewPerm[state.view];
  if (isReportView()) need = ["reports.view"];
  if (need && !can(...need)) {
    header.innerHTML = `<div><h1>Access denied</h1></div>`;
    content.innerHTML = `<div class="alert alert-error">You do not have permission for this page.</div>`;
    return;
  }
  let t;
  let sub;
  if (isReportView()) {
    const rid = reportIdFromView();
    const label =
      (state.reportMenu || REPORT_NAV_FALLBACK).find((m) => m.id === rid)?.label || rid || "Report";
    t = label;
    sub = "Reports";
  } else {
    [t, sub] = titles[state.view] || titles.dashboard;
  }
  header.innerHTML = `<div><h1>${t}</h1><p>${sub}</p></div>`;

  if (state.view === "dashboard") {
    destroyDashboardCharts();
    const [rev, buses, company, staff, charts] = await Promise.all([
      api("GET", "/admin/revenue"),
      api("GET", "/admin/buses"),
      api("GET", "/admin/company"),
      can("staff.view") ? api("GET", "/admin/staff").catch(() => []) : Promise.resolve([]),
      api("GET", "/admin/dashboard/charts?days=14").catch(() => null),
    ]);
    const s = charts?.summary || {};
    content.innerHTML = `
      <div class="dash-hero">
        <div>
          <h2>${company.name || "Your company"}</h2>
          <p>SafeFare overview — last ${charts?.days || 14} days</p>
        </div>
        <div class="dash-hero-stats">
          <div class="dash-hero-stat"><label>Customers</label><strong>${s.total_customers ?? "—"}</strong></div>
          <div class="dash-hero-stat"><label>Period revenue</label><strong>${formatBirr(s.period_revenue_birr)}</strong></div>
          <div class="dash-hero-stat"><label>New customers</label><strong>${s.period_new_customers ?? 0}</strong></div>
        </div>
      </div>
      <div class="dash-stats">
        <div class="dash-stat"><div class="dash-stat-icon blue">🚌</div><div><label>Active buses</label><div class="dash-stat-val">${buses.length}</div></div></div>
        <div class="dash-stat"><div class="dash-stat-icon green">🎫</div><div><label>Today trips</label><div class="dash-stat-val">${rev.today_trips}</div></div></div>
        <div class="dash-stat"><div class="dash-stat-icon teal">💳</div><div><label>Today revenue</label><div class="dash-stat-val">${formatBirr(rev.today_revenue_birr)}</div></div></div>
        <div class="dash-stat"><div class="dash-stat-icon amber">💰</div><div><label>Total revenue</label><div class="dash-stat-val">${formatBirr(rev.total_revenue_birr)}</div></div></div>
        <div class="dash-stat"><div class="dash-stat-icon purple">👤</div><div><label>App customers</label><div class="dash-stat-val">${s.total_customers ?? 0}</div></div></div>
      </div>
      <div class="dash-charts">
        <div class="chart-card">
          <div class="chart-card-header">
            <h3>Earnings (revenue)</h3>
            <p>Daily fare collected · ETB</p>
          </div>
          <div class="chart-wrap"><canvas id="chart-revenue"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-card-header">
            <h3>Customer registration</h3>
            <p>New app sign-ups per day</p>
          </div>
          <div class="chart-wrap"><canvas id="chart-customers"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-card-header">
            <h3>Payments (trips)</h3>
            <p>QR fare scans per day</p>
          </div>
          <div class="chart-wrap"><canvas id="chart-payments"></canvas></div>
        </div>
      </div>
      <div class="dash-grid">
        <div class="card">
          <div class="card-header"><h2>Summary</h2></div>
          <div class="card-body">
            <ul class="dash-list">
              <li>Total trips (all time): <strong>${rev.total_trips}</strong></li>
              <li>Staff (cashier / employer): <strong>${staff.length}</strong></li>
              <li>Payments (14 days): <strong>${s.period_payments ?? 0}</strong></li>
              <li>Top-ups (14 days): <strong>${formatBirr(s.period_topup_birr)}</strong></li>
            </ul>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h2>Quick links</h2></div>
          <div class="card-body dash-quick">
            ${can("buses.view") ? '<button type="button" class="btn btn-secondary btn-sm" data-go="buses">Buses & Routes</button>' : ""}
            ${can("qrcodes.view") ? '<button type="button" class="btn btn-secondary btn-sm" data-go="qrcodes">QR Codes</button>' : ""}
            ${can("customers.view") ? '<button type="button" class="btn btn-secondary btn-sm" data-go="customers">Customers</button>' : ""}
            ${can("reports.view") ? '<button type="button" class="btn btn-secondary btn-sm" data-go="report:daily_revenue">Reports</button>' : ""}
            ${can("staff.view") ? '<button type="button" class="btn btn-secondary btn-sm" data-go="staff">Staff</button>' : ""}
            ${can("payments.view") ? '<button type="button" class="btn btn-secondary btn-sm" data-go="payments">Cashier money</button>' : ""}
          </div>
        </div>
      </div>`;
    requestAnimationFrame(() => paintDashboardCharts(charts));
    content.querySelectorAll("[data-go]").forEach((btn) => {
      btn.onclick = () => {
        const go = btn.dataset.go;
        if (go.startsWith("report:")) {
          goReport(go.slice(7));
          return;
        }
        state.view = go;
        renderApp();
      };
    });
  } else if (state.view === "buses") {
    const buses = await api("GET", "/admin/buses");
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2>All buses &amp; routes</h2>
          ${can("buses.add") ? '<button class="btn btn-primary btn-sm" id="add-bus">+ Add bus / route</button>' : ""}
        </div>
        <div class="card-body table-wrap">
          ${
            buses.length
              ? `<table><thead><tr><th>Plate</th><th>Route</th><th>Fare</th><th>Cashier</th><th>Actions</th></tr></thead><tbody>
              ${buses
                .map(
                  (b) => `<tr>
                <td><strong>${b.plate}</strong></td>
                <td>${b.route_name}</td>
                <td>${formatBirr(b.fare_birr)}</td>
                <td>${b.cashier_id ? '<span class="badge badge-green">Assigned</span>' : '<span class="badge badge-amber">Unassigned</span>'}</td>
                <td class="table-actions">
                  ${can("buses.update") ? `<button type="button" class="btn btn-secondary btn-sm edit-bus-btn" data-id="${b.id}">Edit</button>` : ""}
                  ${can("buses.update") ? `<button type="button" class="btn btn-secondary btn-sm assign-btn" data-id="${b.id}">Assign cashier</button>` : "—"}
                </td>
              </tr>`
                )
                .join("")}</tbody></table>`
              : `<div class="empty-state">No buses yet. Click <strong>Add bus / route</strong>.</div>`
          }
        </div>
      </div>`;
    document.getElementById("add-bus")?.addEventListener("click", () => showBusModal(() => loadView()));
    document.querySelectorAll(".edit-bus-btn").forEach((btn) => {
      const bus = buses.find((b) => b.id === btn.dataset.id);
      btn.onclick = () => showBusModal(() => loadView(), bus);
    });
    document.querySelectorAll(".assign-btn").forEach((btn) => {
      btn.onclick = () => showAssignModal(buses, btn.dataset.id, () => loadView()).catch((e) => alert(e.message));
    });
  } else if (state.view === "qrcodes") {
    const [sessions, buses] = await Promise.all([
      api("GET", "/admin/qr-sessions"),
      api("GET", "/admin/buses"),
    ]);
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2>Bus fare QR codes</h2>
          ${can("qrcodes.add") ? '<button class="btn btn-primary btn-sm" id="gen-qr">+ Generate QR</button>' : ""}
        </div>
        <p style="padding:0 22px 12px;color:var(--muted);font-size:0.85rem">
          Only <strong>admin</strong> creates QR. Same code works for many passengers until you <strong>Regenerate</strong> or <strong>Delete</strong>.
          Cashier only shows the active QR on their screen.
        </p>
        <div class="card-body table-wrap">
          ${
            sessions.length
              ? `<table><thead><tr><th>Status</th><th>Bus / Route</th><th>Cashier</th><th>Fare</th><th>Scans</th><th>Token</th><th></th></tr></thead><tbody>
              ${sessions
                .map(
                  (s) => `<tr>
                <td>${s.active ? '<span class="badge badge-green">Active</span>' : '<span class="badge">Off</span>'}</td>
                <td><strong>${s.bus_plate}</strong><br/><small>${s.route_name}</small></td>
                <td>${s.cashier_name}<br/><small>${s.cashier_email}</small></td>
                <td>${formatBirr(s.fare_birr)}</td>
                <td>${s.scan_count ?? 0}</td>
                <td><code style="font-size:0.75rem">${s.token}</code></td>
                <td style="white-space:nowrap">
                  <button class="btn btn-secondary btn-sm preview-qr" data-id="${s.id}">View</button>
                  ${s.active && can("qrcodes.update") ? `<button class="btn btn-secondary btn-sm regen-qr" data-id="${s.id}">Regenerate</button>` : ""}
                  ${can("qrcodes.delete") ? `<button class="btn btn-secondary btn-sm del-qr" data-id="${s.id}">Delete</button>` : ""}
                </td></tr>`
                )
                .join("")}</tbody></table>`
              : `<div class="empty-state">No QR yet. Assign cashier to bus → Generate QR.</div>`
          }
        </div>
      </div>
      <div class="card" style="margin-top:20px">
        <div class="card-header"><h2>QR preview</h2></div>
        <div class="card-body qr-panel" id="qr-preview-panel">
          <p style="color:var(--muted)">Click <strong>View</strong> on a row above to show that QR here.</p>
        </div>
      </div>`;
    document.getElementById("gen-qr")?.addEventListener("click", () =>
      showGenerateQrModal(buses, () => loadView()).catch((e) => alert(e.message))
    );
    document.querySelectorAll(".regen-qr").forEach((btn) => {
      btn.onclick = async () => {
        if (!confirm("Create new QR? Old code stops working.")) return;
        await api("POST", `/admin/qr-sessions/${btn.dataset.id}/regenerate`);
        loadView();
      };
    });
    document.querySelectorAll(".del-qr").forEach((btn) => {
      btn.onclick = async () => {
        if (!confirm("Delete (deactivate) this QR?")) return;
        await api("DELETE", `/admin/qr-sessions/${btn.dataset.id}`);
        loadView();
      };
    });
    const sessionById = Object.fromEntries(sessions.map((s) => [s.id, s]));

    function renderQrPreview(s) {
      const panel = document.getElementById("qr-preview-panel");
      if (!panel || !s) return;
      const status = s.active
        ? '<span class="badge badge-green">Active</span>'
        : '<span class="badge">Inactive</span>';
      panel.innerHTML = `
        <div class="qr-frame"><img src="${s.qr_image || ""}" width="220" height="220" alt="QR"/></div>
        <p class="qr-token">${s.token}</p>
        <p style="color:var(--muted);margin-top:8px">
          <strong>${s.bus_plate}</strong> — ${s.route_name || ""}<br/>
          ${s.cashier_name || ""} · ${formatBirr(s.fare_birr)} · ${s.scan_count ?? 0} scans · ${status}
        </p>`;
    }

    if (sessions.length) renderQrPreview(sessions[0]);

    document.querySelectorAll(".preview-qr").forEach((btn) => {
      btn.onclick = () => {
        const s = sessionById[btn.dataset.id];
        if (!s) return;
        renderQrPreview(s);
        document.getElementById("qr-preview-panel")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      };
    });
  } else if (state.view === "staff") {
    const staff = await api("GET", "/admin/staff");
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2>Company staff</h2>
          ${can("staff.add") ? '<button class="btn btn-primary btn-sm" id="add-staff">+ Add staff</button>' : ""}
        </div>
        <p style="padding:0 22px 12px;color:var(--muted);font-size:0.85rem">
          Roles come from <strong>Staff roles</strong> page. Only admin can create accounts here.
        </p>
        <div class="card-body table-wrap">
          ${
            staff.length
              ? `<table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Phone</th></tr></thead><tbody>
              ${staff
                .map(
                  (s) => `<tr>
                <td>${s.name}</td><td>${s.email}</td>
                <td><span class="badge ${s.role === "cashier" ? "badge-green" : "badge-amber"}">${s.role_label || roleLabel(s.role)}</span></td>
                <td>${s.phone || "—"}</td></tr>`
                )
                .join("")}</tbody></table>`
              : `<div class="empty-state">No staff registered. Add cashiers or employers.</div>`
          }
        </div>
      </div>`;
    document.getElementById("add-staff")?.addEventListener("click", () =>
      showStaffModal(() => loadView()).catch((e) => alert(e.message))
    );
  } else if (state.view === "staffroles") {
    const roles = await api("GET", "/admin/roles");
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2>Staff roles</h2>
          ${can("staffroles.add") ? '<button class="btn btn-primary btn-sm" id="add-role">+ Add role</button>' : ""}
        </div>
        <p style="padding:0 22px 12px;color:var(--muted);font-size:0.85rem">
          Saved in database (<code>roles</code>). Add, edit, or delete any role.
          <strong>Staff → Add staff</strong> dropdown uses this list. Delete old rows once, then add your own.
        </p>
        <div class="card-body table-wrap">
          <table><thead><tr><th>Role</th><th>Slug</th><th>Portal</th><th>Mobile</th><th>Type</th><th>Actions</th></tr></thead>
          <tbody>${roles
            .map(
              (r) => `<tr>
              <td><strong>${r.label}</strong><br/><small style="color:var(--muted)">${r.description || ""}</small></td>
              <td><code>${r.slug}</code></td>
              <td>${r.can_use_portal ? "✓" : "—"}</td>
              <td>${r.can_use_mobile ? "✓" : "—"}</td>
              <td>${r.company_id ? '<span class="badge badge-amber">Yours</span>' : '<span class="badge badge-blue">Legacy</span>'}</td>
              <td style="white-space:nowrap">
                ${can("staffroles.update") ? `<button class="btn btn-secondary btn-sm edit-role" data-id="${r.id}">Edit</button> ` : ""}
                ${can("staffroles.delete") ? `<button class="btn btn-secondary btn-sm del-role" data-id="${r.id}">Delete</button>` : ""}
              </td>
            </tr>`
            )
            .join("")}</tbody></table>
        </div>
      </div>`;
    document.getElementById("add-role")?.addEventListener("click", () => showRoleModal(null, () => loadView()));
    document.querySelectorAll(".edit-role").forEach((btn) => {
      const r = roles.find((x) => x.id === btn.dataset.id);
      btn.onclick = () => showRoleModal(r, () => loadView()).catch((e) => alert(e.message));
    });
    document.querySelectorAll(".del-role").forEach((btn) => {
      btn.onclick = async () => {
        if (!confirm("Delete this role?")) return;
        await api("DELETE", `/admin/roles/${btn.dataset.id}`);
        loadView();
      };
    });
  } else if (state.view === "customers") {
    const customers = await api("GET", "/admin/customers");
    content.innerHTML = `
      <div class="card">
        <div class="card-header"><h2>Customers (mobile app)</h2></div>
        <p style="padding:0 22px 12px;color:var(--muted);font-size:0.85rem">
          Registered via phone + OTP in the passenger app. Staff &amp; admins are not listed here.
        </p>
        <div class="card-body table-wrap">
          ${
            customers.length
              ? `<table><thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Company</th><th>Wallet</th><th>Status</th><th>Registered</th><th>Action</th></tr></thead><tbody>
              ${customers
                .map(
                  (c) => `<tr>
                <td>${c.row}</td>
                <td><strong>${c.name}</strong><br/><small style="color:var(--muted)">${c.email}</small></td>
                <td>${c.phone_display || c.phone}</td>
                <td>${c.corporate_name ? `<span class="badge badge-blue">${c.corporate_name}</span>` : "—"}${c.pays_via_company ? '<br/><small style="color:var(--muted)">Company pays fare</small>' : ""}</td>
                <td>${formatBirr(c.wallet_birr)}</td>
                <td>${c.active ? '<span class="badge badge-green">Active</span>' : '<span class="badge">Off</span>'}${c.has_pending_otp ? ' <span class="badge badge-amber">OTP pending</span>' : ""}</td>
                <td><small>${new Date(c.created_at).toLocaleString()}</small></td>
                <td style="white-space:nowrap">
                  <button class="btn btn-secondary btn-sm cust-detail" data-id="${c.id}">View details</button>
                  <button class="btn btn-secondary btn-sm cust-otp" data-id="${c.id}">View OTP</button>
                </td></tr>`
                )
                .join("")}</tbody></table>`
              : `<div class="empty-state">No customers yet. They register in the mobile app with phone + OTP.</div>`
          }
        </div>
      </div>`;
    document.querySelectorAll(".cust-detail").forEach((btn) => {
      btn.onclick = () => showCustomerDetailModal(btn.dataset.id).catch((e) => alert(e.message));
    });
    document.querySelectorAll(".cust-otp").forEach((btn) => {
      btn.onclick = () => showCustomerOtpModal(btn.dataset.id).catch((e) => alert(e.message));
    });
  } else if (state.view === "corporate") {
    const corps = await api("GET", "/admin/corporates");
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2>Corporate companies</h2>
          ${can("corporate.add") ? '<button class="btn btn-primary btn-sm" id="add-corp">+ Register company</button>' : ""}
        </div>
        <p style="padding:0 22px 12px;color:var(--muted);font-size:0.85rem">
          Only admin creates accounts here. Give the company <strong>email + password</strong> — they sign in on the mobile app → <strong>Corporate</strong>.
        </p>
        <div class="card-body table-wrap">
          ${
            corps.length
              ? `<table><thead><tr><th>#</th><th>Company</th><th>Contact</th><th>Login email</th><th>Wallet</th><th>Employees</th><th>Status</th><th></th></tr></thead><tbody>
              ${corps
                .map(
                  (c) => `<tr>
                <td>${c.row}</td>
                <td><strong>${c.company_name}</strong></td>
                <td>${c.contact_name}<br/><small>${c.phone_display || ""}</small></td>
                <td><code>${c.email}</code></td>
                <td>${formatBirr(c.wallet_birr)}</td>
                <td>${c.employees}</td>
                <td>${c.active ? '<span class="badge badge-green">Active</span>' : '<span class="badge">Off</span>'}</td>
                <td>${can("corporate.update") ? `<button type="button" class="btn btn-secondary btn-sm edit-corp" data-id="${c.id}">Edit</button>` : "—"}</td>
              </tr>`
                )
                .join("")}</tbody></table>`
              : `<div class="empty-state">No corporate companies yet. Click <strong>Register company</strong>.</div>`
          }
        </div>
      </div>`;
    document.getElementById("add-corp")?.addEventListener("click", () => showCorporateModal(() => loadView()));
    document.querySelectorAll(".edit-corp").forEach((btn) => {
      const row = corps.find((c) => c.id === btn.dataset.id);
      btn.onclick = () => showCorporateModal(() => loadView(), row);
    });
  } else if (isReportView()) {
    await renderReportsPage(content);
  } else if (state.view === "trips") {
    const trips = await api("GET", "/admin/trip-history");
    content.innerHTML = `
      <div class="card">
        <div class="card-header"><h2>All trips (passenger fare payments)</h2></div>
        <div class="card-body table-wrap">
          ${
            trips.length
              ? `<table><thead><tr><th>Cashier</th><th>Passenger</th><th>Phone</th><th>Route</th><th>Bus</th><th>Fare</th><th>Date &amp; time</th></tr></thead><tbody>
              ${trips
                .map(
                  (t) => `<tr>
                <td><strong>${t.cashier_name || "—"}</strong></td>
                <td><strong>${t.passenger_name}</strong><br/><small>${t.passenger_email}</small></td>
                <td>${t.passenger_phone || "—"}</td>
                <td>${t.route_name}</td>
                <td>${t.bus_plate}</td>
                <td><strong>${formatBirr(t.amount_birr)}</strong></td>
                <td>${new Date(t.created_at).toLocaleString()}</td></tr>`
                )
                .join("")}</tbody></table>`
              : `<div class="empty-state">No trips yet. Cashier starts QR → passenger scans in mobile app.</div>`
          }
        </div>
      </div>`;
  } else if (state.view === "payments") {
    const [collections, payments] = await Promise.all([
      api("GET", "/admin/cashier-collections"),
      api("GET", "/admin/recent-payments"),
    ]);
    const collCards =
      collections.length > 0
        ? `<div class="stats-grid" style="margin-bottom:24px">
            ${collections
              .map(
                (c) => `<div class="stat-card success">
              <label>${c.cashier_name}</label>
              <div class="value">${formatBirr(c.today_revenue_birr)}</div>
              <small style="color:var(--muted)">Today · ${c.today_trips} trips · Total ${formatBirr(c.total_revenue_birr)}</small>
            </div>`
              )
              .join("")}
          </div>`
        : `<p class="alert alert-error" style="margin-bottom:16px">No cashier collections yet. Assign cashier to bus → cashier starts QR → passenger pays.</p>`;

    content.innerHTML = `
      ${collCards}
      <div class="card">
        <div class="card-header"><h2>Payment details (who collected)</h2></div>
        <div class="card-body table-wrap">
          ${
            payments.length
              ? `<table><thead><tr><th>Cashier</th><th>Passenger</th><th>Bus</th><th>Route</th><th>Amount</th><th>Time</th></tr></thead><tbody>
              ${payments
                .map(
                  (p) => `<tr>
                <td><strong>${p.cashier_name || "—"}</strong><br/><small>${p.cashier_email || ""}</small></td>
                <td>${p.passenger_name}</td><td>${p.bus_plate}</td><td>${p.route_name}</td>
                <td><strong>${formatBirr(p.amount_birr)}</strong></td>
                <td>${new Date(p.created_at).toLocaleString()}</td></tr>`
                )
                .join("")}</tbody></table>`
              : `<div class="empty-state">No payments yet.</div>`
          }
        </div>
      </div>`;
  } else if (state.view === "topup") {
    const providers = await api("GET", "/admin/payment-providers");
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2>Top-up apps (Ethiopia)</h2>
          ${can("topup.add") ? '<button class="btn btn-primary btn-sm" id="add-provider">+ Add app</button>' : ""}
        </div>
        <p style="padding:0 22px 12px;color:var(--muted);font-size:0.85rem">
          Upload logo (PNG/JPG). Passengers see these on <strong>Top up</strong> in the mobile app (Telebirr, CBE Birr, eBirr, Kaafi, Coopay, …).
        </p>
        <div class="card-body">
          ${
            providers.length
              ? `<div class="provider-admin-grid">
              ${providers
                .map(
                  (p) => `<div class="provider-admin-card ${p.active ? "" : "inactive"}">
                <div class="provider-logo-wrap">
                  ${
                    p.logo_url
                      ? `<img src="${p.logo_url}" alt="${p.name}"/>`
                      : `<span class="provider-logo-fallback">${p.name.slice(0, 2).toUpperCase()}</span>`
                  }
                </div>
                <strong>${p.name}</strong>
                <small>${p.active ? "Active" : "Hidden"} · order ${p.sort_order}</small>
                <div class="provider-admin-actions">
                  <button class="btn btn-secondary btn-sm edit-provider" data-id="${p.id}" data-name="${p.name}" data-active="${p.active}" data-order="${p.sort_order}">Edit</button>
                  <button class="btn btn-secondary btn-sm del-provider" data-id="${p.id}">Delete</button>
                </div>
              </div>`
                )
                .join("")}
            </div>`
              : `<div class="empty-state">No payment apps yet. Add Telebirr, CBE Birr, etc.</div>`
          }
        </div>
      </div>`;
    document.getElementById("add-provider")?.addEventListener("click", () =>
      showPaymentProviderModal(null, () => loadView()).catch((e) => alert(e.message))
    );
    document.querySelectorAll(".edit-provider").forEach((btn) => {
      btn.onclick = () =>
        showPaymentProviderModal(
          {
            id: btn.dataset.id,
            name: btn.dataset.name,
            active: btn.dataset.active === "true",
            sort_order: btn.dataset.order,
          },
          () => loadView()
        ).catch((e) => alert(e.message));
    });
    document.querySelectorAll(".del-provider").forEach((btn) => {
      btn.onclick = async () => {
        if (!confirm("Delete this payment app?")) return;
        await api("DELETE", `/admin/payment-providers/${btn.dataset.id}`);
        loadView();
      };
    });
  } else if (state.view === "admins") {
    const admins = await api("GET", "/admin/admins");
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2>Portal admin accounts</h2>
          <button class="btn btn-primary btn-sm" id="add-admin">+ Register admin</button>
        </div>
        <p style="padding:0 22px 12px;color:var(--muted);font-size:0.85rem">
          Only <strong>you</strong> (Super Admin) can add or disable admins. Assign them a role on <strong>Permissions</strong>.
        </p>
        <div class="card-body table-wrap">
          <table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
          <tbody>${admins
            .map(
              (a) => `<tr>
              <td><strong>${a.name}</strong></td>
              <td>${a.email}</td>
              <td>${a.is_super_admin ? '<span class="badge badge-blue">Super Admin</span>' : a.admin_role_label || "—"}</td>
              <td>${a.active !== false ? '<span class="badge badge-green">Active</span>' : '<span class="badge">Disabled</span>'}</td>
              <td>
                ${!a.is_super_admin ? `<button class="btn btn-secondary btn-sm edit-admin" data-id="${a.id}">Edit</button>` : ""}
                ${!a.is_super_admin ? `<button class="btn btn-secondary btn-sm del-admin" data-id="${a.id}">Disable</button>` : ""}
              </td></tr>`
            )
            .join("")}</tbody></table>
        </div>
      </div>`;
    document.getElementById("add-admin")?.addEventListener("click", () =>
      showAdminUserModal(null, () => loadView()).catch((e) => alert(e.message))
    );
    document.querySelectorAll(".edit-admin").forEach((btn) => {
      const a = admins.find((x) => x.id === btn.dataset.id);
      btn.onclick = () => showAdminUserModal(a, () => loadView()).catch((e) => alert(e.message));
    });
    document.querySelectorAll(".del-admin").forEach((btn) => {
      btn.onclick = async () => {
        if (!confirm("Disable this admin?")) return;
        await api("DELETE", `/admin/admins/${btn.dataset.id}`);
        loadView();
      };
    });
  } else if (state.view === "adminroles") {
    const roles = await api("GET", "/admin/admin-roles");
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2>Roles</h2>
          ${can("roles.add") ? '<button class="btn btn-primary btn-sm" id="add-arole">+ Add Role</button>' : ""}
        </div>
        <div class="card-body table-wrap">
          <table class="roles-table"><thead><tr><th>Name</th><th>Description</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>${roles
            .map(
              (r) => `<tr>
              <td><strong>${r.label}</strong></td>
              <td>${r.description || "—"}</td>
              <td>${r.active !== false ? '<span class="badge badge-green">Active</span>' : '<span class="badge">Inactive</span>'}</td>
              <td class="roles-actions">
                ${can("roles.update") ? `<button type="button" class="btn-icon edit-arole" data-id="${r.id}" title="Edit">✎</button>` : ""}
                ${can("roles.delete") ? `<button type="button" class="btn-icon del-arole danger" data-id="${r.id}" title="Delete">🗑</button>` : ""}
              </td></tr>`
            )
            .join("")}</tbody></table>
        </div>
      </div>
      <p style="margin-top:12px;color:var(--muted);font-size:0.85rem">Set access rights on the <strong>Permissions</strong> page.</p>`;
    document.getElementById("add-arole")?.addEventListener("click", () =>
      showAdminRoleModal(null, () => loadView()).catch((e) => alert(e.message))
    );
    document.querySelectorAll(".edit-arole").forEach((btn) => {
      const r = roles.find((x) => x.id === btn.dataset.id);
      btn.onclick = () => showAdminRoleModal(r, () => loadView()).catch((e) => alert(e.message));
    });
    document.querySelectorAll(".del-arole").forEach((btn) => {
      btn.onclick = async () => {
        if (!confirm("Delete this role?")) return;
        await api("DELETE", `/admin/admin-roles/${btn.dataset.id}`);
        loadView();
      };
    });
  } else if (state.view === "permissions") {
    await renderPermissionsPage(content);
  }
}

function permToggleCell(item, field, readonly) {
  const allowKey = `allow_${field}`;
  if (!item[allowKey]) {
    return `<td class="perm-na">—</td>`;
  }
  const flag = `can${field.charAt(0).toUpperCase()}${field.slice(1)}`;
  const on = !!item[flag];
  return `<td>
    <label class="perm-switch">
      <input type="checkbox" data-menu-id="${item.menu_id}" data-flag="${flag}" ${on ? "checked" : ""} ${readonly ? "disabled" : ""}/>
      <span class="perm-slider"></span>
    </label>
  </td>`;
}

function buildPermTableRows(items, readonly) {
  return items
    .map(
      (item) => `<tr data-menu-id="${item.menu_id}">
        <td><strong>${item.menu}</strong></td>
        <td>${item.parent}</td>
        ${permToggleCell(item, "view", readonly)}
        ${permToggleCell(item, "add", readonly)}
        ${permToggleCell(item, "update", readonly)}
        ${permToggleCell(item, "delete", readonly)}
      </tr>`
    )
    .join("");
}

async function renderPermissionsPage(content) {
  const roles = await api("GET", "/admin/admin-roles");
  const readonly = !can("permissions.update") && !state.user.is_super_admin;
  let selectedRoleId = roles[0]?.id || "";
  let matrixItems = [];

  async function loadMatrix() {
    if (!selectedRoleId) {
      matrixItems = [];
      return;
    }
    const data = await api("GET", `/admin/permissions/role/${selectedRoleId}`);
    matrixItems = data.items || [];
  }

  await loadMatrix();

  const roleOpts = roles.map((r) => `<option value="${r.id}">${r.label}</option>`).join("");

  content.innerHTML = `
    <div class="perm-toolbar">
      <p class="perm-hint">Toggle permissions for each menu below. Saved in <strong>rolepermissions</strong> collection (per role + menu).</p>
      <div class="perm-toolbar-right">
        <label>Select Role</label>
        <select id="perm-role-select" class="perm-select">${roleOpts || '<option value="">No roles — add on Roles page</option>'}</select>
        <button type="button" class="btn btn-secondary btn-sm" id="perm-refresh">Refresh</button>
        ${readonly ? "" : '<button type="button" class="btn btn-primary btn-sm" id="perm-save">Save Permissions</button>'}
      </div>
    </div>
    <div class="card">
      <div class="card-body table-wrap">
        <table class="perm-table">
          <thead><tr><th>Menu</th><th>Parent</th><th>View</th><th>Add</th><th>Update</th><th>Delete</th></tr></thead>
          <tbody id="perm-tbody">${buildPermTableRows(matrixItems, readonly)}</tbody>
        </table>
      </div>
    </div>`;

  const selEl = document.getElementById("perm-role-select");
  if (selEl) {
    selEl.value = selectedRoleId;
    selEl.onchange = async () => {
      selectedRoleId = selEl.value;
      await loadMatrix();
      document.getElementById("perm-tbody").innerHTML = buildPermTableRows(matrixItems, readonly);
    };
  }

  document.getElementById("perm-refresh")?.addEventListener("click", () => loadView());
  document.getElementById("perm-save")?.addEventListener("click", async () => {
    if (!selectedRoleId) return alert("Select a role first");
    const byMenu = {};
    for (const item of matrixItems) {
      byMenu[item.menu_id] = {
        menu_id: item.menu_id,
        canView: false,
        canAdd: false,
        canUpdate: false,
        canDelete: false,
      };
    }
    document.querySelectorAll("#perm-tbody [data-menu-id]").forEach((el) => {
      const mid = el.dataset.menuId;
      const flag = el.dataset.flag;
      if (el.checked && byMenu[mid]) byMenu[mid][flag] = true;
    });
    const items = Object.values(byMenu);
    await api("PUT", `/admin/permissions/role/${selectedRoleId}`, { items });
    alert("Permissions saved to database.");
    await loadMatrix();
    document.getElementById("perm-tbody").innerHTML = buildPermTableRows(matrixItems, readonly);
  });
}

/* ───────── CASHIER ───────── */

async function renderCashierView(header, content) {
  if (state.view === "dashboard" || state.view === "qr") {
    header.innerHTML =
      state.view === "qr"
        ? `<div><h1>QR — Collect fare</h1><p>Passenger scans this code in the SafeFare mobile app</p></div>`
        : `<div><h1>Cashier dashboard</h1><p>Your bus and today&apos;s collections</p></div>`;

    let bus = null;
    try {
      bus = await api("GET", "/cashier/my-bus");
    } catch (_) {}
    const today = await api("GET", "/cashier/today");
    let qr = null;
    try {
      const q = await api("GET", "/cashier/qr/active");
      if (q && q.token) qr = q;
    } catch (_) {}

    const qrSection =
      state.view === "qr"
        ? `<div class="card qr-card-main">
        <div class="card-header" style="background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;border:none">
          <h2 style="color:#fff">Scan to pay — QR Code</h2>
          <span class="badge" style="background:rgba(255,255,255,0.2);color:#fff">Admin assigned</span>
        </div>
        <div class="card-body qr-panel" style="padding:32px">
        ${
          qr
            ? `<div class="qr-frame">
               <img src="${qr.qr_image || ""}" width="280" height="280" alt="Scan to pay QR code"/>
               </div>
             <p class="qr-fare">${formatBirr(qr.fare_birr)} <span>per trip</span></p>
             <p class="qr-hint">Passenger opens app → <strong>Pay</strong> → scans this QR</p>
             <p class="qr-hint" style="margin-top:8px">${qr.scan_count ?? 0} passengers paid · same QR until admin regenerates</p>
             <p class="qr-token">${qr.token}</p>`
            : `<div class="empty-state" style="padding:40px">
               <p style="font-size:1.1rem;margin-bottom:12px">No QR assigned yet</p>
               <p style="color:var(--muted)">Ask your <strong>admin</strong> to generate QR in Staff portal → <strong>QR Codes</strong>.</p>
               <p style="color:var(--muted);margin-top:8px;font-size:0.85rem">Cashiers cannot create QR themselves.</p></div>`
        }</div></div>`
        : "";

    content.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card success"><label>Today revenue</label><div class="value">${formatBirr(today.revenue_birr)}</div></div>
        <div class="stat-card primary"><label>Today trips</label><div class="value">${today.trips}</div></div>
      </div>
      <div class="card">
        <div class="card-header"><h2>Assigned bus</h2></div>
        <div class="card-body">
        ${
          bus
            ? `<p><strong>${bus.plate}</strong> — ${bus.route_name}<br/>Fare: ${formatBirr(bus.fare_birr)}</p>`
            : `<p class="alert alert-error">No bus assigned. Contact your admin.</p>`
        }
        </div>
      </div>
      ${qrSection}`;

  }
}

/* ───────── EMPLOYER ───────── */

async function renderEmployerView(header, content) {
  const account = await api("GET", "/employer/account");

  if (state.view === "dashboard") {
    header.innerHTML = `<div><h1>Employer dashboard</h1><p>Transport allowance for staff</p></div>`;
    const staff = await api("GET", "/employer/staff");
    content.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card success"><label>Company wallet</label><div class="value">${formatBirr(account.balance_birr)}</div></div>
        <div class="stat-card primary"><label>Staff members</label><div class="value">${staff.length}</div></div>
      </div>`;
  } else if (state.view === "staff") {
    header.innerHTML = `<div><h1>Staff</h1><p>Passengers linked to your company</p></div>`;
    const staff = await api("GET", "/employer/staff");
    content.innerHTML = `
      <div class="card">
        <div class="card-header"><h2>Staff list</h2>
          <button class="btn btn-primary btn-sm" id="add-emp-staff">+ Register employee</button></div>
        <p style="padding:0 22px 12px;color:var(--muted);font-size:0.85rem">
          Create a <strong>passenger</strong> account for your company (bus fare wallet). Cannot use cashier/admin emails.
        </p>
        <div class="card-body">
        ${
          staff.length
            ? staff
                .map(
                  (s) =>
                    `<div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)">
                    <div><strong>${s.name}</strong><br/><small>${s.email}</small></div>
                    <button class="btn btn-secondary btn-sm alloc-emp" data-email="${s.email}">Allocate</button></div>`
                )
                .join("")
            : `<div class="empty-state">No staff yet.</div>`
        }
        </div>
      </div>`;
    document.getElementById("add-emp-staff")?.addEventListener("click", () => showEmpStaffModal(() => loadView()));
    document.querySelectorAll(".alloc-emp").forEach((b) => {
      b.onclick = () => showAllocateModal(b.dataset.email, () => loadView());
    });
  } else if (state.view === "allocate") {
    header.innerHTML = `<div><h1>Allowances</h1><p>Recent allocations to staff</p></div>`;
    const allocs = await api("GET", "/employer/allocations");
    content.innerHTML = `
      <div class="card"><div class="card-header"><h2>History</h2></div><div class="card-body">
      ${
        allocs.length
          ? allocs
              .map(
                (a) =>
                  `<div style="padding:10px 0;border-bottom:1px solid var(--border)">
                  <strong>${formatBirr(a.amount_birr)}</strong> — ${a.staff_name || a.description || "Allocation"}
                  <br/><small>${a.staff_email || ""}</small></div>`
              )
              .join("")
          : `<div class="empty-state">No allocations yet.</div>`
      }
      </div></div>`;
  }
}

/* ───────── MODALS ───────── */

function openModal(title, bodyHtml, onSave, viewOnly = false) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">${title}</div>
      <div class="modal-body">${bodyHtml}<p id="modal-err" class="alert alert-error hidden" style="margin-top:12px"></p></div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="modal-cancel">${viewOnly ? "Close" : "Cancel"}</button>
        ${viewOnly ? "" : '<button class="btn btn-primary" id="modal-save">Save</button>'}
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };
  document.getElementById("modal-cancel").onclick = () => overlay.remove();
  if (!viewOnly && onSave) {
    document.getElementById("modal-save").onclick = async () => {
      try {
        await onSave(overlay);
        overlay.remove();
      } catch (e) {
        const err = document.getElementById("modal-err");
        err.textContent = e.message;
        err.classList.remove("hidden");
      }
    };
  }
}

function showGenerateQrModal(buses, reload) {
  const withCashier = buses.filter((b) => b.cashier_id);
  if (!withCashier.length) {
    alert("No bus with cashier. Buses & Routes → Assign cashier first.");
    return;
  }
  const opts = withCashier
    .map((b) => `<option value="${b.id}">${b.plate} — ${b.route_name}</option>`)
    .join("");
  openModal(
    "Generate fare QR",
    `<p style="font-size:0.85rem;color:var(--muted);margin-bottom:12px">Replaces any active QR on this bus. Passengers can scan many times until you regenerate.</p>
     <div class="form-group"><label>Bus</label><select id="m-bus">${opts}</select></div>`,
    async () => {
      await api("POST", "/admin/qr-sessions", { bus_id: document.getElementById("m-bus").value });
      reload();
    }
  );
}

function showBusModal(reload, existing) {
  const isEdit = !!existing;
  openModal(
    isEdit ? "Edit bus &amp; route" : "Add bus &amp; route",
    `<div class="form-group"><label>Plate number</label><input id="m-plate" placeholder="AA-3-12345" value="${existing?.plate || ""}" /></div>
     <div class="form-group"><label>Route name</label><input id="m-route" placeholder="Bole - Magaalaya" value="${existing?.route_name || ""}" /></div>
     <div class="form-group"><label>Fare (ETB)</label><input id="m-fare" type="number" step="0.01" value="${existing?.fare_birr ?? ""}" /></div>`,
    async () => {
      const body = {
        plate: document.getElementById("m-plate").value.trim(),
        route_name: document.getElementById("m-route").value.trim(),
        fare_birr: parseFloat(document.getElementById("m-fare").value),
      };
      if (isEdit) await api("PATCH", `/admin/buses/${existing.id}`, body);
      else await api("POST", "/admin/buses", body);
      reload();
    }
  );
}

function showCorporateModal(reload, existing) {
  const isEdit = !!existing;
  openModal(
    isEdit ? "Edit corporate company" : "Register corporate company",
    `<p style="font-size:0.85rem;color:var(--muted);margin-bottom:12px">Company uses mobile app → <strong>Corporate</strong> with the email and password below.</p>
     <div class="form-group"><label>Company name</label><input id="m-cname" value="${existing?.company_name || ""}" placeholder="ABC Transport PLC" /></div>
     <div class="form-group"><label>Contact person</label><input id="m-contact" value="${existing?.contact_name || ""}" placeholder="Manager name" /></div>
     <div class="form-group"><label>Login email</label><input id="m-cemail" type="email" value="${existing?.email || ""}" placeholder="company@email.com" /></div>
     <div class="form-group"><label>${isEdit ? "New password (leave blank to keep)" : "Password"}</label><input id="m-cpass" type="password" placeholder="Min 6 characters" /></div>
     <div class="form-group"><label>Phone (optional)</label><input id="m-cphone" value="${existing?.phone || ""}" placeholder="0912345678" /></div>
     ${isEdit ? `<div class="form-group"><label><input type="checkbox" id="m-cactive" ${existing.active !== false ? "checked" : ""} /> Active — can login to app</label></div>` : ""}`,
    async () => {
      const body = {
        company_name: document.getElementById("m-cname").value.trim(),
        contact_name: document.getElementById("m-contact").value.trim(),
        email: document.getElementById("m-cemail").value.trim(),
        phone: document.getElementById("m-cphone").value.trim(),
      };
      const pass = document.getElementById("m-cpass").value;
      if (!isEdit && (!pass || pass.length < 6)) throw new Error("Password required (min 6 characters)");
      if (pass) body.password = pass;
      if (isEdit) {
        body.active = document.getElementById("m-cactive").checked;
        await api("PATCH", `/admin/corporates/${existing.id}`, body);
      } else {
        const res = await api("POST", "/admin/corporates", body);
        alert(`Company registered.\n\nGive them:\nEmail: ${res.email}\nPassword: (what you entered)\n\nApp → Corporate login`);
      }
      reload();
    }
  );
}

async function showAssignModal(buses, busId, reload) {
  const staff = await api("GET", "/admin/staff");
  const roles = await api("GET", "/admin/roles");
  const qrSlugs = roles.filter((r) => r.portal_home === "qr" || r.slug === "cashier").map((r) => r.slug);
  const qrSet = new Set(qrSlugs.map((s) => s.toLowerCase()));
  const cashiers = staff.filter((s) => qrSet.has((s.role || "").toLowerCase()));
  const busOpts = buses
    .map((b) => `<option value="${b.id}" ${b.id === busId ? "selected" : ""}>${b.plate} — ${b.route_name}</option>`)
    .join("");

  const qrRoleLabels = roles
    .filter((r) => r.portal_home === "qr" || r.slug === "cashier")
    .map((r) => r.label)
    .join(", ");
  const cashierField =
    cashiers.length > 0
      ? `<div class="form-group"><label>Cashier account</label>
         <select id="m-email">${cashiers.map((c) => `<option value="${c.email}">${c.name} (${c.email}) — ${c.role_label || c.role}</option>`).join("")}</select></div>`
      : `<div class="alert alert-error" style="margin-bottom:12px">
           <strong>No cashier staff account.</strong><br/>
           <strong>Staff roles</strong> only defines the role${qrRoleLabels ? ` (${qrRoleLabels})` : ""} — you still need a <strong>login user</strong>.<br/>
           Go to <strong>Staff</strong> → <strong>+ Add staff</strong> → Role: <strong>Cashier</strong> (or any role with QR portal).
         </div>
         <div class="form-group"><label>Cashier email</label><input id="m-email" placeholder="cashier@company.com" disabled /></div>`;

  openModal(
    "Assign cashier to bus",
    `<p style="font-size:0.85rem;color:var(--muted);margin-bottom:14px">Cashiers are registered under <strong>Staff</strong>, then assigned to a bus here.</p>
     <div class="form-group"><label>Bus</label><select id="m-bus">${busOpts}</select></div>
     ${cashierField}`,
    async () => {
      const emailEl = document.getElementById("m-email");
      if (!emailEl || emailEl.disabled) {
        throw new Error("Add a cashier in Staff menu first.");
      }
      await api("POST", "/admin/assign-cashier", {
        bus_id: document.getElementById("m-bus").value,
        cashier_email: emailEl.value.trim(),
      });
      reload();
    }
  );
  if (!cashiers.length) {
    document.getElementById("modal-save").disabled = true;
  }
}

async function showStaffModal(reload) {
  const roles = (await api("GET", "/admin/roles")).filter((r) => r.can_use_portal || r.can_use_mobile);
  if (!roles.length) throw new Error("No roles on Staff roles page. Refresh or contact support.");
  const roleOpts = roles.map((r) => `<option value="${r.slug}">${r.label}</option>`).join("");
  openModal(
    "Add staff account (admin only)",
    `<div class="form-group"><label>Role</label>
      <select id="m-role">${roleOpts}</select></div>
     <div class="form-group"><label>Full name</label><input id="m-name" /></div>
     <div class="form-group"><label>Email</label><input id="m-email" type="email" /></div>
     <div class="form-group"><label>Phone</label><input id="m-phone" /></div>
     <div class="form-group"><label>Password</label><input id="m-pass" type="password" /></div>`,
    async () => {
      await api("POST", "/admin/staff", {
        role: document.getElementById("m-role").value,
        name: document.getElementById("m-name").value.trim(),
        email: document.getElementById("m-email").value.trim(),
        phone: document.getElementById("m-phone").value.trim(),
        password: document.getElementById("m-pass").value,
      });
      reload();
    }
  );
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("Could not read file"));
    r.readAsDataURL(file);
  });
}

function showPaymentProviderModal(existing, reload) {
  const isEdit = !!existing?.id;
  openModal(
    isEdit ? `Edit — ${existing.name}` : "Add top-up app",
    `<div class="form-group"><label>App name</label><input id="m-name" value="${existing?.name || ""}" placeholder="Telebirr" /></div>
     <div class="form-group"><label>Logo image</label><input id="m-logo" type="file" accept="image/png,image/jpeg,image/webp,image/gif" />
     <small style="color:var(--muted)">PNG or JPG, max ~600KB</small></div>
     <div class="form-group"><label>Sort order</label><input id="m-order" type="number" value="${existing?.sort_order ?? 0}" /></div>
     <div class="form-group"><label><input type="checkbox" id="m-active" ${existing?.active !== false ? "checked" : ""}/> Show in passenger app</label></div>`,
    async () => {
      const name = document.getElementById("m-name").value.trim();
      if (!name) throw new Error("Name required");
      const body = {
        name,
        active: document.getElementById("m-active").checked,
        sort_order: parseInt(document.getElementById("m-order").value, 10) || 0,
      };
      const file = document.getElementById("m-logo").files?.[0];
      if (file) body.logo_base64 = await readFileAsDataUrl(file);
      else if (!isEdit) throw new Error("Upload a logo image");

      if (isEdit) {
        await api("PATCH", `/admin/payment-providers/${existing.id}`, body);
      } else {
        await api("POST", "/admin/payment-providers", body);
      }
      reload();
    }
  );
}

function showAdminRoleModal(existing, reload) {
  const isEdit = !!existing;
  openModal(
    isEdit ? `Edit role — ${existing.label}` : "Add role",
    `<div class="form-group"><label>Name</label><input id="m-label" value="${existing?.label || ""}" placeholder="Operations Manager"/></div>
     <div class="form-group"><label>Description</label><input id="m-desc" value="${existing?.description || ""}" placeholder="Short description"/></div>
     ${isEdit ? `<div class="form-group"><label><input type="checkbox" id="m-active" ${existing.active !== false ? "checked" : ""}/> Active</label></div>` : ""}
     <p style="font-size:0.85rem;color:var(--muted)">Set View/Add/Update/Delete on the <strong>Permissions</strong> page.</p>`,
    async () => {
      const body = {
        label: document.getElementById("m-label").value.trim(),
        description: document.getElementById("m-desc").value.trim(),
      };
      if (!body.label) throw new Error("Name required");
      if (isEdit) {
        body.active = document.getElementById("m-active").checked;
        await api("PATCH", `/admin/admin-roles/${existing.id}`, body);
      } else {
        body.slug = body.label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        body.permissions = [];
        await api("POST", "/admin/admin-roles", body);
      }
      reload();
    }
  );
}

async function showAdminUserModal(existing, reload) {
  const roles = await api("GET", "/admin/admin-roles");
  const opts = roles.map((r) => `<option value="${r.id}" ${existing?.admin_role_id === r.id ? "selected" : ""}>${r.label}</option>`).join("");
  const isEdit = !!existing;
  openModal(
    isEdit ? `Edit admin — ${existing.name}` : "Register new admin",
    `<div class="form-group"><label>Full name</label><input id="m-name" value="${existing?.name || ""}"/></div>
     <div class="form-group"><label>Email</label><input id="m-email" type="email" value="${existing?.email || ""}" ${isEdit ? "readonly" : ""}/></div>
     <div class="form-group"><label>Phone</label><input id="m-phone" value="${existing?.phone || ""}"/></div>
     ${isEdit ? "" : '<div class="form-group"><label>Password</label><input id="m-pass" type="password"/></div>'}
     ${isEdit ? '<div class="form-group"><label>New password (optional)</label><input id="m-pass" type="password"/></div>' : ""}
     <div class="form-group"><label>Admin role</label><select id="m-arole"><option value="">— No role —</option>${opts}</select></div>
     ${isEdit ? `<div class="form-group"><label><input type="checkbox" id="m-active" ${existing.active !== false ? "checked" : ""}/> Account active</label></div>` : ""}`,
    async () => {
      const body = {
        name: document.getElementById("m-name").value.trim(),
        phone: document.getElementById("m-phone").value.trim(),
        admin_role_id: document.getElementById("m-arole").value || null,
      };
      const pass = document.getElementById("m-pass")?.value;
      if (pass) body.password = pass;
      if (isEdit) {
        body.active = document.getElementById("m-active").checked;
        await api("PATCH", `/admin/admins/${existing.id}`, body);
      } else {
        body.email = document.getElementById("m-email").value.trim();
        if (!body.email || !pass) throw new Error("Email and password required");
        await api("POST", "/admin/admins", body);
      }
      reload();
    }
  );
}

function showRoleModal(existing, reload) {
  const isEdit = !!existing?.id;
  const home = existing?.portal_home || "dashboard";
  openModal(
    isEdit ? `Edit role — ${existing.label}` : "Add role",
    `<div class="form-group"><label>Display name</label><input id="m-label" value="${existing?.label || ""}" placeholder="Cashier" /></div>
     <div class="form-group"><label>Slug (code)</label><input id="m-slug" value="${existing?.slug || ""}" placeholder="cashier" /></div>
     <div class="form-group"><label>Description</label><input id="m-desc" value="${existing?.description || ""}" /></div>
     <div class="form-group"><label><input type="checkbox" id="m-portal" ${existing ? (existing.can_use_portal ? "checked" : "") : "checked"} /> Staff portal login</label></div>
     <div class="form-group"><label><input type="checkbox" id="m-mobile" ${existing?.can_use_mobile ? "checked" : ""} /> Mobile app (wallet)</label></div>
     <div class="form-group" id="portal-home-wrap"><label>Portal opens on</label>
       <select id="m-home">
         <option value="qr" ${home === "qr" ? "selected" : ""}>QR collect fare (cashier)</option>
         <option value="dashboard" ${home === "dashboard" ? "selected" : ""}>Dashboard only</option>
       </select></div>`,
    async () => {
      const portal = document.getElementById("m-portal").checked;
      const mobile = document.getElementById("m-mobile").checked;
      if (!portal && !mobile) throw new Error("Enable portal and/or mobile access");
      const body = {
        label: document.getElementById("m-label").value.trim(),
        slug: document.getElementById("m-slug").value.trim(),
        description: document.getElementById("m-desc").value.trim(),
        can_use_portal: portal,
        can_use_mobile: mobile,
        portal_home: portal ? document.getElementById("m-home").value : "none",
      };
      if (!body.label) throw new Error("Display name required");
      if (!body.slug) throw new Error("Slug required");
      if (isEdit) await api("PUT", `/admin/roles/${existing.id}`, body);
      else await api("POST", "/admin/roles", body);
      reload();
    }
  );
  const portalCb = document.getElementById("m-portal");
  const homeWrap = document.getElementById("portal-home-wrap");
  const syncHome = () => {
    homeWrap.style.display = portalCb.checked ? "block" : "none";
  };
  portalCb.onchange = syncHome;
  syncHome();
}

let lastReportData = null;

const REPORTS_NO_DATE = new Set(["buses", "staff_summary", "today_trips", "today_registrations"]);

const REPORT_COLUMN_LABELS = {
  period: "Period",
  trips: "Trips",
  total_birr: "Total (ETB)",
  date: "Date",
  passenger: "Passenger",
  phone: "Phone",
  bus: "Bus",
  route: "Route",
  cashier: "Cashier",
  amount_birr: "Amount",
  plate: "Plate",
  route_name: "Route",
  destination: "Destination",
  fare_birr: "Fare",
  name: "Name",
  email: "Email",
  role: "Role",
  count: "Count",
  payment_app: "Payment app",
  balance_after: "Balance after",
};

function defaultReportDateInputs(_reportId) {
  const today = new Date().toISOString().slice(0, 10);
  return { from: today, to: today };
}

function formatReportCell(key, val) {
  if (val == null || val === "") return "—";
  if (key === "date") return `<small>${new Date(val).toLocaleString()}</small>`;
  if (key === "total_birr" || key === "amount_birr" || key === "fare_birr" || key === "balance_after")
    return `<strong>${formatBirr(val)}</strong>`;
  if (key === "period" && /^\d{4}-\d{2}-\d{2}$/.test(String(val))) return String(val);
  return String(val);
}

function reportSummaryHtml(data, from, to, phone) {
  const s = data.summary || {};
  const parts = [`<span><strong>${s.count ?? 0}</strong> ${data.report?.startsWith("daily_") && data.columns?.includes("period") ? "trips total" : "records"}</span>`];
  const moneyReports = new Set([
    "daily_revenue",
    "weekly_revenue",
    "monthly_revenue",
    "daily_trips_detail",
    "today_trips",
    "bus_activity",
    "topups",
    "fare_search",
  ]);
  if (moneyReports.has(data.report)) {
    parts.push(`<span>Total: <strong>${formatBirr(s.total_birr)}</strong></span>`);
  }
  if (s.extra?.unique_passengers != null) {
    parts.push(`<span>Unique passengers today: <strong>${s.extra.unique_passengers}</strong></span>`);
  }
  if (s.extra?.days != null) parts.push(`<span>Days with sales: <strong>${s.extra.days}</strong></span>`);
  if (s.extra?.buses != null) parts.push(`<span>Buses: <strong>${s.extra.buses}</strong></span>`);
  if (s.extra?.with_cashier != null) parts.push(`<span>With cashier: <strong>${s.extra.with_cashier}</strong> / ${s.count}</span>`);
  if (s.extra?.by_role?.length) {
    parts.push(
      `<span>By role: ${s.extra.by_role.map((x) => `<strong>${x.role}</strong> ${x.count}`).join(" · ")}</span>`
    );
  }
  if (!REPORTS_NO_DATE.has(data.report) && (from || to)) {
    parts.push(`<span style="color:var(--muted);font-size:0.85rem">${from || "…"} → ${to || "…"}${phone ? ` · phone: ${phone}` : ""}</span>`);
  } else if (phone) {
    parts.push(`<span style="color:var(--muted);font-size:0.85rem">phone: ${phone}</span>`);
  }
  return parts.join("");
}

function renderReportTable(data) {
  const sumEl = document.getElementById("report-summary");
  const tableEl = document.getElementById("report-table");
  const from = document.getElementById("r-from")?.value;
  const to = document.getElementById("r-to")?.value;
  const phone = document.getElementById("r-phone")?.value?.trim() || "";
  sumEl.innerHTML = `<div class="report-sum-row">${reportSummaryHtml(data, from, to, phone)}</div>`;

  const cols = data.columns || [];
  if (!data.rows?.length) {
    tableEl.innerHTML = `<div class="empty-state">No records for these filters.</div>`;
    return;
  }
  const th = cols.map((c) => `<th>${REPORT_COLUMN_LABELS[c] || c}</th>`).join("");
  const body = data.rows
    .map((r) => `<tr>${cols.map((c) => `<td>${formatReportCell(c, r[c])}</td>`).join("")}</tr>`)
    .join("");
  tableEl.innerHTML = `<table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>`;
}

async function renderReportsPage(content) {
  const reportId = reportIdFromView() || "daily_revenue";
  const def = defaultReportDateInputs(reportId);
  const showDates = !REPORTS_NO_DATE.has(reportId);

  content.innerHTML = `
      <div class="card report-card">
        <div class="card-body">
          <div class="report-filters">
            ${showDates ? `<div class="form-group"><label>From date</label><input type="date" id="r-from" value="${def.from}" /></div>
            <div class="form-group"><label>To date</label><input type="date" id="r-to" value="${def.to}" /></div>` : ""}
            <div class="form-group report-phone">
              <label>Phone search</label>
              <input type="text" id="r-phone" placeholder="09xx or partial digits" maxlength="15" />
            </div>
            <div class="report-actions">
              <button type="button" class="btn btn-primary" id="run-report">Search</button>
              <button type="button" class="btn btn-secondary" id="export-report">Export CSV</button>
            </div>
          </div>
          <div id="report-summary" class="report-summary"></div>
          <div id="report-table" class="table-wrap" style="margin-top:16px"></div>
        </div>
      </div>`;

  document.getElementById("run-report").onclick = () => loadReportTable().catch((e) => alert(e.message));
  document.getElementById("export-report").onclick = () => exportReportCsv();
  loadReportTable().catch((e) => alert(e.message));
}

async function loadReportTable() {
  const report = reportIdFromView() || "daily_revenue";
  const phone = document.getElementById("r-phone")?.value?.trim() || "";
  const qs = new URLSearchParams({ report, limit: "500" });
  if (!REPORTS_NO_DATE.has(report)) {
    const from = document.getElementById("r-from")?.value;
    const to = document.getElementById("r-to")?.value;
    if (from) qs.set("date_from", from);
    if (to) qs.set("date_to", to);
  }
  if (phone) qs.set("phone", phone);
  const data = await api("GET", `/admin/reports?${qs.toString()}`);
  lastReportData = data;
  renderReportTable(data);
}

function exportReportCsv() {
  if (!lastReportData?.rows?.length) {
    alert("Run search first — no data to export.");
    return;
  }
  const cols = lastReportData.columns || Object.keys(lastReportData.rows[0] || {});
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = lastReportData.rows.map((r) =>
    cols.map((c) => {
      const v = r[c];
      if (c === "date" && v) return new Date(v).toISOString();
      return v;
    })
  );
  const csv = [cols.join(","), ...lines.map((row) => row.map(esc).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `safefare-report-${lastReportData.report || "data"}-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function showCustomerDetailModal(customerId) {
  const c = await api("GET", `/admin/customers/${customerId}`);
  const o = c.last_otp;
  const regDate = c.created_at ? new Date(c.created_at).toLocaleString() : "—";
  const otpBlock = o
    ? `<div class="form-group"><label>Last OTP</label>
         <p style="font-size:1.5rem;font-weight:800"><code>${o.code}</code></p>
         <p><small>${o.used ? "Used" : o.expired ? "Expired" : "Active"} · sent ${new Date(o.created_at).toLocaleString()}</small></p></div>`
    : `<p style="color:var(--muted)">No OTP sent yet.</p>`;
  openModal(
    `Customer — ${c.name}`,
    `<div class="form-group"><label>Name</label><p>${c.name}</p></div>
     <div class="form-group"><label>Phone</label><p>${c.phone_display || c.phone}</p></div>
     <div class="form-group"><label>Email</label><p><small>${c.email}</small></p></div>
     <div class="form-group"><label>Wallet</label><p>${formatBirr(c.wallet_balance_birr)}</p></div>
     <div class="form-group"><label>Registered</label><p><small>${regDate}</small></p></div>
     ${otpBlock}`,
    null,
    true
  );
}

async function showCustomerOtpModal(customerId) {
  const o = await api("GET", `/admin/customers/${customerId}/otp`);
  if (!o.code) {
    openModal("OTP", `<p>${o.detail || "No OTP on file."}</p>`, null, true);
    return;
  }
  const status = o.used ? "Used" : o.expired ? "Expired" : "Valid — customer can enter this code";
  openModal(
    `OTP — ${o.phone_display || o.phone}`,
    `<p style="font-size:0.85rem;color:var(--muted);margin-bottom:12px">Latest OTP sent to this customer (for support / testing).</p>
     <p style="font-size:2rem;font-weight:800;letter-spacing:0.2em;text-align:center;margin:16px 0"><code>${o.code}</code></p>
     <p><strong>Status:</strong> ${status}</p>
     <p><strong>Expires:</strong> ${new Date(o.expires_at).toLocaleString()}</p>
     <p><strong>Sent:</strong> ${new Date(o.created_at).toLocaleString()}</p>`,
    null,
    true
  );
}

function showEmpStaffModal(reload) {
  openModal(
    "Register employee (passenger account)",
    `<p style="font-size:0.85rem;color:var(--muted);margin-bottom:14px">New employee gets mobile app login + wallet for bus fare. Email must not already be cashier/admin.</p>
     <div class="form-group"><label>Full name</label><input id="m-name" placeholder="Employee name" /></div>
     <div class="form-group"><label>Email</label><input id="m-email" type="email" placeholder="employee@company.com" /></div>
     <div class="form-group"><label>Phone</label><input id="m-phone" placeholder="09xxxxxxxx" /></div>
     <div class="form-group"><label>Password</label><input id="m-pass" type="password" placeholder="Staff123!" /></div>`,
    async () => {
      await api("POST", "/employer/staff", {
        name: document.getElementById("m-name").value.trim(),
        email: document.getElementById("m-email").value.trim(),
        phone: document.getElementById("m-phone").value.trim(),
        password: document.getElementById("m-pass").value || "Staff123!",
      });
      reload();
    }
  );
}

function showAllocateModal(email, reload) {
  openModal(
    `Allocate to ${email}`,
    `<div class="form-group"><label>Amount (ETB)</label><input id="m-amt" type="number" /></div>
     <div class="form-group"><label>Note</label><input id="m-note" /></div>`,
    async () => {
      await api("POST", "/employer/allocate", {
        staff_email: email,
        amount_birr: parseFloat(document.getElementById("m-amt").value),
        note: document.getElementById("m-note").value.trim() || undefined,
      });
      reload();
    }
  );
}

/* ───────── BOOT ───────── */

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
