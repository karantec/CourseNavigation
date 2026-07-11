const Order = require("../models/Order.model");
const Product = require("../models/Product.model");
const Cart = require("../models/Cart.model");
const razorpay = require("../config/razorpay");
const crypto = require("crypto");

//
// 🔹 CREATE ORDER
//
exports.createOrder = async (req, res) => {
  try {
    console.log("🔥 NEW CREATE ORDER HIT");

    const userId = req.user._id;
    const { items, shippingAddress, paymentMethod } = req.body;

    // ✅ Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items provided" });
    }

    // ✅ Validate payment method
    if (!["COD", "ONLINE"].includes(paymentMethod)) {
      return res.status(400).json({
        message: "Invalid payment method",
      });
    }

    // ✅ Validate address
    if (
      !shippingAddress ||
      !shippingAddress.name ||
      !shippingAddress.phone ||
      !shippingAddress.line1 ||
      !shippingAddress.city ||
      !shippingAddress.state ||
      !shippingAddress.pincode
    ) {
      return res.status(400).json({
        message: "Complete shipping address is required",
      });
    }

    console.log("REQ ITEMS:", JSON.stringify(items, null, 2));

    const products = await Product.find({
      _id: { $in: items.map((i) => i.product) },
    });

    let subTotal = 0;

    const orderItems = items.map((item) => {
      const product = products.find((p) => p._id.toString() === item.product);

      if (!product) {
        throw new Error(`Product not found: ${item.product}`);
      }

      let totalQty = 0;
      let lineTotal = 0;

      const designs = (item.designs || []).map((d) => {
        const qty = d.quantity || 1;
        totalQty += qty;
        lineTotal += product.price * qty;

        return {
          config: d.config || {},
          quantity: qty,
        };
      });

      // fallback
      if (!item.designs || item.designs.length === 0) {
        totalQty = item.quantity || 1;
        lineTotal = product.price * totalQty;
      }

      subTotal += lineTotal;

      return {
        product: product._id,
        name: product.name,
        image: product.image,
        unit: product.unit,
        mrp: product.originalPrice,
        sellingPrice: product.price,
        discount: product.discount,
        quantity: totalQty,
        lineTotal,
        designs,
      };
    });

    const deliveryFee = 50;
    const totalAmount = subTotal + deliveryFee;

    let paymentData = {
      method: paymentMethod,
      amount: totalAmount,
      currency: "INR",
    };

    let razorpayOrder = null;

    // ✅ COD FLOW (FIXED)
    if (paymentMethod === "COD") {
      paymentData.status = "PENDING"; // ✅ FIXED (not NOT_INITIATED)
    }

    // ✅ ONLINE FLOW
    if (paymentMethod === "ONLINE") {
      razorpayOrder = await razorpay.orders.create({
        amount: totalAmount * 100,
        currency: "INR",
        receipt: `order_${Date.now()}`,
      });

      paymentData = {
        method: "ONLINE",
        status: "CREATED",
        razorpayOrderId: razorpayOrder.id,
        amount: totalAmount,
        currency: "INR",
      };
    }

    const order = await Order.create({
      user: userId,
      items: orderItems,
      subTotal,
      deliveryFee,
      totalAmount,
      shippingAddress,
      payment: paymentData,
      status: "PLACED",
      trackingUpdates: [
        {
          status: "PLACED",
          location: "System",
          note: "Order placed successfully",
          updatedBy: userId,
        },
      ],
    });

    res.status(201).json({
      success: true,
      order,
      razorpayOrder,
    });
  } catch (err) {
    console.error("❌ CREATE ORDER ERROR:", err);
    res.status(500).json({
      message: err.message || "Create order failed",
    });
  }
};
//
// 🔹 VERIFY PAYMENT
//
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = req.body;

    // Validate required fields
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !orderId
    ) {
      return res
        .status(400)
        .json({ message: "Missing payment verification details" });
    }

    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ message: "Payment verification failed" });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.payment.status = "PAID";
    order.payment.razorpayPaymentId = razorpay_payment_id;
    order.payment.paidAt = new Date();

    await order.save();

    // Clear user's cart after successful payment
    await Cart.updateOne(
      { user: order.user },
      { $set: { items: [], subTotal: 0, grandTotal: 0 } },
    );

    res.json({ success: true, order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Verification failed" });
  }
};

//
// 🔹 PAYMENT FAILED
//
exports.paymentFailed = async (req, res) => {
  try {
    const { orderId, reason } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.payment.status = "FAILED";
    order.payment.failedReason = reason || "Payment failed";

    await order.save();

    res.json({ success: true, message: "Payment failure recorded" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating payment" });
  }
};

//
// 🔹 GET MY ORDERS
//
exports.getMyOrders = async (req, res) => {
  try {
    console.log("🚀 ORDER CONTROLLER - getMyOrders called");
    console.log("URL:", req.originalUrl);
    console.log("User:", req.user?._id);

    const orders = await Order.find({ user: req.user._id })
      .populate("items.product")
      .populate("trackingUpdates.updatedBy", "name email")
      .sort({ createdAt: -1 });

    console.log("Orders found:", orders.length);
    res.json({ success: true, orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

//
// 🔹 GET SINGLE ORDER
//
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("items.product")
      .populate("trackingUpdates.updatedBy", "name email");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if user is authorized (owner or admin)
    if (
      order.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.json({ success: true, order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch order" });
  }
};

//
// 🔹 CANCEL ORDER (UPDATED)
//
exports.cancelOrder = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // ❌ Do not allow changes after cancellation
    if (order.status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Cancelled order status cannot be changed",
      });
    }

    // ❌ Do not allow changes after delivery
    if (order.status === "DELIVERED") {
      return res.status(400).json({
        success: false,
        message: "Delivered order status cannot be changed",
      });
    }

    order.status = status;

    await order.save();

    res.json({
      success: true,
      message: "Status updated successfully",
      order,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to update status",
    });
  }
};

//
// 🔹 ADMIN - GET ALL ORDERS
//
exports.getAllOrders = async (req, res) => {
  try {
    const { status } = req.query;

    let query = {};
    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate("user", "name email phone")
      .sort({ createdAt: -1 });

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      orders,
      total,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};
//
// 🔹 ADMIN - UPDATE ORDER STATUS
//
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const validStatuses = [
      "PLACED",
      "CONFIRMED",
      "PROCESSING",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid statuses: ${validStatuses.join(", ")}`,
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const oldStatus = order.status;
    order.status = status;

    // Add tracking update for status change
    order.trackingUpdates.push({
      status: status,
      location: "Admin Panel",
      note: `Order status changed from ${oldStatus} to ${status}`,
      updatedBy: req.user._id,
    });

    await order.save();

    res.json({
      success: true,
      message: `Order status updated from ${oldStatus} to ${status}`,
      order,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update order status" });
  }
};

//
// 🔹 ADMIN - UPDATE ORDER ITEMS
//
exports.updateOrderItemsByAdmin = async (req, res) => {
  try {
    const { items } = req.body;
    const { id } = req.params;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Valid items array is required" });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    let subTotal = 0;

    const updatedItems = items.map((item) => {
      const total = item.quantity * item.sellingPrice;
      subTotal += total;
      return { ...item, lineTotal: total };
    });

    order.items = updatedItems;
    order.subTotal = subTotal;
    order.totalAmount = subTotal + order.deliveryFee;

    // Add tracking update
    order.trackingUpdates.push({
      status: order.status,
      location: "Admin Panel",
      note: "Order items were updated by admin",
      updatedBy: req.user._id,
    });

    await order.save();

    res.json({
      success: true,
      message: "Order items updated successfully",
      order,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update order items" });
  }
};

//
// 🔹 ADMIN - ADD TRACKING UPDATE
//
exports.addTrackingUpdate = async (req, res) => {
  try {
    const { status, location, note } = req.body;
    const { id } = req.params;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.trackingUpdates.push({
      status,
      location: location || "Warehouse",
      note: note || `Order ${status.toLowerCase()}`,
      updatedBy: req.user._id,
    });

    // Optionally update order status if tracking status matches
    const trackingToOrderStatus = {
      ORDER_CONFIRMED: "CONFIRMED",
      PROCESSING: "PROCESSING",
      SHIPPED: "SHIPPED",
      OUT_FOR_DELIVERY: "SHIPPED",
      DELIVERED: "DELIVERED",
    };

    if (trackingToOrderStatus[status]) {
      order.status = trackingToOrderStatus[status];
    }

    await order.save();

    res.json({
      success: true,
      message: "Tracking update added successfully",
      order,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add tracking update" });
  }
};
