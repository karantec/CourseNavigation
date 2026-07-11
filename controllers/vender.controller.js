// controllers/vender.controller.js
// ─────────────────────────────────────────────────────────────────────────────
//  SINGLE LOGIN PAGE FLOW:
//  1. POST /vendor/check-email   → is this email in DB?
//  2. POST /vendor/send-otp      → send OTP to that email
//  3. POST /vendor/verify-otp    → verify OTP
//       → { needsPassword: true,  setupToken }  (first time)
//       → { needsPassword: false, token, vendor } (returning)
//  4. POST /vendor/set-password  → create password (first time, uses setupToken)
//       → { token, vendor }  → redirect to dashboard
//
//  NORMAL LOGIN (returning vendors who already have a password):
//  POST /vendor/login  → email + password → token
//
//  ADMIN:
//  POST   /vendor/             createVendor
//  GET    /vendor/             getAllVendors
//  GET    /vendor/:vendorId    getVendorDetails
//  PUT    /vendor/:vendorId    updateVendor
//  DELETE /vendor/:vendorId    deleteVendor
//  PATCH  /vendor/:vendorId/status  updateVendorStatus
//
//  VENDOR SELF:
//  GET /vendor/profile/me   getMyVendorProfile
//  PUT /vendor/profile/me   updateVendor
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const SMSService = require("../services/smsService");
const Vendor = require("../models/Vendor.model");

// const { sendOtpEmail } = require("../utils/sendEmail.util");

// ─── helpers ──────────────────────────────────────────────────────────────────
const OTP_EXPIRY_MIN = 10;
const OTP_LENGTH = 6;

const generateOtp = () =>
  crypto.randomInt(10 ** (OTP_LENGTH - 1), 10 ** OTP_LENGTH).toString();

const generateToken = (id, expiresIn) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: expiresIn || process.env.JWT_EXPIRES_IN || "7d",
  });

// ═════════════════════════════════════════════════════════════════════════════
// 1. CHECK EMAIL — does this vendor exist in DB?
// POST /api/vendor/check-email
// body: { email }
// ═════════════════════════════════════════════════════════════════════════════
exports.checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const vendor = await Vendor.findOne({ email: email.toLowerCase().trim() });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message:
          "No vendor account found with this email. Please contact admin.",
      });
    }

    res.json({ success: true, exists: true });
  } catch (err) {
    console.error("checkEmail Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. SEND OTP — vendor confirmed in DB, now send OTP
// POST /api/vendor/send-otp
// body: { email }
// ═════════════════════════════════════════════════════════════════════════════

// 1. SEND OTP (With Existence Check)
exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone)
      return res
        .status(400)
        .json({ success: false, message: "Phone is required" });

    // Format the number to match DB storage (10 digits)
    const normalizedPhone = SMSService.formatPhoneNumber(phone);

    // 🔍 THE CHECK: Does this vendor exist?
    const vendor = await Vendor.findOne({ phone: normalizedPhone });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message:
          "This phone number is not registered as a vendor. Please contact admin.",
      });
    }

    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 3 * 60 * 1000);

    // Send via your SMS provider
    const smsResult = await SMSService.sendOTP(normalizedPhone, otp);
    if (!smsResult.success) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to deliver SMS" });
    }

    vendor.otp = otp;
    vendor.otpExpires = otpExpires;
    vendor.isPhoneVerified = false;
    await vendor.save();

    res.json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
// ═════════════════════════════════════════════════════════════════════════════
// 3. VERIFY OTP
// POST /api/vendor/verify-otp
// body: { email, otp }
//
// Two possible responses:
//   A) needsPassword: true  → first-time vendor, must create password
//      { success, needsPassword: true, setupToken }
//   B) needsPassword: false → returning vendor, logged in directly
//      { success, needsPassword: false, token, vendor }
// ═════════════════════════════════════════════════════════════════════════════
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Phone and OTP are required" });
    }

    const normalizedPhone = SMSService.formatPhoneNumber(phone);
    const vendor = await Vendor.findOne({ phone: normalizedPhone }).select(
      "+otp +otpExpires +password",
    );

    if (!vendor) {
      return res
        .status(400)
        .json({ success: false, message: "No pending verification found" });
    }

    if (!vendor.otp || !vendor.otpExpires) {
      return res
        .status(400)
        .json({ success: false, message: "Please request a new OTP" });
    }
    if (new Date() > vendor.otpExpires) {
      return res
        .status(400)
        .json({ success: false, message: "OTP has expired" });
    }
    if (vendor.otp !== otp.trim()) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // Clear OTP
    vendor.isPhoneVerified = true;
    vendor.otp = undefined;
    vendor.otpExpires = undefined;
    await vendor.save();

    // Check rejected status
    if (vendor.status === "REJECTED") {
      return res.status(403).json({
        success: false,
        message: "Your account has been rejected. Please contact support.",
      });
    }

    // ✅ Always return token directly — no password setup needed
    const token = generateToken(vendor._id);
    return res.json({
      success: true,
      token,
      vendor: {
        _id: vendor._id,
        businessName: vendor.businessName,
        phone: vendor.phone,
        status: vendor.status,
      },
    });
  } catch (err) {
    console.error("verifyOtp Error:", err);
    res.status(500).json({ success: false, message: "Verification failed" });
  }
};
// ═════════════════════════════════════════════════════════════════════════════
// 4. SET PASSWORD — first-time only, requires setupToken in header
// POST /api/vendor/set-password
// headers: Authorization: Bearer <setupToken>
// body:    { password, confirmPassword }
// → logs vendor in and returns full JWT + vendor obj
// ═════════════════════════════════════════════════════════════════════════════
// ═════════════════════════════════════════════════════════════════════════════
// 4. SET PASSWORD — first-time only (AUTO LOGIN AFTER SET)
// POST /api/vendor/set-password
// headers: Authorization: Bearer <setupToken>
// body:    { password, confirmPassword }
// ═════════════════════════════════════════════════════════════════════════════
exports.setPassword = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const setupToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!setupToken) {
      return res
        .status(401)
        .json({ success: false, message: "Setup token required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(setupToken, process.env.JWT_SECRET);
    } catch {
      return res
        .status(401)
        .json({ success: false, message: "Setup token is invalid or expired" });
    }

    const vendor = await Vendor.findById(decoded.id).select("+password");

    if (!vendor || !vendor.isEmailVerified) {
      return res
        .status(400)
        .json({ success: false, message: "Email not verified" });
    }

    if (vendor.password) {
      return res.status(400).json({
        success: false,
        message: "Password already set. Please sign in normally.",
      });
    }

    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password and confirm password are required",
      });
    }

    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Passwords do not match" });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // 🔐 Hash password
    const salt = await bcrypt.genSalt(10);
    vendor.password = await bcrypt.hash(password, salt);

    await vendor.save();

    // ✅ AUTO LOGIN AFTER PASSWORD CREATION
    const token = generateToken(vendor._id);

    res.json({
      success: true,
      message: "Password created successfully",
      token,
      vendor: {
        _id: vendor._id,
        storeName: vendor.storeName,
        email: vendor.email,
        status: vendor.status,
      },
    });
  } catch (err) {
    console.error("setPassword Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to set password",
    });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// LOGIN — standard email + password (returning vendors)
// POST /api/vendor/login
// body: { email, password }
// ═════════════════════════════════════════════════════════════════════════════
exports.loginVendor = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Please provide email and password" });
    }

    const vendor = await Vendor.findOne({
      email: email.toLowerCase().trim(),
    }).select("+password");

    if (!vendor || !vendor.password) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, vendor.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    if (vendor.status === "REJECTED") {
      return res.status(403).json({
        success: false,
        message: "Your account has been rejected. Please contact support.",
      });
    }

    const token = generateToken(vendor._id);

    res.json({
      success: true,
      message: "Login successful",
      token,
      vendor: {
        _id: vendor._id,
        storeName: vendor.storeName,
        email: vendor.email,
        status: vendor.status,
      },
    });
  } catch (err) {
    console.error("loginVendor Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error while logging in" });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// GET MY PROFILE (vendor self)
// GET /api/vendor/profile/me
// ═════════════════════════════════════════════════════════════════════════════
exports.getMyVendorProfile = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.vendor._id);
    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }
    res.json({ success: true, vendor });
  } catch (err) {
    console.error("getMyVendorProfile Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error while fetching profile" });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// CREATE VENDOR (admin manually adds a vendor record)
// POST /api/vendor/
// ═════════════════════════════════════════════════════════════════════════════
exports.createVendorRegistration = async (req, res) => {
  try {
    let {
      storeName,
      email,
      password,
      firstName,
      lastName,
      phone,
      businessName,
      businessType,
      streetAddress,
      city,
      state,
      pinCode,
      nominateForAwards,
      acceptMessages,
      latitude,
      longitude,
      registrationStep,
      status,
    } = req.body;

    // ─────────────────────────────────────────
    // Validate required email
    // ─────────────────────────────────────────
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    email = email.toLowerCase().trim();

    // ─────────────────────────────────────────
    // Check duplicate email
    // ─────────────────────────────────────────
    const emailExists = await Vendor.findOne({ email });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "A vendor with this email already exists",
      });
    }

    // ─────────────────────────────────────────
    // Check duplicate storeName (if provided)
    // ─────────────────────────────────────────
    if (storeName) {
      storeName = storeName.toLowerCase().trim();

      const storeExists = await Vendor.findOne({ storeName });
      if (storeExists) {
        return res.status(400).json({
          success: false,
          message: "This store name is already taken",
        });
      }
    }

    // ─────────────────────────────────────────
    // Hash password (if provided)
    // ─────────────────────────────────────────
    let hashedPassword;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    // ─────────────────────────────────────────
    // Create vendor object safely
    // ─────────────────────────────────────────
    const vendorData = {
      storeName,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      businessName,
      businessType,
      streetAddress,
      city,
      state,
      pinCode,
      nominateForAwards,
      acceptMessages,
      latitude,
      longitude,
      registrationStep: registrationStep || "pending_verification",
      status: status || "PENDING",
    };

    // Remove undefined fields
    Object.keys(vendorData).forEach(
      (key) => vendorData[key] === undefined && delete vendorData[key],
    );

    const vendor = await Vendor.create(vendorData);

    res.status(201).json({
      success: true,
      message: "Vendor created successfully",
      vendor,
    });
  } catch (err) {
    console.error("createVendor Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while creating vendor",
    });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// GET ALL VENDORS (admin)
// GET /api/vendor/
// ═════════════════════════════════════════════════════════════════════════════
exports.getAllVendors = async (req, res) => {
  try {
    const { status, page = 1, limit = 100 } = req.query;
    const filter = {};
    if (status) filter.status = status.toUpperCase();

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Vendor.countDocuments(filter);
    const vendors = await Vendor.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      vendors,
    });
  } catch (err) {
    console.error("getAllVendors Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error while fetching vendors" });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// GET VENDOR BY ID (admin)
// GET /api/vendor/:vendorId
// ═════════════════════════════════════════════════════════════════════════════
exports.getVendorDetails = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.vendorId);
    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }
    res.json({ success: true, vendor });
  } catch (err) {
    console.error("getVendorDetails Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error while fetching vendor" });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// UPDATE VENDOR
// PUT /api/vendor/profile/me  (vendor self  — uses req.vendor._id)
// PUT /api/vendor/:vendorId   (admin        — uses req.params.vendorId)
// ═════════════════════════════════════════════════════════════════════════════
exports.updateVendor = async (req, res) => {
  try {
    const targetId = req.params.vendorId || req.vendor._id;

    // Strip sensitive / system fields
    const { password, otp, otpExpires, status, ...updates } = req.body;

    if (updates.storeName) {
      updates.storeName = updates.storeName.toLowerCase().trim();
      const conflict = await Vendor.findOne({
        storeName: updates.storeName,
        _id: { $ne: targetId },
      });
      if (conflict) {
        return res.status(400).json({
          success: false,
          message: "This store name is already taken",
        });
      }
    }

    const vendor = await Vendor.findByIdAndUpdate(
      targetId,
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }

    res.json({ success: true, message: "Vendor updated successfully", vendor });
  } catch (err) {
    console.error("updateVendor Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error while updating vendor" });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// DELETE VENDOR (admin)
// DELETE /api/vendor/:vendorId
// ═════════════════════════════════════════════════════════════════════════════
exports.deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndDelete(req.params.vendorId);
    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }
    res.json({ success: true, message: "Vendor deleted successfully" });
  } catch (err) {
    console.error("deleteVendor Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error while deleting vendor" });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// UPDATE VENDOR STATUS (admin)
// PATCH /api/vendor/:vendorId/status
// body: { status: "ACCEPTED" | "REJECTED" | "PENDING" }
// ═════════════════════════════════════════════════════════════════════════════
exports.updateVendorStatus = async (req, res) => {
  try {
    const VALID = ["PENDING", "ACCEPTED", "REJECTED"];
    const { status } = req.body;

    if (!status || !VALID.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${VALID.join(", ")}`,
      });
    }

    const vendor = await Vendor.findByIdAndUpdate(
      req.params.vendorId,
      { status: status.toUpperCase() },
      { new: true },
    );

    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }

    res.json({
      success: true,
      message: `Vendor status updated to ${vendor.status}`,
      vendor: {
        _id: vendor._id,
        storeName: vendor.storeName,
        email: vendor.email,
        status: vendor.status,
      },
    });
  } catch (err) {
    console.error("updateVendorStatus Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error while updating status" });
  }
};
