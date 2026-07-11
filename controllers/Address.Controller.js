const User = require("../models/user.model");

/* ================= GET ALL SAVED ADDRESSES ================= */
// GET /api/user/addresses
const getSavedAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("savedAddresses");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      addresses: user.savedAddresses,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= SAVE A NEW ADDRESS ================= */
// POST /api/user/addresses
// Body: { label, street, city, state, pincode, phone, isDefault? }
const saveAddress = async (req, res) => {
  try {
    const { label, street, city, state, pincode, phone, isDefault } = req.body;

    // Basic validation
    if (!street || !city || !pincode || !phone) {
      return res.status(400).json({
        success: false,
        message: "street, city, pincode and phone are required",
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Enforce max 5 saved addresses per user
    if (user.savedAddresses.length >= 5) {
      return res.status(400).json({
        success: false,
        message:
          "Maximum of 5 saved addresses allowed. Please delete one first.",
      });
    }

    // If new address is set as default, unset existing default
    if (isDefault) {
      user.savedAddresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    // If this is the first address, auto-make it default
    const shouldBeDefault = isDefault || user.savedAddresses.length === 0;

    const newAddress = {
      label: label || "Home",
      street,
      city,
      state: state || "",
      pincode,
      phone,
      isDefault: shouldBeDefault,
    };

    user.savedAddresses.push(newAddress);
    await user.save();

    // Return the newly added address (last in array)
    const saved = user.savedAddresses[user.savedAddresses.length - 1];

    return res.status(201).json({
      success: true,
      message: "Address saved successfully",
      address: saved,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= UPDATE A SAVED ADDRESS ================= */
// PUT /api/user/addresses/:addressId
// Body: { label?, street?, city?, state?, pincode?, phone?, isDefault? }
const updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const { label, street, city, state, pincode, phone, isDefault } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const address = user.savedAddresses.id(addressId);
    if (!address) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }

    // If setting this as default, unset all others first
    if (isDefault) {
      user.savedAddresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    // Apply updates (only fields provided)
    if (label !== undefined) address.label = label;
    if (street !== undefined) address.street = street;
    if (city !== undefined) address.city = city;
    if (state !== undefined) address.state = state;
    if (pincode !== undefined) address.pincode = pincode;
    if (phone !== undefined) address.phone = phone;
    if (isDefault !== undefined) address.isDefault = isDefault;

    await user.save();

    return res.json({
      success: true,
      message: "Address updated successfully",
      address,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= DELETE A SAVED ADDRESS ================= */
// DELETE /api/user/addresses/:addressId
const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const addressIndex = user.savedAddresses.findIndex(
      (addr) => addr._id.toString() === addressId,
    );

    if (addressIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }

    const wasDefault = user.savedAddresses[addressIndex].isDefault;

    // Remove the address
    user.savedAddresses.splice(addressIndex, 1);

    // If deleted address was default and others remain, auto-promote first to default
    if (wasDefault && user.savedAddresses.length > 0) {
      user.savedAddresses[0].isDefault = true;
    }

    await user.save();

    return res.json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= SET DEFAULT ADDRESS ================= */
// PATCH /api/user/addresses/:addressId/default
const setDefaultAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    let found = false;
    user.savedAddresses.forEach((addr) => {
      if (addr._id.toString() === addressId) {
        addr.isDefault = true;
        found = true;
      } else {
        addr.isDefault = false;
      }
    });

    if (!found) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }

    await user.save();

    return res.json({
      success: true,
      message: "Default address updated",
      addresses: user.savedAddresses,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSavedAddresses,
  saveAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
