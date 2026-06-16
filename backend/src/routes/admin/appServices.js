const express = require("express");
const AppService = require("../../models/AppService");
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

function normalizeUrl(raw) {
  const url = String(raw || "").trim();
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `http://${url}`;
}

router.get("/", requirePermission("appservices.view"), async (req, res) => {
  const list = await AppService.find({ company_id: req.user.company_id }).sort({ sort_order: 1, name: 1 });
  const base = apiBaseUrl(req);
  res.json(list.map((s) => s.toPublic(base)));
});

router.post("/", requirePermission("appservices.add"), async (req, res) => {
  const { name, link_url, active, sort_order, icon_base64 } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ detail: "name required" });
  const link = normalizeUrl(link_url);
  if (!link) return res.status(400).json({ detail: "link_url required" });

  const slug = slugify(name);
  const exists = await AppService.findOne({ company_id: req.user.company_id, slug });
  if (exists) return res.status(400).json({ detail: "Service already exists" });

  let icon_path = "";
  try {
    if (icon_base64) icon_path = saveProviderLogo(icon_base64, `svc-${slug}`) || "";
  } catch (e) {
    return res.status(400).json({ detail: e.message });
  }

  const doc = await AppService.create({
    company_id: req.user.company_id,
    name: name.trim(),
    slug,
    link_url: link,
    icon_path,
    active: active !== false,
    sort_order: Number(sort_order) || 0,
  });

  res.status(201).json(doc.toPublic(apiBaseUrl(req)));
});

router.patch("/:id", requirePermission("appservices.update"), async (req, res) => {
  const doc = await AppService.findOne({ _id: req.params.id, company_id: req.user.company_id });
  if (!doc) return res.status(404).json({ detail: "Not found" });

  const { name, link_url, active, sort_order, icon_base64 } = req.body || {};
  if (name?.trim()) {
    doc.name = name.trim();
    doc.slug = slugify(name);
  }
  if (link_url !== undefined) {
    const link = normalizeUrl(link_url);
    if (!link) return res.status(400).json({ detail: "link_url required" });
    doc.link_url = link;
  }
  if (active !== undefined) doc.active = !!active;
  if (sort_order !== undefined) doc.sort_order = Number(sort_order) || 0;

  if (icon_base64) {
    try {
      const next = saveProviderLogo(icon_base64, `svc-${doc.slug}`);
      if (next) {
        deleteProviderLogo(doc.icon_path);
        doc.icon_path = next;
      }
    } catch (e) {
      return res.status(400).json({ detail: e.message });
    }
  }

  await doc.save();
  res.json(doc.toPublic(apiBaseUrl(req)));
});

router.delete("/:id", requirePermission("appservices.delete"), async (req, res) => {
  const doc = await AppService.findOne({ _id: req.params.id, company_id: req.user.company_id });
  if (!doc) return res.status(404).json({ detail: "Not found" });
  deleteProviderLogo(doc.icon_path);
  await doc.deleteOne();
  res.json({ ok: true });
});

module.exports = router;
