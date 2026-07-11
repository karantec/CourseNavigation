// routes/subcategory.routes.js
const express = require("express");
const router = express.Router();
const {
  createcategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
  getSubCategoriesByCategory,
  bulkUploadCategories,
} = require("../controllers/category.controller");

const {
  getProductsByCategory,
} = require("../controllers/subCategory.controller");

const { protect, admin } = require("../middleware/auth.middleware");

/* ===================== PUBLIC ROUTES ===================== */

// Get all categories
router.get("/categories", getAllCategories);

// Get subcategories by category (id or name)
router.get("/subcategories/:identifier", getSubCategoriesByCategory);

// Get products by category
router.get("/category/:categoryId/products", getProductsByCategory);

/* ===================== ADMIN ONLY ROUTES ===================== */

// Create category
router.post("/categories", protect, admin, createcategory);

// Update category
router.put("/categories/:id", protect, admin, updateCategory);

// Delete category
router.delete("/categories/:id", protect, admin, deleteCategory);

// Bulk upload categories (CSV)
// router.post(
//   "/categories/bulk-upload",
//   protect,
//   admin,
//   upload.single("file"),
//   bulkUploadCategories
// );

module.exports = router;
