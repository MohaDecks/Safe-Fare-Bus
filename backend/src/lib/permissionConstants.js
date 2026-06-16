/** Menu list + flat keys — no circular imports */
const PERMISSION_MENUS = [
  { menu: "Dashboard", parent: "—", slug: "dashboard", view: true, add: false, update: false, delete: false },
  { menu: "Buses & Routes", parent: "—", slug: "buses", view: true, add: true, update: true, delete: false },
  { menu: "QR Codes", parent: "—", slug: "qrcodes", view: true, add: true, update: true, delete: true },
  { menu: "Staff", parent: "—", slug: "staff", view: true, add: true, update: false, delete: false },
  { menu: "Staff roles", parent: "Staff", slug: "staffroles", view: true, add: true, update: true, delete: true },
  { menu: "Customers", parent: "—", slug: "customers", view: true, add: false, update: false, delete: false },
  { menu: "Corporate companies", parent: "—", slug: "corporate", view: true, add: true, update: true, delete: false },
  { menu: "Reports", parent: "—", slug: "reports", view: true, add: false, update: false, delete: false },
  { menu: "Trip history", parent: "—", slug: "trips", view: true, add: false, update: false, delete: false },
  { menu: "Cashier money", parent: "—", slug: "payments", view: true, add: false, update: false, delete: false },
  { menu: "Top-up apps", parent: "—", slug: "topup", view: true, add: true, update: true, delete: true },
  { menu: "App services", parent: "—", slug: "appservices", view: true, add: true, update: true, delete: true },
  { menu: "Admin users", parent: "Settings", slug: "admins", view: true, add: true, update: true, delete: true },
  { menu: "Roles", parent: "Settings", slug: "roles", view: true, add: true, update: true, delete: true },
  { menu: "Permissions", parent: "Settings", slug: "permissions", view: true, add: false, update: true, delete: false },
];

function keysForMenu(m) {
  const keys = [];
  if (m.view) keys.push(`${m.slug}.view`);
  if (m.add) keys.push(`${m.slug}.add`);
  if (m.update) keys.push(`${m.slug}.update`);
  if (m.delete) keys.push(`${m.slug}.delete`);
  return keys;
}

const ALL_PERMISSION_KEYS = PERMISSION_MENUS.flatMap(keysForMenu);

module.exports = { PERMISSION_MENUS, keysForMenu, ALL_PERMISSION_KEYS };
