const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/auth.middleware");
const {
  createRazorpayOrder,
  verifyPayment,
  razorpayWebhook,
} = require("../controllers/payment.controller");

// POST /api/payment/create-order
// User must be logged in. Body: { orderId: "<MongoDB Order _id>" }
router.post("/create-order", protect, createRazorpayOrder);

// POST /api/payment/verify
// Called by frontend after Razorpay payment dialog closes successfully.
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId }
router.post("/verify", protect, verifyPayment);

// POST /api/payment/webhook
// Called by Razorpay servers (no auth middleware — verified by signature inside handler).
// Register this URL in Razorpay Dashboard → Webhooks.
// Use raw body parser for this route (see app.js note below).
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    // Convert raw Buffer to parsed JSON for our handler
    if (Buffer.isBuffer(req.body)) {
      req.body = JSON.parse(req.body.toString());
    }
    next();
  },
  razorpayWebhook,
);

module.exports = router;

/*
─────────────────────────────────────────────
  app.js / server.js — mount the router:
─────────────────────────────────────────────

  const paymentRoutes = require("./routes/payment.routes");
  app.use("/api/payment", paymentRoutes);

─────────────────────────────────────────────
  .env variables required:
─────────────────────────────────────────────

  RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
  RAZORPAY_KEY_SECRET=your_secret_here
  RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here

─────────────────────────────────────────────
  Install dependency:
─────────────────────────────────────────────

  npm install razorpay

*/
