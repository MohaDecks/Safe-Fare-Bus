const mongoose = require("mongoose");

const appServiceSchema = new mongoose.Schema(
  {
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    link_url: { type: String, required: true, trim: true },
    icon_path: { type: String, default: "" },
    /** `service` = Our Services grid; `mini_app` = New Mini Apps section */
    placement: { type: String, enum: ["service", "mini_app"], default: "service" },
    active: { type: Boolean, default: true },
    sort_order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

appServiceSchema.index({ company_id: 1, slug: 1 }, { unique: true });

appServiceSchema.methods.toPublic = function (baseUrl) {
  let icon_url = "";
  if (this.icon_path) {
    icon_url = this.icon_path.startsWith("http") ? this.icon_path : `${baseUrl}${this.icon_path}`;
  }
  return {
    id: this._id.toString(),
    name: this.name,
    slug: this.slug,
    link_url: this.link_url,
    icon_url,
    placement: this.placement === "mini_app" ? "mini_app" : "service",
    active: this.active,
    sort_order: this.sort_order,
  };
};

module.exports = mongoose.model("AppService", appServiceSchema);
