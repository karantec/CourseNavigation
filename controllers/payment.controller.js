const Razorpay = require("razorpay");
const crypto = require("crypto");
const Order = require("../models/Order.model");
require("dotenv").config();
// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─────────────────────────────────────────────
// 🔹 STEP 1: Create Razorpay Order
//    Called BEFORE showing the payment modal.
//    Frontend sends the app-order _id; we look up
//    the totalAmount and create a Razorpay order.
// ─────────────────────────────────────────────
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { orderId } = req.body; // Your MongoDB Order _id

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Only allow payment if order is in PLACED state
    if (order.status !== "PLACED") {
      return res
        .status(400)
        .json({ message: "Order is not in a payable state" });
    }

    // Razorpay expects amount in PAISE (₹1 = 100 paise)
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.totalAmount * 100),
      currency: "INR",
      receipt: `receipt_${order._id}`,
      notes: {
        orderId: order._id.toString(),
        userId: order.user.toString(),
      },
    });

    // Save the Razorpay order ID on our order doc so we can verify later
    order.payment.razorpayOrderId = razorpayOrder.id;
    order.payment.status = "PENDING";
    await order.save();

    res.status(200).json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount, // in paise
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID, // send public key to frontend
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ message: "Error creating payment order" });
  }
};

// ─────────────────────────────────────────────
// 🔹 STEP 2: Verify Payment (Webhook-style verify)
//    Called by frontend AFTER successful payment.
//    We verify the signature to confirm authenticity.
// ─────────────────────────────────────────────
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId, // MongoDB Order _id
    } = req.body;

    // 1. Verify Razorpay signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res
        .status(400)
        .json({ message: "Payment verification failed: invalid signature" });
    }

    // 2. Update order payment details
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.payment.razorpayPaymentId = razorpay_payment_id;
    order.payment.razorpaySignature = razorpay_signature;
    order.payment.status = "PAID";
    order.payment.paidAt = new Date();
    await order.save();

    res
      .status(200)
      .json({ success: true, message: "Payment verified successfully", order });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ message: "Error verifying payment" });
  }
};

// ─────────────────────────────────────────────
// 🔹 OPTIONAL: Razorpay Webhook Handler
//    Useful for server-to-server payment events
//    (e.g. auto-capture, refund, dispute).
//    Set webhook URL in Razorpay Dashboard.
// ─────────────────────────────────────────────
exports.razorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    // Verify webhook authenticity
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (expectedSignature !== signature) {
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    const event = req.body.event;
    const paymentEntity = req.body.payload?.payment?.entity;

    if (event === "payment.captured") {
      const razorpayOrderId = paymentEntity.order_id;
      const order = await Order.findOne({
        "payment.razorpayOrderId": razorpayOrderId,
      });

      if (order && order.payment.status !== "PAID") {
        order.payment.razorpayPaymentId = paymentEntity.id;
        order.payment.status = "PAID";
        order.payment.paidAt = new Date();
        await order.save();
      }
    }

    if (event === "payment.failed") {
      const razorpayOrderId = paymentEntity.order_id;
      const order = await Order.findOne({
        "payment.razorpayOrderId": razorpayOrderId,
      });

      if (order) {
        order.payment.status = "FAILED";
        await order.save();
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ message: "Webhook processing error" });
  }
};
