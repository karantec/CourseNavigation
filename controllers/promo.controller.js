const Coupon = require("../models/Coupan.model");

const createCoupon = async (req, res) => {
  try {
    const { code, discountType, discountValue, validFrom, validTill } =
      req.body;

    // Basic validation
    if (!code || !discountType || !discountValue || !validFrom || !validTill) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Validate discount type
    if (!["PERCENTAGE", "FIXED"].includes(discountType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid discount type",
      });
    }

    // Validate date
    if (new Date(validFrom) >= new Date(validTill)) {
      return res.status(400).json({
        success: false,
        message: "validTill must be greater than validFrom",
      });
    }

    // Check duplicate
    const existing = await Coupon.findOne({
      code: code.toUpperCase(),
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Coupon already exists",
      });
    }

    // Create coupon
    const coupon = await Coupon.create({
      ...req.body,
      code: code.toUpperCase(),
    });

    return res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      data: coupon,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const applyCoupon = async (req, res) => {
  try {
    const { code, cartTotal, userId } = req.body;

    if (!code || !cartTotal || !userId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Invalid or inactive coupon",
      });
    }

    const now = new Date();

    // Expiry check
    if (now < coupon.validFrom || now > coupon.validTill) {
      return res.status(400).json({
        success: false,
        message: "Coupon expired or not valid",
      });
    }

    // Usage limit
    if (coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({
        success: false,
        message: "Coupon usage limit reached",
      });
    }

    // Per user check
    if (coupon.usersUsed.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: "Coupon already used by this user",
      });
    }

    // Minimum order check
    if (cartTotal < coupon.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order should be ₹${coupon.minOrderAmount}`,
      });
    }

    let discount = 0;

    if (coupon.discountType === "PERCENTAGE") {
      discount = (cartTotal * coupon.discountValue) / 100;

      if (coupon.maxDiscountAmount) {
        discount = Math.min(discount, coupon.maxDiscountAmount);
      }
    } else {
      discount = coupon.discountValue;
    }

    const finalAmount = Math.max(cartTotal - discount, 0);

    return res.status(200).json({
      success: true,
      message: "Coupon applied successfully",
      data: {
        couponId: coupon._id,
        discount,
        finalAmount,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: coupons.length,
      data: coupons,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
module.exports = {
  createCoupon,
  applyCoupon,
  getCoupons,
};
