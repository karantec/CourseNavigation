const mongoose = require("mongoose");

/* ================= ORDER ITEM ================= */
const OrderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: String,
    image: String,
    unit: String,

    mrp: Number,
    sellingPrice: Number,
    discount: Number,

    quantity: Number,
    lineTotal: Number,

    designs: [
      {
        config: { type: Object, default: {} },
        quantity: { type: Number, default: 1 },
      },
    ],
  },
  { _id: false },
);

/* ================= ADDRESS ================= */
const AddressSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
    line1: String,
    city: String,
    state: String,
    pincode: String,
  },
  { _id: false },
);

/* ================= PAYMENT ================= */
const PaymentSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ["COD", "ONLINE"],
      required: true,
    },

    // ✅ FIXED: full lifecycle
    status: {
      type: String,
      enum: [
        "NOT_INITIATED", // before payment
        "CREATED", // Razorpay order created
        "PENDING", // waiting / COD
        "PAID", // success
        "FAILED", // failed
        "REFUND_PENDING", // refund started
        "REFUNDED", // refund completed
      ],
      default: "NOT_INITIATED",
    },

    razorpayOrderId: String,
    razorpayPaymentId: String,

    amount: Number,
    currency: { type: String, default: "INR" },

    paidAt: Date,

    // ✅ NEW (you were using these but missing in schema)
    refundRequestedAt: Date,
    refundReason: String,
  },
  { _id: false },
);

/* ================= TRACKING ================= */
const TrackingSchema = new mongoose.Schema(
  {
    status: String,
    location: String,
    note: String,
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { _id: false },
);

/* ================= ORDER ================= */
const OrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    items: [OrderItemSchema],

    subTotal: Number,
    deliveryFee: Number,
    totalAmount: Number,

    shippingAddress: AddressSchema,

    status: {
      type: String,
      enum: [
        "PLACED",
        "CONFIRMED",
        "SHIPPED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
      ],
      default: "PLACED",
    },

    payment: PaymentSchema,

    trackingUpdates: {
      type: [TrackingSchema],
      default: [],
    },

    // ✅ NEW (you used these in cancel API)
    cancelReason: String,
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    notes: String,
  },
  { timestamps: true },
);

module.exports = mongoose.models.Order || mongoose.model("Order", OrderSchema);
