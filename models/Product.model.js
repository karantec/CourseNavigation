const mongoose = require("mongoose");

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 OPTION SCHEMA — each selectable option with its own price delta
// ─────────────────────────────────────────────────────────────────────────────
const optionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },

    /**
     * Price adjustment for this specific option.
     * ✅ Can be positive  (+50  → adds ₹50 to base price)
     * ✅ Can be negative  (-30  → subtracts ₹30 from base price)
     * ✅ Can be zero      (0    → no change, default)
     *
     * Final price = product.price + sum of priceAdjustment of all selected options
     */
    priceAdjustment: { type: Number, default: 0 },
  },
  { _id: false },
);

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 CUSTOMIZATION SCHEMA
// ─────────────────────────────────────────────────────────────────────────────
const customizationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },

    type: {
      type: String,
      enum: ["radio", "checkbox", "dropdown", "text", "textarea", "file"],
      required: true,
    },

    options: { type: [optionSchema], default: [] },
    placeholder: { type: String, default: "" },
    required: { type: Boolean, default: false },
    multiple: { type: Boolean, default: false },
    files: { type: [String], default: [] },
    value: { type: mongoose.Schema.Types.Mixed, default: null },

    showIf: {
      field: { type: String, default: "" },
      value: { type: String, default: "" },
    },
  },
  { _id: false },
);

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 MEDIA SCHEMA
// ─────────────────────────────────────────────────────────────────────────────
const mediaSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["image", "video"], required: true },
    url: { type: String, required: true },
  },
  { _id: false },
);

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 SPECIFICATION SCHEMA
// ─────────────────────────────────────────────────────────────────────────────
const specificationSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false },
);

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 OFFER SCHEMA
// ─────────────────────────────────────────────────────────────────────────────
const offerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    code: { type: String, required: true },
    discountPercent: { type: Number, required: true, min: 0, max: 100 },
    active: { type: Boolean, default: true },
    expiryDate: { type: Date, default: null },
  },
  { timestamps: true },
);

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 WHOLESALER PRICE SCHEMA — Each wholesaler gets their own wholesale price
// ─────────────────────────────────────────────────────────────────────────────
const wholesalerPriceSchema = new mongoose.Schema(
  {
    wholesalerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WholeSaler",
      required: true,
    },
    wholesalePrice: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 PRODUCT SCHEMA
// ─────────────────────────────────────────────────────────────────────────────
const productSchema = new mongoose.Schema(
  {
    // 📌 Basic Info
    name: { type: String, required: true, trim: true },
    productName: { type: String, default: "" },
    description: { type: String, default: "" },

    // 📝 Specifications
    specifications: { type: [specificationSchema], default: [] },

    // 🖼️ Media
    image: { type: String, default: "" },
    images: { type: [String], default: [] },
    canvasimages: { type: [String], default: [] },
    media: { type: [mediaSchema], default: [] },

    // 📂 Category
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
      required: true,
    },

    // 💰 Pricing - Single Default Price (MRP)
    price: { type: Number, required: true },
    originalPrice: { type: Number, default: null },

    // 🏷️ Discount Fields (FIXED - Added missing fields)
    discount: { type: Number, default: 0 }, // Discount percentage
    amountSaving: { type: Number, default: 0 }, // Amount saved in rupees
    discountedMRP: { type: Number, default: null }, // Final discounted price

    // 💲 wholesale pricing - Each wholesaler gets their own price
    wholesalerPrices: { type: [wholesalerPriceSchema], default: [] },

    // ⚠️ DEPRECATED: Kept for backward compatibility (will be removed)
    WholeSaler: { type: mongoose.Schema.Types.ObjectId, ref: "WholeSaler" },
    wholeSalerPrice: { type: Number, default: 0 },
    wholeSalerDefault: { type: Number, default: 0 }, // Independent field

    // 📦 Stock
    stock: { type: Number, default: 0 },
    unit: { type: String, default: "" },
    pack: { type: String, default: "" },

    // ⭐ Ratings
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },

    // 🏷️ Tags
    tags: { type: [String], default: [] },

    // 🚀 Super Tags (max 5)
    superTags: {
      type: [String],
      enum: ["design1", "design2", "design3", "design4", "design5"],
      default: [],
      validate: [(val) => val.length <= 5, "Max 5 super tags allowed"],
    },

    // 🎁 Offers
    offers: { type: [offerSchema], default: [] },

    // 🚩 Flags
    popular: { type: Boolean, default: false },
    active: { type: Boolean, default: true },

    // 🎯 Customizations
    customizations: { type: [customizationSchema], default: [] },

    // 🧩 Extra flexible data
    more_details: { type: Object, default: {} },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 PRE-SAVE MIDDLEWARE — Auto-calculate discount
// ─────────────────────────────────────────────────────────────────────────────
productSchema.pre("save", function (next) {
  // Calculate discount based on originalPrice and price
  if (this.originalPrice && this.price && this.price <= this.originalPrice) {
    this.discount = Math.round(
      ((this.originalPrice - this.price) / this.originalPrice) * 100,
    );
    this.amountSaving = this.originalPrice - this.price;
    this.discountedMRP = this.price;
  } else {
    this.discount = 0;
    this.amountSaving = 0;
    this.discountedMRP = this.price || 0;
  }
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 INSTANCE METHOD — Get wholesale price for a specific wholesaler
// ─────────────────────────────────────────────────────────────────────────────
productSchema.methods.getWholesalePrice = function (wholesalerId) {
  const wholesalerPrice = this.wholesalerPrices.find(
    (wp) => wp.wholesalerId.toString() === wholesalerId.toString(),
  );

  if (wholesalerPrice) {
    return wholesalerPrice.wholesalePrice;
  }

  if (
    this.WholeSaler &&
    this.WholeSaler.toString() === wholesalerId.toString()
  ) {
    return this.wholeSalerPrice;
  }

  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 INSTANCE METHOD — Get all wholesaler prices
// ─────────────────────────────────────────────────────────────────────────────
productSchema.methods.getAllWholesalerPrices = function () {
  if (this.wholesalerPrices && this.wholesalerPrices.length > 0) {
    return this.wholesalerPrices;
  }

  if (this.WholeSaler) {
    return [
      { wholesalerId: this.WholeSaler, wholesalePrice: this.wholeSalerPrice },
    ];
  }

  return [];
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 INSTANCE METHOD — Add or update wholesaler price
// ─────────────────────────────────────────────────────────────────────────────
productSchema.methods.setWholesalerPrice = function (
  wholesalerId,
  wholesalePrice,
) {
  const existingIndex = this.wholesalerPrices.findIndex(
    (wp) => wp.wholesalerId.toString() === wholesalerId.toString(),
  );

  if (existingIndex >= 0) {
    this.wholesalerPrices[existingIndex].wholesalePrice = wholesalePrice;
  } else {
    this.wholesalerPrices.push({ wholesalerId, wholesalePrice });
  }

  return this;
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 INSTANCE METHOD — Remove wholesaler price
// ─────────────────────────────────────────────────────────────────────────────
productSchema.methods.removeWholesalerPrice = function (wholesalerId) {
  this.wholesalerPrices = this.wholesalerPrices.filter(
    (wp) => wp.wholesalerId.toString() !== wholesalerId.toString(),
  );
  return this;
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 INSTANCE METHOD — Get savings for wholesaler
// ─────────────────────────────────────────────────────────────────────────────
productSchema.methods.getWholesalerSavings = function (wholesalerId) {
  const wholesalePrice = this.getWholesalePrice(wholesalerId);
  if (wholesalePrice && this.price) {
    return this.price - wholesalePrice;
  }
  return 0;
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 INSTANCE METHOD — Get discount percentage for wholesaler
// ─────────────────────────────────────────────────────────────────────────────
productSchema.methods.getWholesalerDiscount = function (wholesalerId) {
  const wholesalePrice = this.getWholesalePrice(wholesalerId);
  if (wholesalePrice && this.price && this.price > 0) {
    return (((this.price - wholesalePrice) / this.price) * 100).toFixed(2);
  }
  return 0;
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 STATIC METHOD — Find products by wholesaler
// ─────────────────────────────────────────────────────────────────────────────
productSchema.statics.findByWholesaler = function (wholesalerId) {
  return this.find({
    $or: [
      { "wholesalerPrices.wholesalerId": wholesalerId },
      { WholeSaler: wholesalerId },
    ],
  }).populate("wholesalerPrices.wholesalerId", "storeName pin city");
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 STATIC METHOD — Find products with wholesale price range
// ─────────────────────────────────────────────────────────────────────────────
productSchema.statics.findByWholesalePriceRange = function (
  minPrice,
  maxPrice,
  wholesalerId,
) {
  const query = {
    "wholesalerPrices.wholesalePrice": { $gte: minPrice, $lte: maxPrice },
  };
  if (wholesalerId) {
    query["wholesalerPrices.wholesalerId"] = wholesalerId;
  }
  return this.find(query).populate(
    "wholesalerPrices.wholesalerId",
    "storeName pin city",
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 VIRTUAL — Get wholesaler count
// ─────────────────────────────────────────────────────────────────────────────
productSchema.virtual("wholesalerCount").get(function () {
  return this.wholesalerPrices.length;
});

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 VIRTUAL — Get formatted wholesale prices for API response
// ─────────────────────────────────────────────────────────────────────────────
productSchema.virtual("formattedWholesalerPrices").get(function () {
  return this.wholesalerPrices.map((wp) => ({
    wholesalerId: wp.wholesalerId,
    mrp: `₹${this.price.toLocaleString("en-IN")}`,
    wholesalePrice: `₹${wp.wholesalePrice.toLocaleString("en-IN")}`,
    savings: `₹${(this.price - wp.wholesalePrice).toLocaleString("en-IN")}`,
    discount: `${(((this.price - wp.wholesalePrice) / this.price) * 100).toFixed(1)}%`,
  }));
});

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 VIRTUAL — Get best wholesale price among all wholesalers
// ─────────────────────────────────────────────────────────────────────────────
productSchema.virtual("bestWholesalePrice").get(function () {
  if (this.wholesalerPrices.length === 0) return null;

  const bestPrice = Math.min(
    ...this.wholesalerPrices.map((wp) => wp.wholesalePrice),
  );
  const bestWholesaler = this.wholesalerPrices.find(
    (wp) => wp.wholesalePrice === bestPrice,
  );

  return {
    wholesalePrice: bestPrice,
    wholesalerId: bestWholesaler?.wholesalerId,
    savings: this.price - bestPrice,
    discount: (((this.price - bestPrice) / this.price) * 100).toFixed(2),
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 EXPORT
// ─────────────────────────────────────────────────────────────────────────────
module.exports =
  mongoose.models.Product || mongoose.model("Product", productSchema);
