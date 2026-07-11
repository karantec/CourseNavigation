require("dotenv").config();
const Razorpay = require("razorpay");

// ✅ Validate env variables
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error(
    "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required in environment variables",
  );
}

// ✅ Create instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET, // ✅ FIXED NAME
});

// ✅ Export once
module.exports = razorpay;
