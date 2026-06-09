const express = require("express");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { loadAdminPermissions, requireAdminActive, requirePermission } = require("../../middleware/permissions");
const { REPORT_DEFINITIONS, runReport } = require("../../lib/reportQueries");

const router = express.Router();
router.use(requireAuth, requireRole("admin"), requireAdminActive, loadAdminPermissions);

router.get("/menu", requirePermission("reports.view"), (_req, res) => {
  res.json(REPORT_DEFINITIONS);
});

router.get("/", requirePermission("reports.view"), async (req, res) => {
  const report = (req.query.report || req.query.type || "daily_revenue").toLowerCase();
  const data = await runReport(req.user.company_id, report, req.query);
  res.json(data);
});

module.exports = router;
