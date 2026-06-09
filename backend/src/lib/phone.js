const PHONE_ERROR = "Phone must be exactly 10 digits starting with 0 (e.g. 0912345678)";

/** Digits only from user input — must be 10 digits starting with 0. Returns storage form 251XXXXXXXXX. */
function normalizePhone(input) {
  const d = String(input || "").replace(/\D/g, "");
  if (d.length !== 10 || !d.startsWith("0")) {
    return null;
  }
  return `251${d.slice(1)}`;
}

function validatePhone(input) {
  const d = String(input || "").replace(/\D/g, "");
  if (!d) return { ok: false, detail: "Phone number is required" };
  if (d.length !== 10) return { ok: false, detail: PHONE_ERROR };
  if (!d.startsWith("0")) return { ok: false, detail: PHONE_ERROR };
  return { ok: true, digits: d, storage: `251${d.slice(1)}` };
}

/** Display as 09xx xxx xxx from storage 251... */
function formatPhoneDisplay(storageDigits) {
  if (!storageDigits) return "";
  let d = String(storageDigits).replace(/\D/g, "");
  if (d.startsWith("251") && d.length === 12) {
    const local = `0${d.slice(3)}`;
    return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }
  if (d.length === 10 && d.startsWith("0")) {
    return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  }
  return d;
}

function toLocalPhone(storageDigits) {
  const d = String(storageDigits || "").replace(/\D/g, "");
  if (d.startsWith("251") && d.length === 12) return `0${d.slice(3)}`;
  if (d.length === 10 && d.startsWith("0")) return d;
  return d;
}

module.exports = { normalizePhone, validatePhone, formatPhoneDisplay, toLocalPhone, PHONE_ERROR };
