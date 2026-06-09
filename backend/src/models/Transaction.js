const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["topup", "fare", "allocate"], required: true },
    amount_birr: { type: Number, required: true },
    balance_after_birr: { type: Number, required: true },
    description: { type: String, default: "" },
    bus_id: { type: mongoose.Schema.Types.ObjectId, ref: "Bus", default: null },
    qr_session_id: { type: mongoose.Schema.Types.ObjectId, ref: "QrSession", default: null },
    trip_leg_id: { type: mongoose.Schema.Types.ObjectId, ref: "BusTripLeg", default: null },
    paid_by_corporate_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    payment_provider_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentProvider",
      default: null,
    },
  },
  { timestamps: true }
);

transactionSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    type: this.type,
    amount_birr: this.amount_birr,
    balance_after_birr: this.balance_after_birr,
    description: this.description,
    created_at: this.createdAt,
  };
};

module.exports = mongoose.model("Transaction", transactionSchema);
