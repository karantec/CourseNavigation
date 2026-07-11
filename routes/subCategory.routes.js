// routes/subcategory.routes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  createSubcategory,
  getSubcategories,
  getSubcategoryById,
  getSubcategoriesByCategory,
  updateSubcategory,
  deleteSubcategory,
  getAllCategoriesWithSubcategories,
  bulkUploadSubcategories,
} = require("../controllers/subCategory.controller");
const { protect, admin } = require("../middleware/auth.middleware");

// ================= Routes ================= //

// Create
router.post("/", protect, admin, createSubcategory);

// Read (all, with optional query filters)
router.get("/", getSubcategories);
router.get("/categories-with-subcategories", getAllCategoriesWithSubcategories);
// Read (single by ID)
router.get("/:id", getSubcategoryById);

// Read (all subcategories by category ID)
router.get("/category/:categoryId", getSubcategoriesByCategory);

// Update
router.put("/:id", protect, admin, updateSubcategory);

// Delete
router.delete("/:id", protect, admin, deleteSubcategory);

module.exports = router;
