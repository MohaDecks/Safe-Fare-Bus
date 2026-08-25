const { cloudName, deliveryUrl } = require("./cloudinary");

/** Hub tile id → Cloudinary public_id file name (under dirshay/services/). */
const SERVICE_FILES = {
  bus: "bus",
  parking: "parking",
  cars: "car",
  parts: "parts",
  house: "house",
  flights: "flight",
  tv: "tv",
  fridge: "fridge",
  cooker: "cooker",
  electricals: "electrical",
  furniture: "furniture",
  appliances: "appliances",
  electronics: "electronics",
  jobs: "jobs",
  more: "more",
};

const LOGO_PUBLIC_ID = "dirshay/logo";

function servicePublicId(id) {
  const file = SERVICE_FILES[id];
  return file ? `dirshay/services/${file}` : "";
}

function logoUrl() {
  return deliveryUrl(LOGO_PUBLIC_ID, { width: 512 });
}

function mediaPayload() {
  if (!cloudName()) {
    return { logo_url: "", services: {} };
  }
  const services = {};
  for (const id of Object.keys(SERVICE_FILES)) {
    services[id] = deliveryUrl(servicePublicId(id), { width: 256 });
  }
  return { logo_url: logoUrl(), services };
}

module.exports = { SERVICE_FILES, LOGO_PUBLIC_ID, servicePublicId, logoUrl, mediaPayload };
