export const API = `${window.location.origin}/api`;
export const TOKEN_KEY = "sf_token";

/** Default branding when admin has not uploaded a company logo */
export const DEFAULT_LOGO = "assets/safefare-logo.png";
export const DEFAULT_BRAND_NAME = "Safe Fare";
export const DEFAULT_TAGLINE = "Smart Bus Fare & Ticketing Platform";

export const CASHIER_NAV = [
  { id: "qr", icon: "📱", label: "QR Collect fare" },
  { id: "dashboard", icon: "📊", label: "Dashboard" },
];

export const EMPLOYER_NAV = [
  { id: "dashboard", icon: "📊", label: "Dashboard" },
  { id: "staff", icon: "👥", label: "Staff" },
  { id: "allocate", icon: "💰", label: "Allowances" },
];

export const ADMIN_NAV_ALL = [
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

export const REPORT_NAV_ORDER = ["Rev", "Today", "Fleet", "Staff", "Cus"];

export const REPORT_NAV_FALLBACK = [
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
