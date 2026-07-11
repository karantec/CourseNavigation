// routes/cart.routes.js

const express = require("express");
const {
  userCart,
  addToCart,
  updateQuantity,
  removeFromCart,
} = require("../controllers/cart.controller");

const router = express.Router();

// ================= CART ROUTES =================

// Get user cart
// Supports:
// GET /api/cart?userId=xxx
// GET /api/cart/xxx
router.get("/", userCart);
router.get("/:userId", userCart);

// Add product to cart
// POST /api/cart/add
router.post("/add", addToCart);

// Update quantity
// PUT /api/cart/update
router.put("/update", updateQuantity);

// Remove product from cart
// POST /api/cart/remove
router.post("/remove", removeFromCart);

module.exports = router;
