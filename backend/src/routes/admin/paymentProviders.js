const express = require("express");
const PaymentProvider = require("../../models/PaymentProvider");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { loadAdminPermissions, requireAdminActive, requirePermission } = require("../../middleware/permissions");
const { saveProviderLogo, deleteProviderLogo, apiBaseUrl } = require("../../lib/providerLogo");

const router = express.Router();
router.use(requireAuth, requireRole("admin"), requireAdminActive, loadAdminPermissions);

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

router.get("/", requirePermission("topup.view"), async (req, res) => {
  const list = await PaymentProvider.find({ company_id: req.user.company_id }).sort({ sort_order: 1, name: 1 });
  const base = apiBaseUrl(req);
  res.json(list.map((p) => p.toPublic(base)));
});

router.post("/", requirePermission("topup.add"), async (req, res) => {
  const { name, active, sort_order, logo_base64 } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ detail: "name required" });

  const slug = slugify(name);
  const exists = await PaymentProvider.findOne({ company_id: req.user.company_id, slug });
  if (exists) return res.status(400).json({ detail: "Provider already exists" });

  let logo_path = "";
  try {
    if (logo_base64) logo_path = (await saveProviderLogo(logo_base64, slug)) || "";
  } catch (e) {
    return res.status(400).json({ detail: e.message });
  }

  const doc = await PaymentProvider.create({
    company_id: req.user.company_id,
    name: name.trim(),
    slug,
    logo_path,
    active: active !== false,
    sort_order: Number(sort_order) || 0,
  });

  res.status(201).json(doc.toPublic(apiBaseUrl(req)));
});

router.patch("/:id", requirePermission("topup.update"), async (req, res) => {
  const doc = await PaymentProvider.findOne({ _id: req.params.id, company_id: req.user.company_id });
  if (!doc) return res.status(404).json({ detail: "Not found" });

  const { name, active, sort_order, logo_base64 } = req.body || {};
  if (name?.trim()) {
    doc.name = name.trim();
    doc.slug = slugify(name);
  }
  if (active !== undefined) doc.active = !!active;
  if (sort_order !== undefined) doc.sort_order = Number(sort_order) || 0;

  if (logo_base64) {
    try {
      const next = await saveProviderLogo(logo_base64, doc.slug);
      if (next) {
        deleteProviderLogo(doc.logo_path);
        doc.logo_path = next;
      }
    } catch (e) {
      return res.status(400).json({ detail: e.message });
    }
  }

  await doc.save();
  res.json(doc.toPublic(apiBaseUrl(req)));
});

router.delete("/:id", requirePermission("topup.delete"), async (req, res) => {
  const doc = await PaymentProvider.findOne({ _id: req.params.id, company_id: req.user.company_id });
  if (!doc) return res.status(404).json({ detail: "Not found" });
  deleteProviderLogo(doc.logo_path);
  await doc.deleteOne();
  res.json({ ok: true });
});

module.exports = router;
