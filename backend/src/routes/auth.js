const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Company = require("../models/Company");
const Wallet = require("../models/Wallet");
const { signToken, requireAuth } = require("../middleware/auth");
const { enrichAdminPublic } = require("../lib/permissions");
const { findRoleForUser, resolvePortalHome, userHasPortalAccess } = require("../lib/roles");

const router = express.Router();

/** Mobile app — corporate company email + password */
router.post("/mobile/corporate-login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ detail: "Email and password required" });
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ detail: "Invalid credentials" });
  }
  if (user.role !== "corporate") {
    return res.status(403).json({ detail: "Not a corporate account — ask admin for login credentials" });
  }
  if (user.active === false) {
    return res.status(403).json({ detail: "Account disabled — contact bus admin" });
  }
  return res.json({
    access_token: signToken(user),
    user: { ...user.toPublic(), portal_home: "corporate" },
  });
});

/** Mobile app — cashier email + password */
router.post("/mobile/cashier-login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ detail: "Email and password required" });
  }
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ detail: "Invalid credentials" });
  }
  if (user.role === "admin" || user.role === "passenger") {
    return res.status(403).json({ detail: "Use passenger login for customers" });
  }
  const roleDef = await findRoleForUser(user);
  const home = resolvePortalHome(roleDef, user.role);
  if (home !== "qr") {
    return res.status(403).json({ detail: "This account is not a cashier" });
  }
  const publicUser = user.toPublic();
  publicUser.portal_home = "qr";
  return res.json({
    access_token: signToken(user),
    user: publicUser,
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ detail: "Email and password required" });
  }
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ detail: "Invalid credentials" });
  }
  if (user.role === "admin" && user.active === false) {
    return res.status(403).json({ detail: "Admin account is disabled" });
  }
  if (user.role === "corporate") {
    if (user.active === false) {
      return res.status(403).json({ detail: "Account disabled — contact bus admin" });
    }
    const remember = req.body?.remember !== false;
    return res.json({
      access_token: signToken(user, { remember }),
      user: {
        ...user.toPublic(),
        portal_home: "corporate",
        company_name: user.corporate_name || user.name,
      },
    });
  }
  if (user.role !== "admin") {
    const { DEPRECATED_STAFF_ROLE_SLUGS, normSlug } = require("../lib/roles");
    if (DEPRECATED_STAFF_ROLE_SLUGS.includes(normSlug(user.role))) {
      return res.status(403).json({
        detail: "Employer/employee portal removed — use Corporate companies or mobile app",
      });
    }
    const roleDef = await findRoleForUser(user);
    const mobileOnly = roleDef && roleDef.can_use_mobile && !roleDef.can_use_portal;
    if (user.role === "passenger" || mobileOnly) {
      return res.status(403).json({ detail: "Use the mobile app for this account" });
    }
    if (!(await userHasPortalAccess(user))) {
      return res.status(403).json({ detail: "This role cannot sign in to the staff portal" });
    }
  }
  const publicUser = await enrichAdminPublic(user);
  if (user.role !== "admin") {
    const roleDef = await findRoleForUser(user);
    publicUser.portal_home = resolvePortalHome(roleDef, user.role);
  }
  const remember = req.body?.remember !== false;
  return res.json({
    access_token: signToken(user, { remember }),
    user: publicUser,
  });
});

router.post("/refresh", requireAuth, async (req, res) => {
  if (req.user.role === "admin" && req.user.active === false) {
    return res.status(403).json({ detail: "Admin account is disabled" });
  }
  if (req.user.role === "corporate") {
    const remember = req.body?.remember !== false;
    return res.json({ access_token: signToken(req.user, { remember }) });
  }
  if (req.user.role !== "admin") {
    if (!(await userHasPortalAccess(req.user))) {
      return res.status(403).json({ detail: "This role cannot sign in to the staff portal" });
    }
  }
  const remember = req.body?.remember !== false;
  return res.json({ access_token: signToken(req.user, { remember }) });
});

/** Passenger app — phone + OTP (self register / login) */
router.post("/passenger/check-phone", async (req, res) => {
  const { checkPassengerPhone } = require("../lib/passengerAuth");
  const result = await checkPassengerPhone(req.body || {});
  if (!result.ok) return res.status(400).json({ detail: result.detail });
  res.json(result);
});

router.post("/passenger/send-otp", async (req, res) => {
  const { sendPassengerOtp } = require("../lib/passengerAuth");
  const result = await sendPassengerOtp(req.body || {});
  if (!result.ok) return res.status(400).json({ detail: result.detail });
  res.json(result);
});

router.post("/passenger/verify-otp", async (req, res) => {
  const { verifyPassengerOtp } = require("../lib/passengerAuth");
  const result = await verifyPassengerOtp(req.body || {});
  if (!result.ok) return res.status(400).json({ detail: result.detail });
  res.json(result);
});

router.post("/passenger/complete-registration", requireAuth, async (req, res) => {
  const { completePassengerRegistration } = require("../lib/passengerAuth");
  if (req.user.role !== "passenger") {
    return res.status(403).json({ detail: "Passengers only" });
  }
  const result = await completePassengerRegistration(req.user, req.body || {});
  if (!result.ok) return res.status(400).json({ detail: result.detail });
  res.json(result);
});

router.post("/register", async (req, res) => {
  return res.status(403).json({
    detail: "Passengers register in the mobile app with phone + OTP.",
  });
});

router.get("/me", requireAuth, async (req, res) => {
  if (req.user.role === "corporate") {
    const Wallet = require("../models/Wallet");
    const wallet = await Wallet.findOne({ user_id: req.user._id });
    const CorporateEmployee = require("../models/CorporateEmployee");
    const empCount = await CorporateEmployee.countDocuments({ corporate_user_id: req.user._id });
    return res.json({
      ...req.user.toPublic(),
      portal_home: "corporate",
      company_name: req.user.corporate_name || req.user.name,
      wallet_balance_birr: wallet?.balance_birr ?? 0,
      employees_count: empCount,
    });
  }
  if (req.user.role !== "admin" && req.user.role !== "passenger") {
    const roleDef = await findRoleForUser(req.user);
    const home = resolvePortalHome(roleDef, req.user.role);
    const bus = home === "qr" ? await require("../models/Bus").findOne({ cashier_id: req.user._id }) : null;
    return res.json({
      ...req.user.toPublic(),
      portal_home: home,
      assigned_bus: bus ? bus.toPublic() : null,
    });
  }
  if (req.user.role === "passenger") {
    const Wallet = require("../models/Wallet");
    const { formatPhoneDisplay } = require("../lib/phone");
    const wallet = await Wallet.findOne({ user_id: req.user._id });
    const { getCorporateNameForPassenger } = require("../lib/corporateLink");
    const corporate_name = await getCorporateNameForPassenger(req.user);
    return res.json({
      ...req.user.toPublic(),
      phone_display: formatPhoneDisplay(req.user.phone),
      wallet_balance_birr: wallet?.balance_birr ?? 0,
      needs_registration: req.user.profile_complete === false,
      corporate_name,
      pays_via_company: !!req.user.sponsored_by,
    });
  }
  const publicUser = await enrichAdminPublic(req.user);
  if (req.user.role !== "admin") {
    const roleDef = await findRoleForUser(req.user);
    publicUser.portal_home = resolvePortalHome(roleDef, req.user.role);
  }
  res.json(publicUser);
});

module.exports = router;
