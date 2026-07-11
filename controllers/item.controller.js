const mongoose = require("mongoose");
const Product = require("../models/Product.model");
const Category = require("../models/Category.model");
const SubCategory = require("../models/subCategory.model");
const WholeSaler = require("../models/WholeSaler.model");

const populateFields = [
  { path: "category", select: "name" },
  {
    path: "subCategory",
    select: "name section",
    populate: {
      path: "section",
      select: "name",
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 VALIDATE CUSTOMIZATIONS
// ─────────────────────────────────────────────────────────────────────────────
const validateCustomizations = (customizations) => {
  if (!Array.isArray(customizations)) {
    return "customizations must be an array";
  }

  const allowedTypes = [
    "radio",
    "checkbox",
    "dropdown",
    "text",
    "textarea",
    "file",
  ];

  for (const c of customizations) {
    if (!c.id || !c.label || !c.type) {
      return "Each customization must have id, label, type";
    }

    if (!allowedTypes.includes(c.type)) {
      return `Invalid customization type: ${c.type}`;
    }

    if (["radio", "checkbox", "dropdown"].includes(c.type)) {
      if (!c.options || c.options.length === 0) {
        return `Options required for ${c.type} in "${c.label}"`;
      }

      for (const opt of c.options) {
        if (
          !opt.label ||
          typeof opt.label !== "string" ||
          opt.label.trim() === ""
        ) {
          return `Each option in "${c.label}" must have a non-empty label`;
        }

        if (
          opt.priceAdjustment !== undefined &&
          typeof opt.priceAdjustment !== "number"
        ) {
          return `priceAdjustment in "${c.label}" → "${opt.label}" must be a number`;
        }
      }
    }

    if (c.type === "file") {
      if (c.required && (!c.files || c.files.length === 0)) {
        return `"${c.label}" is required`;
      }
      if (c.files && !Array.isArray(c.files)) {
        return `files must be an array in "${c.label}"`;
      }
    }

    if (c.type !== "file") {
      if (c.required && (c.value === null || c.value === "")) {
        return `"${c.label}" is required`;
      }
    }
  }

  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 NORMALIZE CUSTOMIZATIONS
// ─────────────────────────────────────────────────────────────────────────────
const normalizeCustomizations = (customizations) => {
  return customizations.map((c) => ({
    ...c,
    files: c.files || [],
    value: c.value ?? null,
    options: (c.options || []).map((opt) => {
      if (typeof opt === "string") {
        return { label: opt, priceAdjustment: 0 };
      }
      return {
        label: opt.label,
        priceAdjustment:
          typeof opt.priceAdjustment === "number" ? opt.priceAdjustment : 0,
      };
    }),
  }));
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 COMPUTE FINAL PRICE
// ─────────────────────────────────────────────────────────────────────────────
const computeFinalPrice = (product, selectedOptions = {}) => {
  let total = product.price;

  for (const customization of product.customizations) {
    const chosen = selectedOptions[customization.id];
    if (!chosen) continue;

    const chosenArray = Array.isArray(chosen) ? chosen : [chosen];

    for (const chosenLabel of chosenArray) {
      const match = customization.options.find((o) => o.label === chosenLabel);
      if (match) total += match.priceAdjustment;
    }
  }

  return Math.max(0, total);
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 GET PRODUCTS BY SUBCATEGORIES
// ─────────────────────────────────────────────────────────────────────────────
exports.getProductsBySubCategories = async (req, res) => {
  try {
    const { subCategories } = req.query;
    const filter = {};
    if (subCategories) {
      filter.subCategory = { $in: subCategories.split(",") };
    }

    const products = await Product.find(filter)
      .populate("category", "name")
      .populate("subCategory", "name")
      .populate("wholesalerPrices.wholesalerId", "storeName pin city")
      .sort({ createdAt: -1 });

    return res
      .status(200)
      .json({ success: true, count: products.length, data: products });
  } catch (error) {
    console.error("Get Products By SubCategories Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 CREATE PRODUCT
// ─────────────────────────────────────────────────────────────────────────────
exports.createProduct = async (req, res) => {
  try {
    const data = req.body;

    const missing = ["name", "category", "subCategory", "price"].filter(
      (f) => !data[f],
    );
    if (missing.length) {
      return res
        .status(400)
        .json({ message: `Missing fields: ${missing.join(", ")}` });
    }

    if (!mongoose.Types.ObjectId.isValid(data.category)) {
      return res.status(400).json({ message: "Invalid category ID" });
    }
    if (!(await Category.findById(data.category))) {
      return res.status(400).json({ message: "Category not found" });
    }

    if (!mongoose.Types.ObjectId.isValid(data.subCategory)) {
      return res.status(400).json({ message: "Invalid subCategory ID" });
    }
    if (!(await SubCategory.findById(data.subCategory))) {
      return res.status(400).json({ message: "SubCategory not found" });
    }

    // ✅ Keep wholesaler prices as they are - no validation
    if (data.customizations) {
      data.customizations = normalizeCustomizations(data.customizations);
      const error = validateCustomizations(data.customizations);
      if (error) return res.status(400).json({ message: error });
    }

    if (data.media && !Array.isArray(data.media)) {
      return res.status(400).json({ message: "media must be an array" });
    }

    if (data.superTags && data.superTags.length > 5) {
      return res.status(400).json({ message: "Maximum 5 superTags allowed" });
    }

    const product = await Product.create(data);
    const populated = await Product.findById(product._id)
      .populate("category", "name")
      .populate("subCategory", "name")
      .populate(
        "wholesalerPrices.wholesalerId",
        "storeName email pin phoneNumber city",
      );

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: populated,
    });
  } catch (error) {
    console.error("Create Product Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 GET ALL PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllProducts = async (req, res) => {
  try {
    const { category, subCategory, popular, active, search, wholesalerId } =
      req.query;
    const filter = {};

    if (category) filter.category = category;
    if (subCategory) filter.subCategory = subCategory;
    if (popular) filter.popular = popular === "true";
    if (active) filter.active = active === "true";

    if (wholesalerId) {
      filter.$or = [
        { "wholesalerPrices.wholesalerId": wholesalerId },
        { WholeSaler: wholesalerId },
      ];
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { productName: { $regex: search, $options: "i" } },
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("category", "name")
        .populate("subCategory", "name image section")
        .populate(
          "wholesalerPrices.wholesalerId",
          "storeName pin email phoneNumber city",
        )
        .sort({ createdAt: -1 }),
      Product.countDocuments(filter),
    ]);

    const updatedProducts = products.map((p) => {
      const subCat = p.subCategory || {};
      let bestWholesalePrice = null;
      if (p.wholesalerPrices && p.wholesalerPrices.length > 0) {
        bestWholesalePrice = Math.min(
          ...p.wholesalerPrices.map((wp) => wp.wholesalePrice),
        );
      }

      return {
        ...p._doc,
        subCategory: {
          _id: subCat._id,
          name: subCat.name,
          section: subCat.section || null,
          image: subCat.image || p.media?.[0]?.url || null,
        },
        bestWholesalePrice,
      };
    });

    return res.status(200).json({
      success: true,
      total,
      data: updatedProducts,
    });
  } catch (error) {
    console.error("Get All Products Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 GET PRODUCT BY ID
// ─────────────────────────────────────────────────────────────────────────────
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findById(id)
      .populate("category", "name")
      .populate("subCategory", "name")
      .populate(
        "wholesalerPrices.wholesalerId",
        "storeName pin email phoneNumber city",
      );

    if (!product) return res.status(404).json({ message: "Product not found" });

    return res.status(200).json({ success: true, product });
  } catch (error) {
    console.error("Get Product By ID Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 COMPUTE PRICE ENDPOINT
// ─────────────────────────────────────────────────────────────────────────────
exports.computePrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { selectedOptions = {} } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const basePrice = product.price;
    const finalPrice = computeFinalPrice(product, selectedOptions);
    const delta = finalPrice - basePrice;

    return res.status(200).json({
      success: true,
      basePrice,
      finalPrice,
      adjustment: delta,
      adjustmentLabel: delta >= 0 ? `+₹${delta}` : `-₹${Math.abs(delta)}`,
    });
  } catch (error) {
    console.error("Compute Price Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 UPDATE PRODUCT (FIXED - No discount, No wholesaler validation)
// ─────────────────────────────────────────────────────────────────────────────
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    // ✅ IMPORTANT: Keep the existing wholesalerPrices structure
    // Don't validate or modify wholesaler IDs

    if (data.customizations) {
      data.customizations = normalizeCustomizations(data.customizations);
      const error = validateCustomizations(data.customizations);
      if (error) return res.status(400).json({ message: error });
    }

    if (data.superTags && data.superTags.length > 5) {
      return res.status(400).json({ message: "Maximum 5 superTags allowed" });
    }

    const product = await Product.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    })
      .populate("category", "name")
      .populate("subCategory", "name")
      .populate(
        "wholesalerPrices.wholesalerId",
        "storeName pin email phoneNumber city",
      );

    if (!product) return res.status(404).json({ message: "Product not found" });

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error("Update Product Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 DELETE PRODUCT
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findByIdAndDelete(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    return res
      .status(200)
      .json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete Product Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 GET PRODUCTS BY CATEGORY
// ─────────────────────────────────────────────────────────────────────────────
exports.getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    const products = await Product.find({ category: categoryId, active: true })
      .populate("category", "name")
      .populate("subCategory", "name")
      .populate("wholesalerPrices.wholesalerId", "storeName pin city")
      .sort({ rating: -1 });

    return res
      .status(200)
      .json({ success: true, count: products.length, data: products });
  } catch (error) {
    console.error("Get Products By Category Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 GET PRODUCTS BY SUBCATEGORY
// ─────────────────────────────────────────────────────────────────────────────
exports.getProductsBySubCategory = async (req, res) => {
  try {
    const { subCategoryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(subCategoryId)) {
      return res.status(400).json({ message: "Invalid subCategory ID" });
    }

    const products = await Product.find({
      subCategory: subCategoryId,
      active: true,
    })
      .populate("category", "name")
      .populate("subCategory", "name")
      .populate("wholesalerPrices.wholesalerId", "storeName pin city")
      .sort({ rating: -1 });

    return res
      .status(200)
      .json({ success: true, count: products.length, data: products });
  } catch (error) {
    console.error("Get Products By SubCategory Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 GET POPULAR PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────
exports.getPopularProducts = async (req, res) => {
  try {
    const products = await Product.find({ popular: true, active: true })
      .populate("category", "name")
      .populate("subCategory", "name")
      .populate("wholesalerPrices.wholesalerId", "storeName pin city")
      .sort({ rating: -1 })
      .limit(10);

    return res
      .status(200)
      .json({ success: true, count: products.length, data: products });
  } catch (error) {
    console.error("Get Popular Products Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 TOGGLE ACTIVE STATUS
// ─────────────────────────────────────────────────────────────────────────────
exports.toggleProductStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    product.active = !product.active;
    await product.save();

    return res.status(200).json({
      success: true,
      active: product.active,
      message: `Product ${product.active ? "activated" : "deactivated"} successfully`,
    });
  } catch (error) {
    console.error("Toggle Product Status Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 GET WHOLESALER PRICE FOR PRODUCT (NO DISCOUNT/SAVINGS)
// ─────────────────────────────────────────────────────────────────────────────
exports.getWholesalerPrice = async (req, res) => {
  try {
    const { id, wholesalerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }
    if (!mongoose.Types.ObjectId.isValid(wholesalerId)) {
      return res.status(400).json({ message: "Invalid wholesaler ID" });
    }

    const product = await Product.findById(id).populate(
      "wholesalerPrices.wholesalerId",
      "storeName pin city",
    );
    if (!product) return res.status(404).json({ message: "Product not found" });

    const wholesalePriceData = product.wholesalerPrices.find(
      (wp) => wp.wholesalerId._id.toString() === wholesalerId,
    );

    return res.status(200).json({
      success: true,
      productId: id,
      wholesalerId,
      mrp: product.price,
      wholesalePrice: wholesalePriceData
        ? wholesalePriceData.wholesalePrice
        : null,
      wholesalerInfo: wholesalePriceData
        ? wholesalePriceData.wholesalerId
        : null,
    });
  } catch (error) {
    console.error("Get Wholesaler Price Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 ADD/UPDATE WHOLESALER PRICE
// ─────────────────────────────────────────────────────────────────────────────
exports.updateWholesalerPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { wholesalerId, wholesalePrice } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }
    if (!mongoose.Types.ObjectId.isValid(wholesalerId)) {
      return res.status(400).json({ message: "Invalid wholesaler ID" });
    }
    if (!wholesalePrice || wholesalePrice < 0) {
      return res
        .status(400)
        .json({ message: "Valid wholesale price is required" });
    }

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    product.setWholesalerPrice(wholesalerId, wholesalePrice);
    await product.save();

    const updatedProduct = await Product.findById(id).populate(
      "wholesalerPrices.wholesalerId",
      "storeName pin city",
    );

    return res.status(200).json({
      success: true,
      message: "Wholesaler price updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Update Wholesaler Price Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 REMOVE WHOLESALER PRICE
// ─────────────────────────────────────────────────────────────────────────────
exports.removeWholesalerPrice = async (req, res) => {
  try {
    const { id, wholesalerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }
    if (!mongoose.Types.ObjectId.isValid(wholesalerId)) {
      return res.status(400).json({ message: "Invalid wholesaler ID" });
    }

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    product.removeWholesalerPrice(wholesalerId);
    await product.save();

    return res.status(200).json({
      success: true,
      message: "Wholesaler price removed successfully",
    });
  } catch (error) {
    console.error("Remove Wholesaler Price Error:", error);
    return res.status(500).json({ message: error.message });
  }
};
