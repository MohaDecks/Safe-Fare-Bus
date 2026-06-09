const { v4: uuidv4 } = require("uuid");
const QrSession = require("../models/QrSession");

function newToken() {
  return `SF-${uuidv4().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
}

async function deactivateBusSessions(busId) {
  await QrSession.updateMany({ bus_id: busId, active: true }, { active: false });
}

async function createQrSessionForBus(bus, adminUserId) {
  await deactivateBusSessions(bus._id);
  const session = await QrSession.create({
    company_id: bus.company_id,
    bus_id: bus._id,
    cashier_id: bus.cashier_id,
    token: newToken(),
    fare_birr: bus.fare_birr,
    active: true,
    expires_at: null,
    created_by_admin_id: adminUserId || null,
  });
  return session;
}

module.exports = { newToken, deactivateBusSessions, createQrSessionForBus };
