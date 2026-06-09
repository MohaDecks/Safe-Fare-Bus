const mongoose = require("mongoose");

const paymentProviderSchema = new mongoose.Schema(
  {
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    logo_path: { type: String, default: "" },
    active: { type: Boolean, default: true },
    sort_order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

paymentProviderSchema.index({ company_id: 1, slug: 1 }, { unique: true });

paymentProviderSchema.methods.toPublic = function (baseUrl) {
  let logo_url = "";
  if (this.logo_path) {
    logo_url = this.logo_path.startsWith("http") ? this.logo_path : `${baseUrl}${this.logo_path}`;
  }
  return {
    id: this._id.toString(),
    name: this.name,
    slug: this.slug,
    logo_url,
    active: this.active,
    sort_order: this.sort_order,
  };
};

module.exports = mongoose.model("PaymentProvider", paymentProviderSchema);
