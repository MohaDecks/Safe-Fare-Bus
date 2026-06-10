const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const UPLOAD_DIR = path.join(__dirname, "../../uploads/company");
const MAX_BYTES = 2 * 1024 * 1024;

function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/** Save data URL or raw base64 image; returns path like /uploads/company/abc.png */
function saveCompanyLogo(logoBase64, companyId) {
  if (!logoBase64 || typeof logoBase64 !== "string") return null;

  let mime = "image/png";
  let data = logoBase64.trim();
  const match = data.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (match) {
    mime = match[1].toLowerCase();
    data = match[2];
  }

  const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "image/svg+xml"];
  if (!allowed.includes(mime)) {
    throw new Error("Logo must be PNG, JPEG, WebP, GIF, or SVG");
  }

  const buf = Buffer.from(data, "base64");
  if (buf.length > MAX_BYTES) throw new Error("Logo file too large (max 2MB)");

  const ext =
    mime === "image/jpeg" || mime === "image/jpg"
      ? "jpg"
      : mime === "image/svg+xml"
        ? "svg"
        : mime.split("/")[1].replace("jpeg", "jpg");
  ensureUploadDir();
  const safe = String(companyId || "company").replace(/[^a-z0-9-]/gi, "").toLowerCase() || "company";
  const name = `${safe}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
  const filePath = path.join(UPLOAD_DIR, name);
  fs.writeFileSync(filePath, buf);
  return `/uploads/company/${name}`;
}

function deleteCompanyLogo(logoPath) {
  if (!logoPath || !logoPath.startsWith("/uploads/company/")) return;
  const file = path.join(__dirname, "../..", logoPath);
  try {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  } catch (_) {}
}

function logoUrl(logoPath, req) {
  if (!logoPath) return "";
  if (logoPath.startsWith("http")) return logoPath;
  const host = req?.get?.("host");
  const proto = req?.protocol || "http";
  return host ? `${proto}://${host}${logoPath}` : logoPath;
}

module.exports = { saveCompanyLogo, deleteCompanyLogo, logoUrl, UPLOAD_DIR, MAX_BYTES };
