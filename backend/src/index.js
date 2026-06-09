require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const { connectDb } = require("./config/db");

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

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(pathUploads, { redirect: false }));

app.get("/", (_req, res) => {
  res.redirect("/admin/");
});

app.get("/api", (_req, res) => {
  res.json({ status: "ok", service: "SafeFare API" });
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
  const server = app.listen(PORT, () => {
    console.log("");
    console.log("  SafeFare is running");
    console.log("  -------------------");
    console.log(`  Staff portal:  http://localhost:${PORT}/admin/`);
    console.log(`  API:           http://localhost:${PORT}/api`);
    console.log(`  Home:          http://localhost:${PORT}/`);
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
