const express = require("express");
const router = express.Router();

// ── Single unified controller ─────────────────────────────────────────────────
const {
  // Email-first login/register flow
  checkEmail,
  sendOtp,
  verifyOtp,
  setPassword,
  // Auth
  loginVendor,
  // Vendor self
  getMyVendorProfile,
  updateVendor,
  // Admin CRUD
  createVendor,
  getAllVendors,
  getVendorDetails,
  deleteVendor,
  updateVendorStatus,
  createVendorRegistration,
} = require("../controllers/vender.controller");

const {
  protect,
  admin,
  protectVendor,
  acceptedVendorOnly,
} = require("../middleware/auth.middleware");

/* ================= AUTH — EMAIL-FIRST FLOW ================= */

// Step 1 – check if this email exists in DB
router.post("/check-email", checkEmail);

// Step 2 – send OTP to that email
router.post("/send-otp", sendOtp);

// Step 3 – verify OTP
//   → needsPassword: true  + setupToken  (first-time vendor, create password next)
//   → needsPassword: false + token       (returning vendor, go to dashboard)
router.post("/verify-otp", verifyOtp);

// Step 4 – first-time only: create password (Bearer setupToken required)
//   → token + vendor → redirect to dashboard
router.post("/set-password", setPassword);

// Standard login (email + password, for returning vendors)
router.post("/login", loginVendor);

/* ================= VENDOR PROFILE (self) ================= */

// router.get("/profile/me", protectVendor, getMyVendorProfile);
router.put("/profile/me", protectVendor, acceptedVendorOnly, updateVendor);

/* ================= VENDOR MANAGEMENT (admin) ================= */
router.post("/open", createVendorRegistration);
// router.post("/", protect, admin, createVendor);
router.get("/", getAllVendors);
// router.get("/", protect, admin, getAllVendors);
router.get("/:vendorId", protect, admin, getVendorDetails);
router.put("/:vendorId", protect, admin, updateVendor);
router.delete("/:vendorId", protect, admin, deleteVendor);
router.patch("/:vendorId/status", protect, admin, updateVendorStatus);

module.exports = router;
