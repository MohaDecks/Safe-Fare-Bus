const QRCode = require("qrcode");

async function tokenToDataUrl(token) {
  return QRCode.toDataURL(token, {
    width: 280,
    margin: 1,
    color: { dark: "#1e3a8a", light: "#ffffff" },
  });
}

module.exports = { tokenToDataUrl };
