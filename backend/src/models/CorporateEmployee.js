const mongoose = require("mongoose");

const corporateEmployeeSchema = new mongoose.Schema(
  {
    corporate_user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    phone: { type: String, required: true },
    name: { type: String, default: "" },
    passenger_user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

corporateEmployeeSchema.index({ corporate_user_id: 1, phone: 1 }, { unique: true });

corporateEmployeeSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    phone: this.phone,
    name: this.name,
    passenger_user_id: this.passenger_user_id ? this.passenger_user_id.toString() : null,
    registered: !!this.passenger_user_id,
    created_at: this.createdAt,
  };
};

module.exports = mongoose.model("CorporateEmployee", corporateEmployeeSchema);
