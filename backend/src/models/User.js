const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password_hash: { type: String, required: true },
    role: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: "" },
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
    /** Portal admin only — full access */
    is_super_admin: { type: Boolean, default: false },
    admin_role_id: { type: mongoose.Schema.Types.ObjectId, ref: "AdminRole", default: null },
    active: { type: Boolean, default: true },
    /** Passenger app — false until name + email submitted after first OTP */
    profile_complete: { type: Boolean, default: true },
    /** Corporate account — company display name */
    corporate_name: { type: String, default: "" },
    /** Passenger sponsored by corporate employer (fare from company wallet) */
    sponsored_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

userSchema.pre("save", function () {
  if (this.role) this.role = String(this.role).toLowerCase().trim();
});

userSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone,
    company_id: this.company_id ? this.company_id.toString() : null,
    is_super_admin: !!this.is_super_admin,
    admin_role_id: this.admin_role_id ? this.admin_role_id.toString() : null,
    active: this.active !== false,
    profile_complete: this.profile_complete !== false,
    corporate_name: this.corporate_name || "",
    sponsored_by: this.sponsored_by ? this.sponsored_by.toString() : null,
    created_at: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);
