const mongoose = require("mongoose");

const qrSessionSchema = new mongoose.Schema(
  {
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    bus_id: { type: mongoose.Schema.Types.ObjectId, ref: "Bus", required: true },
    cashier_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    created_by_admin_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    token: { type: String, required: true, unique: true },
    fare_birr: { type: Number, required: true },
    active: { type: Boolean, default: true },
    /** null = valid until admin generates a new QR or deletes this one */
    expires_at: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("QrSession", qrSessionSchema);
