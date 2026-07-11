const Razorpay = require("../config/razorpay");
const Order = require("../models/Order");
const crypto = require("crypto");

exports.createRazorpayOrder = async (req, res) => {
  const { orderId } = req.body;
  const order = await Order.findById(orderId);

  const rpOrder = await Razorpay.orders.create({
    amount: order.totalAmount * 100,
    currency: "INR",
    receipt: "order_" + order._id,
    payment_capture: 1,
  });

  order.razorpayOrderId = rpOrder.id;
  order.paymentStatus = "PENDING";
  await order.save();

  res.json({ success: true, order: rpOrder });
};

exports.verifyPayment = async (req, res) => {
  const {
    orderId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;

  const sign = razorpay_order_id + "|" + razorpay_payment_id;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(sign)
    .digest("hex");

  if (expected !== razorpay_signature)
    return res.status(400).json({ success: false });

  const order = await Order.findByIdAndUpdate(
    orderId,
    {
      paymentStatus: "PAID",
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    },
    { new: true }
  );

  res.json({ success: true, order });
};
