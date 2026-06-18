const mongoose = require("mongoose");

const corporateTopUpRequestSchema = new mongoose.Schema(
  {
    corporate_user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    passenger_user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount_birr: { type: Number, required: true },
    note: { type: String, default: "" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    rejection_reason: { type: String, default: "" },
    reviewed_at: { type: Date, default: null },
  },
  { timestamps: true }
);

corporateTopUpRequestSchema.index({ corporate_user_id: 1, status: 1, createdAt: -1 });
corporateTopUpRequestSchema.index({ passenger_user_id: 1, createdAt: -1 });

corporateTopUpRequestSchema.methods.toPublic = function (passenger) {
  const { formatPhoneDisplay } = require("../lib/phone");
  return {
    id: this._id.toString(),
    amount_birr: this.amount_birr,
    note: this.note,
    status: this.status,
    rejection_reason: this.rejection_reason,
    passenger_name: passenger?.name || "",
    passenger_phone: formatPhoneDisplay(passenger?.phone) || passenger?.phone || "",
    reviewed_at: this.reviewed_at,
    created_at: this.createdAt,
  };
};

module.exports = mongoose.model("CorporateTopUpRequest", corporateTopUpRequestSchema);
