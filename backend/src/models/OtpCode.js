const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    code: { type: String, required: true },
    name: { type: String, default: "" },
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    expires_at: { type: Date, required: true },
    used: { type: Boolean, default: false },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

otpSchema.index({ phone: 1, company_id: 1, createdAt: -1 });

otpSchema.methods.toAdmin = function () {
  return {
    id: this._id.toString(),
    phone: this.phone,
    code: this.code,
    name: this.name,
    used: this.used,
    expires_at: this.expires_at,
    created_at: this.createdAt,
  };
};

module.exports = mongoose.model("OtpCode", otpSchema);
