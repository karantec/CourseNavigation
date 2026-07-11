const express = require("express");
const {
  getProductsBySubCategories,
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  getProductsBySubCategory,
  getPopularProducts,
  toggleProductStatus,
  computePrice,
  getWholesalerPrice,
  updateWholesalerPrice,
  removeWholesalerPrice,
} = require("../controllers/item.controller");
const { protect, admin } = require("../middleware/auth.middleware");

const router = express.Router();

// ─── Public Routes ─────────────────────────────────────────
// Get products by subcategories (query param)
router.get("/subcategories", getProductsBySubCategories);

// Get all products with filters
router.get("/", getAllProducts);

// Get popular products
router.get("/popular/all", getPopularProducts);

// Get products by category
router.get("/category/:categoryId", getProductsByCategory);

// Get products by subcategory
router.get("/subcategory/:subCategoryId", getProductsBySubCategory);

// Compute price for a product (no auth needed for price calc)
router.post("/:id/compute-price", computePrice);

// Get single product by ID (must be after specific routes to avoid conflicts)
router.get("/:id", getProductById);

// ─── Wholesaler Price Routes (Admin only) ──────────────────
// Get wholesale price for a specific wholesaler
router.get(
  "/:id/wholesaler/:wholesalerId/price",
  protect,
  admin,
  getWholesalerPrice,
);

// Add/Update wholesale price for a product
router.put("/:id/wholesaler-price", protect, admin, updateWholesalerPrice);

// Remove wholesale price for a product
router.delete(
  "/:id/wholesaler/:wholesalerId/price",
  protect,
  admin,
  removeWholesalerPrice,
);

// ─── Admin Routes ──────────────────────────────────────────
// Create product
router.post("/create", protect, admin, createProduct);

// ⚠️ SECURITY RISK: Remove this in production or add authentication
// This route is publicly accessible - only keep for testing
router.post("/createCard", createProduct);

// Update product
router.put("/:id", protect, admin, updateProduct);

// Delete product
router.delete("/:id", protect, admin, deleteProduct);

// Toggle product active status
router.patch("/:id/toggle-status", protect, admin, toggleProductStatus);

module.exports = router;
