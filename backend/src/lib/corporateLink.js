const User = require("../models/User");
const CorporateEmployee = require("../models/CorporateEmployee");

async function linkPassengerToCorporate(passenger) {
  if (!passenger?.phone || passenger.sponsored_by) return passenger;
  const invite = await CorporateEmployee.findOne({ phone: passenger.phone }).sort({ createdAt: -1 });
  if (!invite) return passenger;

  const corporate = await User.findOne({ _id: invite.corporate_user_id, role: "corporate" });
  if (!corporate) return passenger;

  passenger.sponsored_by = corporate._id;
  await passenger.save();
  invite.passenger_user_id = passenger._id;
  if (!invite.name && passenger.name && passenger.name !== "New customer") {
    invite.name = passenger.name;
  }
  await invite.save();
  return passenger;
}

async function getCorporateNameForPassenger(passenger) {
  if (!passenger?.sponsored_by) return null;
  const corp = await User.findById(passenger.sponsored_by).select("corporate_name name");
  return corp?.corporate_name || corp?.name || null;
}

module.exports = { linkPassengerToCorporate, getCorporateNameForPassenger };
