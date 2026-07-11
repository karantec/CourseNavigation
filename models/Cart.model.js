const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: { type: String, required: true },
  image: { type: String },

  price: { type: Number, required: true },

  customizations: { type: Array, default: [] }, // ✅ ADD THIS

  // 🔥 NEW: designs array
  designs: [
    {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true,
      },
      designId: { type: String }, // 🔥 ADD THIS
      config: { type: Object, default: {} },
      quantity: { type: Number, default: 1 },
      offers: { type: Array, default: [] },
    },
  ],
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one active cart per user
    },
    items: { type: [cartItemSchema], default: [] },
    subTotal: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["active", "ordered", "abandoned"],
      default: "active",
    },
  },
  { timestamps: true },
);

cartSchema.pre("save", function (next) {
  this.subTotal = this.items.reduce((sum, item) => {
    const itemTotal = item.designs.reduce((dSum, d) => {
      let adjustment = 0;

      item.customizations?.forEach((field) => {
        const selected = d.config?.[field.label];

        if (!selected) return;

        if (Array.isArray(selected)) {
          selected.forEach((val) => {
            const opt = field.options?.find((o) => o.label === val);
            adjustment += opt?.priceAdjustment || 0;
          });
        } else {
          const opt = field.options?.find((o) => o.label === selected);
          adjustment += opt?.priceAdjustment || 0;
        }
      });

      let price = item.price + adjustment;

      // 🔥 APPLY OFFERS
      (d.offers || []).forEach((offer) => {
        if (offer.discountPercent) {
          price = price - (price * offer.discountPercent) / 100;
        }
      });

      return dSum + price * d.quantity;
    }, 0);

    return sum + itemTotal;
  }, 0);

  this.grandTotal = this.subTotal + (this.deliveryFee || 0);

  next();
});

module.exports = mongoose.model("Cart", cartSchema);
