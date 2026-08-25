const express = require("express");
const AppService = require("../models/AppService");
const Company = require("../models/Company");
const { apiBaseUrl } = require("../lib/providerLogo");
const { mediaPayload } = require("../lib/hubMedia");

const router = express.Router();

async function resolveCompanyId() {
  const company = await Company.findOne().sort({ createdAt: 1 });
  return company?._id || null;
}

/** Public Cloudinary URLs + marketplace banner (no auth, no secrets). */
router.get("/media", async (req, res) => {
  const payload = mediaPayload();
  const company = await Company.findOne().sort({ createdAt: 1 });
  const { logoUrl } = require("../lib/companyLogo");
  payload.banner_url = logoUrl(company?.hub_banner_path || "", req);
  res.json(payload);
});

/** Active linked services shown on mobile login (no auth). */
router.get("/app-services", async (req, res) => {
  const companyId = await resolveCompanyId();
  if (!companyId) return res.json([]);

  const list = await AppService.find({ company_id: companyId, active: true }).sort({
    sort_order: 1,
    name: 1,
  });
  const base = apiBaseUrl(req);
  res.json(list.map((s) => s.toPublic(base)));
});

module.exports = router;
