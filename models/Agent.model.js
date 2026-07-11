const mongoose = require("mongoose");

const AgentOtpSchema = new mongoose.Schema({
  phone: String,
  otp: String,
  expiresAt: Date,
  createdAt: { type: Date, default: Date.now },
});

AgentOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("AgentOtp", AgentOtpSchema);
