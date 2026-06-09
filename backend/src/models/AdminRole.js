const mongoose = require("mongoose");

const adminRoleSchema = new mongoose.Schema(
  {
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    label: { type: String, required: true },
    description: { type: String, default: "" },
    permissions: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    is_system: { type: Boolean, default: false },
  },
  { timestamps: true }
);

adminRoleSchema.index({ company_id: 1, slug: 1 }, { unique: true });

adminRoleSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    slug: this.slug,
    label: this.label,
    description: this.description,
    permissions: this.permissions || [],
    active: this.active !== false,
    is_system: this.is_system,
    company_id: this.company_id.toString(),
  };
};

module.exports = mongoose.model("AdminRole", adminRoleSchema);
