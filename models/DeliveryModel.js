const mongoose = require("mongoose");

const deliveryPartnerSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },

    name: String,
    phone: { type: String, required: true },
    email: String,

    docs: {
      aadhar: String,
      pan: String,
      drivingLicense: String,
    },

    vehicleType: String,
    vehicleNumber: String,

    isActive: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true },

    currentLocation: {
      lat: Number,
      lng: Number,
      updatedAt: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DeliveryPartner", deliveryPartnerSchema);
