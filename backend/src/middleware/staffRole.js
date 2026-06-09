const { findRoleForUser, resolvePortalHome, userHasPortalAccess, userHasMobileAccess } = require("../lib/roles");

function requirePortalHome(...homes) {
  return async (req, res, next) => {
    if (!(await userHasPortalAccess(req.user))) {
      return res.status(403).json({ detail: "No staff portal access for this role" });
    }
    const def = await findRoleForUser(req.user);
    const home = resolvePortalHome(def, req.user.role);
    if (!homes.includes(home)) {
      return res.status(403).json({ detail: "Forbidden" });
    }
    req.staffRole = def;
    next();
  };
}

async function requireMobileApp(req, res, next) {
  if (req.user.role === "passenger" || req.user.role === "corporate") return next();
  if (!(await userHasMobileAccess(req.user))) {
    return res.status(403).json({ detail: "Mobile app not allowed for this role" });
  }
  next();
}

/** Cashier / QR collector — portal or mobile app */
async function requireCashierRole(req, res, next) {
  if (req.user.role === "passenger" || req.user.role === "admin") {
    return res.status(403).json({ detail: "Cashier role required" });
  }
  const def = await findRoleForUser(req.user);
  const home = resolvePortalHome(def, req.user.role);
  if (home !== "qr") {
    return res.status(403).json({ detail: "Cashier role required" });
  }
  req.staffRole = def;
  next();
}

module.exports = { requirePortalHome, requireMobileApp, requireCashierRole };
