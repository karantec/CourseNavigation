const express = require("express");
const router = express.Router();
const {
  registerWholeSaler,
  loginWholeSaler,
  getAllWholesalers,
  getWholesalerById,
  updateWholesaler,
  deleteWholesaler,
  getCurrentWholesaler,
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} = require("../controllers/WholeSaler.controller");
const { admin, protect } = require("../middleware/auth.middleware");

// Public routes
router.post("/register", registerWholeSaler);
router.post("/login", loginWholeSaler);
router.get("/", getAllWholesalers); // Made public for product dropdown

// address
router.post("/wholesale", protect, addAddress);

// Get all addresses
router.get("/wholesale", protect, getAddresses);

// Update address
router.put("/:addressId", protect, updateAddress);

// Delete address
router.delete("/:addressId", protect, deleteAddress);

// Set default address
router.put("/default/:addressId", protect, setDefaultAddress);

// Protected routes (require authentication)
router.get("/me", protect, getCurrentWholesaler);
router.get("/:id", protect, admin, getWholesalerById);
router.put("/:id", protect, admin, updateWholesaler);
router.delete("/:id", protect, admin, deleteWholesaler);

module.exports = router;
