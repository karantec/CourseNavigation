const express = require("express");
const {
  createCoupon,
  getCoupons,
  applyCoupon,
} = require("../controllers/promo.controller");

const router = express.Router();

// 👉 Create coupon (Admin)
router.post("/create", createCoupon);

// 👉 Apply coupon (User)
router.post("/apply", applyCoupon);

// 👉 Get all coupons (Admin)
router.get("/", getCoupons);

module.exports = router;
