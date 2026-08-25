const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const UPLOAD_DIR = path.join(__dirname, "../../uploads/company");
const MAX_BYTES = 2 * 1024 * 1024;

function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/** Save data URL or raw base64 image; returns Cloudinary URL or /uploads/company/abc.png */
async function saveCompanyLogo(logoBase64, companyId) {
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

  const safe = String(companyId || "company").replace(/[^a-z0-9-]/gi, "").toLowerCase() || "company";
  const { isConfigured, uploadBuffer } = require("./cloudinary");
  if (isConfigured() && mime !== "image/svg+xml") {
    try {
      const url = await uploadBuffer(buf, { publicId: `dirshay/company/${safe}`, mime });
      if (url) return url;
    } catch (_) {}
  }

  const ext =
    mime === "image/jpeg" || mime === "image/jpg"
      ? "jpg"
      : mime === "image/svg+xml"
        ? "svg"
        : mime.split("/")[1].replace("jpeg", "jpg");
  ensureUploadDir();
  const name = `${safe}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
  const filePath = path.join(UPLOAD_DIR, name);
  fs.writeFileSync(filePath, buf);
  return `/uploads/company/${name}`;
}

async function saveHubBanner(bannerBase64) {
  return saveCompanyLogo(bannerBase64, "hub-banner");
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
  const fromEnv = String(process.env.PUBLIC_URL || "").replace(/\/$/, "");
  if (fromEnv) return `${fromEnv}${logoPath}`;
  const host = req?.get?.("host");
  const proto = req?.get?.("x-forwarded-proto") || req?.protocol || "http";
  return host ? `${proto}://${host}${logoPath}` : logoPath;
}

module.exports = { saveCompanyLogo, saveHubBanner, deleteCompanyLogo, logoUrl, UPLOAD_DIR, MAX_BYTES };
