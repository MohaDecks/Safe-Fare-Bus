const Company = require("../models/Company");
const User = require("../models/User");
const AdminRole = require("../models/AdminRole");
const { ensureDefaultAdminRoles } = require("./ensureAdminRoles");

async function ensureCompany() {
  let company = await Company.findOne().sort({ createdAt: 1 });

  if (!company) {
    const superAdmin = await User.findOne({ role: "admin", is_super_admin: true });
    const name = process.env.DEFAULT_COMPANY_NAME || "Dirshay Bus";
    company = await Company.create({
      name,
      admin_id: superAdmin?._id || null,
    });
    console.log(`  Created bus company: ${company.name}`);
  }

  const linked = await User.updateMany(
    { role: "admin", $or: [{ company_id: null }, { company_id: { $exists: false } }] },
    { $set: { company_id: company._id } }
  );
  if (linked.modifiedCount > 0) {
    console.log(`  Linked ${linked.modifiedCount} admin(s) to company`);
  }

  if (!company.admin_id) {
    const superAdmin = await User.findOne({
      role: "admin",
      is_super_admin: true,
      company_id: company._id,
    });
    if (superAdmin) {
      company.admin_id = superAdmin._id;
      await company.save();
    }
  }

  const roleCount = await AdminRole.countDocuments({ company_id: company._id });
  if (roleCount === 0) {
    await ensureDefaultAdminRoles(company._id);
    console.log("  Default admin roles created");
  }

  return company;
}

module.exports = { ensureCompany };
