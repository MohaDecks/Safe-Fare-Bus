const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    admin_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    logo_path: { type: String, default: "" },
    hub_banner_path: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Company", companySchema);
