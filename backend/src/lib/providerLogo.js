const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const UPLOAD_DIR = path.join(__dirname, "../../uploads/providers");
const MAX_BYTES = 600 * 1024;

function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/** Save data URL or raw base64 image; returns Cloudinary URL or /uploads/providers/abc.png */
async function saveProviderLogo(logoBase64, slug) {
  if (!logoBase64 || typeof logoBase64 !== "string") return null;

  let mime = "image/png";
  let data = logoBase64.trim();
  const match = data.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (match) {
    mime = match[1].toLowerCase();
    data = match[2];
  }

  const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
  if (!allowed.includes(mime)) {
    throw new Error("Logo must be PNG, JPEG, WebP, or GIF");
  }

  const buf = Buffer.from(data, "base64");
  if (buf.length > MAX_BYTES) throw new Error("Logo file too large (max 600KB)");

  const safe = (slug || "provider").replace(/[^a-z0-9-]/gi, "").toLowerCase() || "provider";
  const { isConfigured, uploadBuffer } = require("./cloudinary");
  if (isConfigured()) {
    try {
      const url = await uploadBuffer(buf, { publicId: `dirshay/providers/${safe}`, mime });
      if (url) return url;
    } catch (_) {}
  }

  const ext = mime === "image/jpeg" || mime === "image/jpg" ? "jpg" : mime.split("/")[1].replace("jpeg", "jpg");
  ensureUploadDir();
  const name = `${safe}-${crypto.randomBytes(4).toString("hex")}.${ext === "jpg" ? "jpg" : ext}`;
  const filePath = path.join(UPLOAD_DIR, name);
  fs.writeFileSync(filePath, buf);
  return `/uploads/providers/${name}`;
}

function deleteProviderLogo(logoPath) {
  if (!logoPath || !logoPath.startsWith("/uploads/providers/")) return;
  const file = path.join(__dirname, "../..", logoPath);
  try {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  } catch (_) {}
}

function apiBaseUrl(req) {
  const host = req.get("host");
  const proto = req.protocol || "http";
  return `${proto}://${host}`;
}

module.exports = { saveProviderLogo, deleteProviderLogo, apiBaseUrl, UPLOAD_DIR };
