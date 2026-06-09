const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const { validatePhone } = require("./phone");

async function createCorporateAccount({ company_name, contact_name, email, password, phone, bus_company_id }) {
  const mail = (email || "").toLowerCase().trim();
  if (!company_name?.trim()) return { ok: false, detail: "Company name required" };
  if (!contact_name?.trim()) return { ok: false, detail: "Contact name required" };
  if (!mail || !password) return { ok: false, detail: "Email and password required" };
  if (password.length < 6) return { ok: false, detail: "Password min 6 characters" };

  const dup = await User.findOne({ email: mail });
  if (dup) return { ok: false, detail: "Email already in use" };

  let phoneDigits = "";
  if (phone) {
    const v = validatePhone(phone);
    if (!v.ok) return { ok: false, detail: v.detail };
    phoneDigits = v.storage;
  }

  const user = await User.create({
    name: contact_name.trim(),
    email: mail,
    password_hash: await bcrypt.hash(password, 10),
    role: "corporate",
    phone: phoneDigits,
    company_id: bus_company_id,
    corporate_name: company_name.trim(),
    profile_complete: true,
    active: true,
  });
  await Wallet.create({ user_id: user._id, balance_birr: 0 });

  return { ok: true, user };
}

module.exports = { createCorporateAccount };
