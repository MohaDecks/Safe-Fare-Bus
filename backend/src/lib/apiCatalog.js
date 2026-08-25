function buildApiCatalog(baseUrl) {
  const api = `${baseUrl}/api`;

  const groups = [
    {
      name: "Health",
      description: "Server status & documentation",
      routes: [
        { method: "GET", path: "/api", auth: "none", description: "API health + index" },
        { method: "GET", path: "/api/docs", auth: "none", description: "All endpoints (HTML)" },
        { method: "GET", path: "/api/routes", auth: "none", description: "All endpoints (JSON)" },
      ],
    },
    {
      name: "Auth",
      prefix: "/api/auth",
      routes: [
        { method: "POST", path: "/api/auth/login", auth: "none", description: "Staff portal login" },
        { method: "POST", path: "/api/auth/register", auth: "none", description: "Register user" },
        { method: "GET", path: "/api/auth/me", auth: "token", description: "Current user" },
        { method: "POST", path: "/api/auth/mobile/corporate-login", auth: "none", description: "Corporate mobile login" },
        { method: "POST", path: "/api/auth/mobile/cashier-login", auth: "none", description: "Cashier mobile login" },
        { method: "POST", path: "/api/auth/passenger/check-phone", auth: "none", description: "Check passenger phone" },
        { method: "POST", path: "/api/auth/passenger/send-otp", auth: "none", description: "Send OTP" },
        { method: "POST", path: "/api/auth/passenger/verify-otp", auth: "none", description: "Verify OTP" },
        { method: "POST", path: "/api/auth/passenger/complete-registration", auth: "token", description: "Complete passenger signup" },
      ],
    },
    {
      name: "Wallet (Passenger mobile)",
      prefix: "/api/wallet",
      routes: [
        { method: "GET", path: "/api/wallet", auth: "token+mobile", description: "Wallet balance" },
        { method: "GET", path: "/api/wallet/transactions", auth: "token+mobile", description: "Transaction history" },
        { method: "GET", path: "/api/wallet/trip-history", auth: "token+mobile", description: "Trip history" },
        { method: "GET", path: "/api/wallet/payment-providers", auth: "token+mobile", description: "Top-up providers" },
        { method: "POST", path: "/api/wallet/topup", auth: "token+mobile", description: "Top up wallet" },
      ],
    },
    {
      name: "Mobile app",
      prefix: "/api/mobile",
      routes: [
        { method: "GET", path: "/api/mobile/media", auth: "none", description: "Cloudinary logo, banner, and service image URLs" },
        { method: "GET", path: "/api/mobile/app-services", auth: "none", description: "Linked services on login screen" },
      ],
    },
    {
      name: "Passenger",
      prefix: "/api/passenger",
      routes: [
        { method: "POST", path: "/api/passenger/pay", auth: "token", description: "Pay fare via QR" },
      ],
    },
    {
      name: "Cashier",
      prefix: "/api/cashier",
      routes: [
        { method: "GET", path: "/api/cashier/my-bus", auth: "token+cashier", description: "Assigned bus" },
        { method: "GET", path: "/api/cashier/dashboard", auth: "token+cashier", description: "Dashboard stats" },
        { method: "GET", path: "/api/cashier/qr/active", auth: "token+cashier", description: "Active QR session" },
        { method: "POST", path: "/api/cashier/qr/start", auth: "token+cashier", description: "Start QR session" },
        { method: "GET", path: "/api/cashier/today", auth: "token+cashier", description: "Today collections" },
        { method: "GET", path: "/api/cashier/trip/active", auth: "token+cashier", description: "Active trip" },
        { method: "POST", path: "/api/cashier/trip/start", auth: "token+cashier", description: "Start trip" },
        { method: "POST", path: "/api/cashier/trip/complete", auth: "token+cashier", description: "Complete trip" },
        { method: "POST", path: "/api/cashier/trip/return", auth: "token+cashier", description: "Return trip" },
        { method: "GET", path: "/api/cashier/reports", auth: "token+cashier", description: "Cashier reports" },
      ],
    },
    {
      name: "Corporate (mobile)",
      prefix: "/api/corporate",
      routes: [
        { method: "GET", path: "/api/corporate/dashboard", auth: "token+corporate", description: "Corporate dashboard" },
        { method: "GET", path: "/api/corporate/payment-providers", auth: "token+corporate", description: "Payment providers" },
        { method: "POST", path: "/api/corporate/topup", auth: "token+corporate", description: "Top up employee" },
        { method: "GET", path: "/api/corporate/employees", auth: "token+corporate", description: "List employees" },
        { method: "POST", path: "/api/corporate/employees", auth: "token+corporate", description: "Add employee" },
        { method: "DELETE", path: "/api/corporate/employees/:id", auth: "token+corporate", description: "Remove employee" },
        { method: "GET", path: "/api/corporate/fare-usage", auth: "token+corporate", description: "Fare usage report" },
      ],
    },
    {
      name: "Admin",
      prefix: "/api/admin",
      routes: [
        { method: "GET", path: "/api/admin/buses", auth: "token+permission", description: "List buses" },
        { method: "POST", path: "/api/admin/buses", auth: "token+permission", description: "Add bus" },
        { method: "PATCH", path: "/api/admin/buses/:id", auth: "token+permission", description: "Update bus" },
        { method: "POST", path: "/api/admin/assign-cashier", auth: "token+permission", description: "Assign cashier to bus" },
        { method: "GET", path: "/api/admin/revenue", auth: "token+permission", description: "Revenue summary" },
        { method: "GET", path: "/api/admin/dashboard/charts", auth: "token+permission", description: "Dashboard charts" },
        { method: "GET", path: "/api/admin/company", auth: "token+permission", description: "Company info" },
        { method: "GET", path: "/api/admin/staff", auth: "token+permission", description: "Staff list" },
        { method: "POST", path: "/api/admin/staff", auth: "token+permission", description: "Add staff" },
        { method: "GET", path: "/api/admin/cashier-collections", auth: "token+permission", description: "Cashier collections" },
        { method: "GET", path: "/api/admin/trip-history", auth: "token+permission", description: "Trip history" },
        { method: "GET", path: "/api/admin/recent-payments", auth: "token+permission", description: "Recent payments" },
      ],
    },
    {
      name: "Admin — Roles",
      prefix: "/api/admin/roles",
      routes: [
        { method: "GET", path: "/api/admin/roles", auth: "token+permission", description: "Staff roles" },
        { method: "POST", path: "/api/admin/roles", auth: "token+permission", description: "Create role" },
        { method: "PUT", path: "/api/admin/roles/:id", auth: "token+permission", description: "Update role" },
        { method: "DELETE", path: "/api/admin/roles/:id", auth: "token+permission", description: "Delete role" },
      ],
    },
    {
      name: "Admin — Admin roles",
      prefix: "/api/admin/admin-roles",
      routes: [
        { method: "GET", path: "/api/admin/admin-roles", auth: "token+permission", description: "Admin roles" },
        { method: "POST", path: "/api/admin/admin-roles", auth: "token+permission", description: "Create admin role" },
        { method: "PATCH", path: "/api/admin/admin-roles/:id", auth: "token+permission", description: "Update admin role" },
        { method: "DELETE", path: "/api/admin/admin-roles/:id", auth: "token+permission", description: "Delete admin role" },
      ],
    },
    {
      name: "Admin — Admins",
      prefix: "/api/admin/admins",
      routes: [
        { method: "GET", path: "/api/admin/admins", auth: "token+admin", description: "Admin users" },
        { method: "POST", path: "/api/admin/admins", auth: "token+admin", description: "Create admin" },
        { method: "PATCH", path: "/api/admin/admins/:id", auth: "token+admin", description: "Update admin" },
        { method: "DELETE", path: "/api/admin/admins/:id", auth: "token+admin", description: "Delete admin" },
      ],
    },
    {
      name: "Admin — Customers",
      prefix: "/api/admin/customers",
      routes: [
        { method: "GET", path: "/api/admin/customers", auth: "token+permission", description: "Passenger customers" },
        { method: "GET", path: "/api/admin/customers/:id", auth: "token+permission", description: "Customer detail" },
        { method: "GET", path: "/api/admin/customers/:id/otp", auth: "token+permission", description: "Customer OTP" },
      ],
    },
    {
      name: "Admin — Corporates",
      prefix: "/api/admin/corporates",
      routes: [
        { method: "GET", path: "/api/admin/corporates", auth: "token+permission", description: "Corporate accounts" },
        { method: "POST", path: "/api/admin/corporates", auth: "token+permission", description: "Create corporate" },
        { method: "PATCH", path: "/api/admin/corporates/:id", auth: "token+permission", description: "Update corporate" },
      ],
    },
    {
      name: "Admin — QR sessions",
      prefix: "/api/admin/qr-sessions",
      routes: [
        { method: "GET", path: "/api/admin/qr-sessions", auth: "token+permission", description: "QR sessions" },
        { method: "POST", path: "/api/admin/qr-sessions", auth: "token+permission", description: "Create QR session" },
        { method: "POST", path: "/api/admin/qr-sessions/:id/regenerate", auth: "token+permission", description: "Regenerate QR" },
        { method: "PATCH", path: "/api/admin/qr-sessions/:id", auth: "token+permission", description: "Update QR session" },
        { method: "DELETE", path: "/api/admin/qr-sessions/:id", auth: "token+permission", description: "Delete QR session" },
      ],
    },
    {
      name: "Admin — Payment providers",
      prefix: "/api/admin/payment-providers",
      routes: [
        { method: "GET", path: "/api/admin/payment-providers", auth: "token+permission", description: "Top-up apps" },
        { method: "POST", path: "/api/admin/payment-providers", auth: "token+permission", description: "Add provider" },
        { method: "PATCH", path: "/api/admin/payment-providers/:id", auth: "token+permission", description: "Update provider" },
        { method: "DELETE", path: "/api/admin/payment-providers/:id", auth: "token+permission", description: "Delete provider" },
      ],
    },
    {
      name: "Admin — App services",
      prefix: "/api/admin/app-services",
      routes: [
        { method: "GET", path: "/api/admin/app-services", auth: "token+permission", description: "Linked app services" },
        { method: "POST", path: "/api/admin/app-services", auth: "token+permission", description: "Add service" },
        { method: "PATCH", path: "/api/admin/app-services/:id", auth: "token+permission", description: "Update service" },
        { method: "DELETE", path: "/api/admin/app-services/:id", auth: "token+permission", description: "Delete service" },
      ],
    },
    {
      name: "Admin — Permissions",
      prefix: "/api/admin/permissions",
      routes: [
        { method: "GET", path: "/api/admin/permissions/menus", auth: "token+permission", description: "Permission menus" },
        { method: "GET", path: "/api/admin/permissions/role/:roleId", auth: "token+permission", description: "Role permissions" },
        { method: "PUT", path: "/api/admin/permissions/role/:roleId", auth: "token+permission", description: "Update role permissions" },
      ],
    },
    {
      name: "Admin — Reports",
      prefix: "/api/admin/reports",
      routes: [
        { method: "GET", path: "/api/admin/reports/menu", auth: "token+permission", description: "Report menu" },
        { method: "GET", path: "/api/admin/reports", auth: "token+permission", description: "Run report" },
      ],
    },
  ];

  const routes = groups.flatMap((g) => g.routes);
  const byMethod = routes.reduce((acc, r) => {
    acc[r.method] = (acc[r.method] || 0) + 1;
    return acc;
  }, {});

  return {
    status: "ok",
    service: "SafeFare API",
    version: "1.0",
    base_url: api,
    public_url: baseUrl,
    docs: `${api}/docs`,
    routes_json: `${api}/routes`,
    staff_portal: `${baseUrl}/admin/`,
    total_endpoints: routes.length,
    methods: byMethod,
    groups,
    routes,
    auth_types: {
      none: "No authentication",
      token: "Authorization: Bearer <JWT>",
      "token+mobile": "JWT + passenger mobile role",
      "token+cashier": "JWT + cashier role",
      "token+corporate": "JWT + corporate role",
      "token+admin": "JWT + super admin",
      "token+permission": "JWT + admin permission",
    },
    cors: {
      enabled: true,
      credentials: true,
      note: "Mobile apps have no Origin header and are always allowed",
    },
  };
}

function renderApiDocsHtml(catalog) {
  const rows = catalog.routes
    .map(
      (r) =>
        `<tr>
          <td><span class="m ${r.method.toLowerCase()}">${r.method}</span></td>
          <td><code>${r.path}</code></td>
          <td>${r.auth}</td>
          <td>${r.description}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SafeFare API — ${catalog.total_endpoints} endpoints</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 0; padding: 24px; background: #0f1419; color: #e7ecf3; }
    h1 { margin: 0 0 8px; font-size: 1.5rem; }
    .meta { color: #9aa7b8; margin-bottom: 24px; font-size: 0.95rem; }
    .meta a { color: #6eb6ff; }
    table { width: 100%; border-collapse: collapse; background: #171d26; border-radius: 10px; overflow: hidden; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #243040; vertical-align: top; }
    th { background: #1c2430; color: #b8c5d6; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; }
    code { color: #9bdcff; font-size: 0.88rem; word-break: break-all; }
    .m { display: inline-block; min-width: 52px; text-align: center; padding: 2px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
    .get { background: #1a3d2e; color: #6ee7a8; }
    .post { background: #1e3355; color: #7eb8ff; }
    .put, .patch { background: #3d3318; color: #f5c86a; }
    .delete { background: #3d1e24; color: #ff8a9b; }
  </style>
</head>
<body>
  <h1>SafeFare API</h1>
  <p class="meta">
    Base: <a href="${catalog.base_url}">${catalog.base_url}</a> ·
    JSON: <a href="${catalog.routes_json}">${catalog.routes_json}</a> ·
    Portal: <a href="${catalog.staff_portal}">${catalog.staff_portal}</a> ·
    ${catalog.total_endpoints} endpoints
  </p>
  <table>
    <thead>
      <tr><th>Method</th><th>Path</th><th>Auth</th><th>Description</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

module.exports = { buildApiCatalog, renderApiDocsHtml };
