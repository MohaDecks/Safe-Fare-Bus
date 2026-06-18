const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Company = require("../models/Company");
const OtpCode = require("../models/OtpCode");
const { normalizePhone, validatePhone, formatPhoneDisplay, PHONE_ERROR } = require("./phone");
const { signToken } = require("../middleware/auth");

const OTP_TTL_MS = 10 * 60 * 1000;

async function defaultCompanyId() {
  const c = await Company.findOne().sort({ createdAt: 1 });
  return c?._id || null;
}

function passengerEmail(phoneDigits) {
  return `p${phoneDigits}@passenger.safefare`;
}

function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

/** Until SMS provider is connected, show OTP in the mobile app */
function shouldShowOtpInApp() {
  return process.env.SMS_ENABLED !== "true";
}

async function findPassengerByPhone(digits, companyId) {
  return User.findOne({ phone: digits, role: "passenger", company_id: companyId });
}

async function checkPassengerPhone({ phone }) {
  const v = validatePhone(phone);
  if (!v.ok) return { ok: false, detail: v.detail };
  const digits = v.storage;
  const companyId = await defaultCompanyId();
  if (!companyId) return { ok: false, detail: "No bus company configured" };
  const user = await findPassengerByPhone(digits, companyId);
  return {
    ok: true,
    phone: digits,
    phone_display: formatPhoneDisplay(digits),
    exists: !!user,
    profile_complete: user ? user.profile_complete !== false : false,
  };
}

async function sendPassengerOtp({ phone }) {
  const v = validatePhone(phone);
  if (!v.ok) return { ok: false, detail: v.detail };
  const digits = v.storage;

  const companyId = await defaultCompanyId();
  if (!companyId) return { ok: false, detail: "No bus company configured. Contact support." };

  const existing = await findPassengerByPhone(digits, companyId);

  const code = generateOtp();
  const expires_at = new Date(Date.now() + OTP_TTL_MS);

  await OtpCode.updateMany({ phone: digits, company_id: companyId, used: false }, { used: true });

  await OtpCode.create({
    phone: digits,
    code,
    company_id: companyId,
    expires_at,
    user_id: existing?._id || null,
  });

  // TODO: when SMS_ENABLED=true, send `code` via SMS provider here
  if (process.env.SMS_ENABLED === "true") {
    // await sendSms(digits, code);
  }

  return {
    ok: true,
    phone: digits,
    phone_display: formatPhoneDisplay(digits),
    expires_in_seconds: Math.floor(OTP_TTL_MS / 1000),
    exists: !!existing,
    is_new: !existing,
    sms_sent: process.env.SMS_ENABLED === "true",
    ...(shouldShowOtpInApp() ? { otp_in_app: code } : {}),
  };
}

async function verifyPassengerOtp({ phone, otp }) {
  const v = validatePhone(phone);
  if (!v.ok) return { ok: false, detail: v.detail };
  const digits = v.storage;
  const code = String(otp || "").trim();
  if (!/^\d{6}$/.test(code)) return { ok: false, detail: "Enter 6-digit OTP" };

  const companyId = await defaultCompanyId();
  if (!companyId) return { ok: false, detail: "No bus company configured" };

  const row = await OtpCode.findOne({
    phone: digits,
    company_id: companyId,
    code,
    used: false,
    expires_at: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!row) return { ok: false, detail: "Invalid or expired OTP" };

  row.used = true;
  await row.save();

  let user = await findPassengerByPhone(digits, companyId);
  let isNew = false;

  if (!user) {
    isNew = true;
    const email = passengerEmail(digits);
    user = await User.create({
      name: "New customer",
      email,
      phone: digits,
      password_hash: await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10),
      role: "passenger",
      company_id: companyId,
      active: true,
      profile_complete: false,
    });
    await Wallet.create({ user_id: user._id, balance_birr: 0 });
  }

  const { linkPassengerToCorporate } = require("./corporateLink");
  user = await linkPassengerToCorporate(user);

  row.user_id = user._id;
  await row.save();

  const wallet = await Wallet.findOne({ user_id: user._id });
  const needsRegistration = user.profile_complete === false;

  return {
    ok: true,
    access_token: signToken(user),
    is_new: isNew,
    needs_registration: needsRegistration,
    user: {
      ...user.toPublic(),
      phone_display: formatPhoneDisplay(digits),
      wallet_balance_birr: wallet?.balance_birr ?? 0,
    },
  };
}

async function completePassengerRegistration(user, { name }) {
  const displayName = (name || "").trim();
  if (!displayName) return { ok: false, detail: "Name required" };

  user.name = displayName;
  user.profile_complete = true;
  await user.save();

  const wallet = await Wallet.findOne({ user_id: user._id });
  return {
    ok: true,
    user: {
      ...user.toPublic(),
      phone_display: formatPhoneDisplay(user.phone),
      wallet_balance_birr: wallet?.balance_birr ?? 0,
    },
  };
}

module.exports = {
  checkPassengerPhone,
  sendPassengerOtp,
  verifyPassengerOtp,
  completePassengerRegistration,
  validatePhone,
  formatPhoneDisplay,
  PHONE_ERROR,
};
