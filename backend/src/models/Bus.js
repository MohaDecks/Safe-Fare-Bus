const mongoose = require("mongoose");

const busSchema = new mongoose.Schema(
  {
    plate: { type: String, required: true },
    route_name: { type: String, required: true },
    fare_birr: { type: Number, required: true },
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    cashier_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

busSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    plate: this.plate,
    route_name: this.route_name,
    fare_birr: this.fare_birr,
    company_id: this.company_id.toString(),
    cashier_id: this.cashier_id ? this.cashier_id.toString() : null,
  };
};

module.exports = mongoose.model("Bus", busSchema);
