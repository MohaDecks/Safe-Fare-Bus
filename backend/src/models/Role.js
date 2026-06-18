const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
    slug: { type: String, required: true, lowercase: true, trim: true },
    label: { type: String, required: true },
    description: { type: String, default: "" },
    can_use_portal: { type: Boolean, default: false },
    can_use_mobile: { type: Boolean, default: false },
    /** Portal landing: qr (cashier), dashboard, none */
    portal_home: { type: String, enum: ["qr", "dashboard", "none"], default: "dashboard" },
    is_system: { type: Boolean, default: false },
    sort_order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

roleSchema.index({ company_id: 1, slug: 1 }, { unique: true });

roleSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    slug: this.slug,
    label: this.label,
    description: this.description,
    can_use_portal: this.can_use_portal,
    can_use_mobile: this.can_use_mobile,
    portal_home: this.portal_home || "dashboard",
    is_system: this.is_system,
    company_id: this.company_id ? this.company_id.toString() : null,
  };
};

module.exports = mongoose.model("Role", roleSchema);
