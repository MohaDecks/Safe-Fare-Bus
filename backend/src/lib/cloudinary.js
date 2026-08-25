function fromUrl() {
  const raw = String(process.env.CLOUDINARY_URL || "").trim();
  const m = raw.match(/^cloudinary:\/\/([^:]+):([^@]+)@([^/]+)/i);
  if (!m) return null;
  return {
    apiKey: decodeURIComponent(m[1]),
    apiSecret: decodeURIComponent(m[2]),
    cloudName: m[3],
  };
}

function cloudName() {
  return String(process.env.CLOUDINARY_CLOUD_NAME || fromUrl()?.cloudName || "").trim();
}

function apiKey() {
  return String(process.env.CLOUDINARY_API_KEY || fromUrl()?.apiKey || "").trim();
}

function apiSecret() {
  return String(process.env.CLOUDINARY_API_SECRET || fromUrl()?.apiSecret || "").trim();
}

function isConfigured() {
  return Boolean(cloudName() && apiKey() && apiSecret());
}

/** Public delivery URL — no secret required. */
function deliveryUrl(publicId, { width } = {}) {
  const cloud = cloudName();
  const id = String(publicId || "").replace(/^\/+|\/+$/g, "");
  if (!cloud || !id) return "";
  const t = ["f_auto", "q_auto"];
  if (width) t.push(`c_limit,w_${Number(width)}`);
  return `https://res.cloudinary.com/${cloud}/image/upload/${t.join(",")}/${id}`;
}

/**
 * Authenticated upload. Returns https URL or throws a short error (never logs secrets).
 */
async function uploadBuffer(buffer, { publicId, mime = "image/png" } = {}) {
  if (!isConfigured()) return null;
  const id = String(publicId || "").replace(/^\/+|\/+$/g, "");
  if (!id || !buffer?.length) return null;

  const form = new FormData();
  form.append("file", `data:${mime};base64,${Buffer.from(buffer).toString("base64")}`);
  form.append("public_id", id);
  form.append("overwrite", "true");
  form.append("invalidate", "true");

  const auth = Buffer.from(`${apiKey()}:${apiSecret()}`).toString("base64");
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName()}/image/upload`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}` },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json.error?.message || `Cloudinary upload failed (${res.status})`;
    throw new Error(msg);
  }
  return json.secure_url || deliveryUrl(id);
}

module.exports = { cloudName, isConfigured, deliveryUrl, uploadBuffer };
