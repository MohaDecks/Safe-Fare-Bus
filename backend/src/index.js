require("dotenv").config();
const path = require("path");
const express = require("express");
const { connectDb } = require("./config/db");
const { corsMiddleware } = require("./lib/cors");
const { buildApiCatalog, renderApiDocsHtml } = require("./lib/apiCatalog");

const adminPortalPath = path.join(__dirname, "../../admin-portal");

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const cashierRoutes = require("./routes/cashier");
const walletRoutes = require("./routes/wallet");
const passengerRoutes = require("./routes/passenger");
const employerRoutes = require("./routes/employer");
const corporateRoutes = require("./routes/corporate");
const adminRolesRoutes = require("./routes/admin/roles");
const adminPaymentProvidersRoutes = require("./routes/admin/paymentProviders");
const adminQrSessionsRoutes = require("./routes/admin/qrSessions");
const adminPermissionsRoutes = require("./routes/admin/permissions");
const adminAdminRolesRoutes = require("./routes/admin/adminRoles");
const adminAdminsRoutes = require("./routes/admin/admins");
const adminCustomersRoutes = require("./routes/admin/customers");
const adminReportsRoutes = require("./routes/admin/reports");
const adminCorporatesRoutes = require("./routes/admin/corporates");
const pathUploads = path.join(__dirname, "../uploads");
const { ensureMenus } = require("./lib/ensureMenus");
const { migrateLegacyRolePermissions } = require("./lib/migrateRolePermissions");

const app = express();
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_URL = (process.env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, "");

app.use(corsMiddleware());
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(pathUploads, { redirect: false }));

app.get("/", (_req, res) => {
  res.redirect("/admin/");
});

app.get("/api", (_req, res) => {
  const catalog = buildApiCatalog(PUBLIC_URL);
  res.json({
    status: catalog.status,
    service: catalog.service,
    version: catalog.version,
    base_url: catalog.base_url,
    docs: catalog.docs,
    routes: catalog.routes_json,
    staff_portal: catalog.staff_portal,
    total_endpoints: catalog.total_endpoints,
    groups: catalog.groups.map((g) => ({
      name: g.name,
      prefix: g.prefix || null,
      count: g.routes.length,
    })),
  });
});

app.get("/api/routes", (_req, res) => {
  res.json(buildApiCatalog(PUBLIC_URL));
});

app.get("/api/docs", (_req, res) => {
  const catalog = buildApiCatalog(PUBLIC_URL);
  res.type("html").send(renderApiDocsHtml(catalog));
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/roles", adminRolesRoutes);
app.use("/api/admin/payment-providers", adminPaymentProvidersRoutes);
app.use("/api/admin/qr-sessions", adminQrSessionsRoutes);
app.use("/api/admin/permissions", adminPermissionsRoutes);
app.use("/api/admin/admin-roles", adminAdminRolesRoutes);
app.use("/api/admin/admins", adminAdminsRoutes);
app.use("/api/admin/customers", adminCustomersRoutes);
app.use("/api/admin/reports", adminReportsRoutes);
app.use("/api/admin/corporates", adminCorporatesRoutes);
app.use("/api/cashier", cashierRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/passenger", passengerRoutes);
app.use("/api/employer", employerRoutes);
app.use("/api/corporate", corporateRoutes);

// Staff portal — no redirects (avoids ERR_TOO_MANY_REDIRECTS loop)
app.get(["/admin", "/admin/"], (_req, res) => {
  res.sendFile(path.join(adminPortalPath, "index.html"));
});
app.use("/admin", express.static(adminPortalPath, { redirect: false }));

async function main() {
  await connectDb();
  await ensureMenus();
  try {
    await migrateLegacyRolePermissions();
  } catch (err) {
    console.warn("  migrateLegacyRolePermissions:", err.message);
  }
  const server = app.listen(PORT, HOST, () => {
    console.log("");
    console.log("  SafeFare is running");
    console.log("  -------------------");
    console.log(`  Listening:     ${HOST}:${PORT}`);
    console.log(`  Staff portal:  ${PUBLIC_URL}/admin/`);
    console.log(`  API:           ${PUBLIC_URL}/api`);
    console.log(`  API docs:      ${PUBLIC_URL}/api/docs`);
    console.log(`  All routes:    ${PUBLIC_URL}/api/routes`);
    console.log(`  Home:          ${PUBLIC_URL}/`);
    console.log("");
  });
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\n  Port ${PORT} is already in use. Run:\n`);
      console.error(`    kill $(lsof -t -i:${PORT})\n`);
      console.error("  Then start again: npm run dev\n");
      process.exit(1);
    }
    throw err;
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
