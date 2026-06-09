const mongoose = require("mongoose");

const busTripLegSchema = new mongoose.Schema(
  {
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    bus_id: { type: mongoose.Schema.Types.ObjectId, ref: "Bus", required: true },
    cashier_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    route_name: { type: String, required: true },
    from_stop: { type: String, required: true },
    to_stop: { type: String, required: true },
    direction: { type: String, enum: ["outbound", "return"], required: true },
    status: { type: String, enum: ["active", "completed"], default: "active" },
    started_at: { type: Date, default: Date.now },
    ended_at: { type: Date, default: null },
  },
  { timestamps: true }
);

busTripLegSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    bus_id: this.bus_id.toString(),
    route_name: this.route_name,
    from_stop: this.from_stop,
    to_stop: this.to_stop,
    direction: this.direction,
    status: this.status,
    started_at: this.started_at,
    ended_at: this.ended_at,
    label: `${this.from_stop} → ${this.to_stop}`,
  };
};

module.exports = mongoose.model("BusTripLeg", busTripLegSchema);
