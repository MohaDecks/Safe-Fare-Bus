/** Split "Bole - Magaalaya" into two stops */
function parseRouteName(routeName) {
  const raw = String(routeName || "").trim();
  const parts = raw.split(/\s*[-–—]\s*/);
  if (parts.length >= 2) {
    return { from: parts[0].trim(), to: parts.slice(1).join(" - ").trim() };
  }
  return { from: raw || "Start", to: raw || "End" };
}

module.exports = { parseRouteName };
