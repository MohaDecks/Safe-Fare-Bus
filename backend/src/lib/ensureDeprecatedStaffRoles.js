const Role = require("../models/Role");
const { DEPRECATED_STAFF_ROLE_SLUGS } = require("./roles");

/** Disable legacy employer/employee staff roles — corporate portal replaces them */
async function ensureDeprecatedStaffRolesRemoved() {
  const slugResult = await Role.updateMany(
    { slug: { $in: DEPRECATED_STAFF_ROLE_SLUGS } },
    { $set: { can_use_portal: false, can_use_mobile: false, portal_home: "none" } }
  );
  const homeResult = await Role.updateMany(
    { portal_home: "employer" },
    { $set: { portal_home: "none", can_use_portal: false } }
  );
  const total = slugResult.modifiedCount + homeResult.modifiedCount;
  if (total > 0) {
    console.log(`  Disabled ${total} legacy employer/employee role(s)`);
  }
}

module.exports = { ensureDeprecatedStaffRolesRemoved };
