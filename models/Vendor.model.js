const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
  {
    // ── Required at registration ──────────────────────────────────────────────
    storeName: {
      type: String,
      unique: true,
      sparse: true, // allow null until profile is complete
      lowercase: true,
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      select: false,
    },

    // ── Email verification OTP ────────────────────────────────────────────────
    otp: {
      type: String,
      select: false,
    },

    otpExpires: {
      type: Date,
      select: false,
    },

    // ── Registration state machine ────────────────────────────────────────────
    // "pending_verification" → "pending_password" → "pending_approval" → active
    registrationStep: {
      type: String,
      enum: ["pending_verification", "pending_password", "complete"],
      default: "pending_verification",
    },

    // ── Filled in later (profile completion / admin) ──────────────────────────
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
    },
    businessName: { type: String, trim: true },
    businessType: { type: String, trim: true },
    streetAddress: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pinCode: { type: String, trim: true },
    nominateForAwards: { type: Boolean, default: false },
    acceptMessages: { type: Boolean, default: true },
    latitude: { type: Number },
    longitude: { type: Number },

    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REJECTED"],
      default: "PENDING",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Vendor", vendorSchema);
