/**
 * Move existing /uploads provider + service icons onto Cloudinary
 * and save the https URLs in MongoDB.
 *
 * Run on the server (files live there):
 *   cd backend && node scripts/migrate-icons-to-cloudinary.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { isConfigured, uploadBuffer } = require("../src/lib/cloudinary");
const AppService = require("../src/models/AppService");
const PaymentProvider = require("../src/models/PaymentProvider");

function mimeFrom(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/png";
}

function localFile(relPath) {
  if (!relPath || String(relPath).startsWith("http")) return null;
  return path.join(__dirname, "..", relPath);
}

async function migrate(doc, field, folder) {
  const current = doc[field] || "";
  const label = doc.slug || doc.name || doc._id.toString();
  if (!current) {
    console.log(`skip ${label}: empty`);
    return false;
  }
  if (String(current).startsWith("http")) {
    console.log(`skip ${label}: already remote`);
    return false;
  }
  const file = localFile(current);
  if (!file || !fs.existsSync(file)) {
    console.error(`fail ${label}: missing ${current}`);
    return false;
  }
  const publicId = `${folder}/${String(doc.slug || label).replace(/[^a-z0-9-]/gi, "").toLowerCase()}`;
  const url = await uploadBuffer(fs.readFileSync(file), { publicId, mime: mimeFrom(file) });
  if (!url) throw new Error("upload returned empty url");
  doc[field] = url;
  await doc.save();
  console.log(`ok ${label}`);
  return true;
}

async function main() {
  if (!isConfigured()) {
    console.error("Missing CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET in backend/.env");
    process.exit(1);
  }
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/safefare";
  await mongoose.connect(uri);

  let ok = 0;
  const services = await AppService.find();
  for (const doc of services) {
    try {
      if (await migrate(doc, "icon_path", "dirshay/services")) ok += 1;
    } catch (e) {
      console.error(`fail ${doc.slug}: ${e.message}`);
    }
  }

  const providers = await PaymentProvider.find();
  for (const doc of providers) {
    try {
      if (await migrate(doc, "logo_path", "dirshay/providers")) ok += 1;
    } catch (e) {
      console.error(`fail ${doc.slug}: ${e.message}`);
    }
  }

  console.log(`updated ${ok} documents`);
  await mongoose.disconnect();
  if (ok === 0 && services.length) process.exit(1);
}

main().catch((e) => {
  console.error(e.message || "migrate failed");
  process.exit(1);
});
