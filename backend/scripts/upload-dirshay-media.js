/**
 * Upload Dirshay logo + service tiles to Cloudinary.
 * Reads CLOUDINARY_* from backend/.env — does not print secrets.
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const fs = require("fs");
const path = require("path");
const { isConfigured, uploadBuffer, deliveryUrl } = require("../src/lib/cloudinary");
const { LOGO_PUBLIC_ID, SERVICE_FILES, servicePublicId } = require("../src/lib/hubMedia");

const ROOT = path.join(__dirname, "../..");
const LOGO = path.join(ROOT, "mobile/assets/images/dirsha_logo.png");
const SVC_DIR = path.join(ROOT, "mobile/assets/images/services");

async function uploadFile(filePath, publicId) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "image/png";
  const url = await uploadBuffer(buf, { publicId, mime });
  return url || deliveryUrl(publicId);
}

async function main() {
  if (!isConfigured()) {
    console.error("Missing CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET in backend/.env");
    process.exit(1);
  }

  const jobs = [{ file: LOGO, publicId: LOGO_PUBLIC_ID }];
  for (const id of Object.keys(SERVICE_FILES)) {
    const file = path.join(SVC_DIR, `${SERVICE_FILES[id]}.png`);
    jobs.push({ file, publicId: servicePublicId(id) });
  }

  let ok = 0;
  for (const job of jobs) {
    if (!fs.existsSync(job.file)) {
      console.error(`skip (missing file): ${job.publicId}`);
      continue;
    }
    try {
      const url = await uploadFile(job.file, job.publicId);
      console.log(`ok ${job.publicId}`);
      if (url) ok += 1;
    } catch (e) {
      console.error(`fail ${job.publicId}: ${e.message}`);
    }
  }
  console.log(`uploaded ${ok}/${jobs.length}`);
  if (ok === 0) process.exit(1);
}

main().catch((e) => {
  console.error(e.message || "upload failed");
  process.exit(1);
});
