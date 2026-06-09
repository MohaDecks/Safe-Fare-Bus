const mongoose = require("mongoose");

const menuSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    label: { type: String, required: true },
    parent: { type: String, default: "—" },
    sort_order: { type: Number, default: 0 },
    allow_view: { type: Boolean, default: true },
    allow_add: { type: Boolean, default: false },
    allow_update: { type: Boolean, default: false },
    allow_delete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

menuSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    slug: this.slug,
    menu: this.label,
    parent: this.parent,
    view: this.allow_view,
    add: this.allow_add,
    update: this.allow_update,
    delete: this.allow_delete,
  };
};

module.exports = mongoose.model("Menu", menuSchema);
