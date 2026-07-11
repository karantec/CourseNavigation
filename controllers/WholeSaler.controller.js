const WholeSaler = require("../models/WholeSaler.model");
const jwt = require("jsonwebtoken");

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// @desc    Register a new wholesaler
// @route   POST /api/wholesalers/register
// @access  Public
exports.registerWholeSaler = async (req, res) => {
  try {
    const { storeName, email, pin, phoneNumber, city, address } = req.body;

    // Check if wholesaler already exists
    const existingWholesaler = await WholeSaler.findOne({
      $or: [{ email }, { phoneNumber }, { storeName }],
    });
    if (existingWholesaler) {
      return res.status(400).json({
        success: false,
        message:
          "Wholesaler already exists with this email, phone number, or store name",
      });
    }

    // Create wholesaler
    const wholesaler = await WholeSaler.create({
      storeName,
      email,
      pin,
      phoneNumber,
      city,
      address,
    });

    // Generate token
    const token = generateToken(wholesaler._id);

    res.status(201).json({
      success: true,
      message: "Wholesaler registered successfully",
      token,
      wholesaler: {
        _id: wholesaler._id,
        storeName: wholesaler.storeName,
        email: wholesaler.email,
        pin: wholesaler.pin,
        phoneNumber: wholesaler.phoneNumber,
        city: wholesaler.city,
        address: wholesaler.address,
      },
    });
  } catch (error) {
    console.error("Register Wholesaler Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Login wholesaler
// @route   POST /api/wholesalers/login
// @access  Public
exports.loginWholeSaler = async (req, res) => {
  try {
    const { email, pin } = req.body;

    // Check if wholesaler exists
    const wholesaler = await WholeSaler.findOne({ email });
    if (!wholesaler) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or PIN",
      });
    }

    // Check PIN
    if (wholesaler.pin !== pin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or PIN",
      });
    }

    // Generate token
    const token = generateToken(wholesaler._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      wholesaler: {
        _id: wholesaler._id,
        storeName: wholesaler.storeName,
        email: wholesaler.email,
        pin: wholesaler.pin,
        phoneNumber: wholesaler.phoneNumber,
        city: wholesaler.city,
        address: wholesaler.address,
      },
    });
  } catch (error) {
    console.error("Login Wholesaler Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all wholesalers
// @route   GET /api/wholesalers
// @access  Public/Admin
exports.getAllWholesalers = async (req, res) => {
  try {
    const wholesalers = await WholeSaler.find({})
      .select("-__v")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: wholesalers.length,
      wholesalers,
    });
  } catch (error) {
    console.error("Get All Wholesalers Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get wholesaler by ID
// @route   GET /api/wholesalers/:id
// @access  Private/Admin
exports.getWholesalerById = async (req, res) => {
  try {
    const wholesaler = await WholeSaler.findById(req.params.id).select("-__v");

    if (!wholesaler) {
      return res.status(404).json({
        success: false,
        message: "Wholesaler not found",
      });
    }

    res.status(200).json({
      success: true,
      wholesaler,
    });
  } catch (error) {
    console.error("Get Wholesaler By ID Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get current logged in wholesaler
// @route   GET /api/wholesalers/me
// @access  Private
exports.getCurrentWholesaler = async (req, res) => {
  try {
    const wholesaler = await WholeSaler.findById(req.user._id).select("-__v");

    if (!wholesaler) {
      return res.status(404).json({
        success: false,
        message: "Wholesaler not found",
      });
    }

    res.status(200).json({
      success: true,
      wholesaler,
    });
  } catch (error) {
    console.error("Get Current Wholesaler Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update wholesaler
// @route   PUT /api/wholesalers/:id
// @access  Private/Admin
exports.updateWholesaler = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if wholesaler exists
    const wholesaler = await WholeSaler.findById(id);
    if (!wholesaler) {
      return res.status(404).json({
        success: false,
        message: "Wholesaler not found",
      });
    }

    // Check for duplicate email/phone/storeName if being updated
    if (updates.email && updates.email !== wholesaler.email) {
      const existingEmail = await WholeSaler.findOne({ email: updates.email });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
        });
      }
    }

    if (updates.phoneNumber && updates.phoneNumber !== wholesaler.phoneNumber) {
      const existingPhone = await WholeSaler.findOne({
        phoneNumber: updates.phoneNumber,
      });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: "Phone number already in use",
        });
      }
    }

    if (updates.storeName && updates.storeName !== wholesaler.storeName) {
      const existingStore = await WholeSaler.findOne({
        storeName: updates.storeName,
      });
      if (existingStore) {
        return res.status(400).json({
          success: false,
          message: "Store name already in use",
        });
      }
    }

    // Update wholesaler
    const updatedWholesaler = await WholeSaler.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).select("-__v");

    res.status(200).json({
      success: true,
      message: "Wholesaler updated successfully",
      wholesaler: updatedWholesaler,
    });
  } catch (error) {
    console.error("Update Wholesaler Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete wholesaler
// @route   DELETE /api/wholesalers/:id
// @access  Private/Admin
exports.deleteWholesaler = async (req, res) => {
  try {
    const { id } = req.params;

    const wholesaler = await WholeSaler.findById(id);
    if (!wholesaler) {
      return res.status(404).json({
        success: false,
        message: "Wholesaler not found",
      });
    }

    await wholesaler.deleteOne();

    res.status(200).json({
      success: true,
      message: "Wholesaler deleted successfully",
    });
  } catch (error) {
    console.error("Delete Wholesaler Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
exports.addAddress = async (req, res) => {
  try {
    const wholesalerId = req.user._id;

    const {
      fullName,
      phoneNumber,
      pincode,
      city,
      state,
      country,
      addressLine1,
      addressLine2,
      landmark,
      isDefault,
    } = req.body;

    const wholesaler = await WholeSaler.findById(wholesalerId);

    if (!wholesaler) {
      return res.status(404).json({
        success: false,
        message: "Wholesaler not found",
      });
    }

    // If default address selected remove old default
    if (isDefault) {
      wholesaler.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    wholesaler.addresses.push({
      fullName,
      phoneNumber,
      pincode,
      city,
      state,
      country,
      addressLine1,
      addressLine2,
      landmark,
      isDefault,
    });

    await wholesaler.save();

    res.status(201).json({
      success: true,
      message: "Address added successfully",
      addresses: wholesaler.addresses,
    });
  } catch (error) {
    console.error("Add Address Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Get All Addresses
// ===============================
exports.getAddresses = async (req, res) => {
  try {
    const wholesaler = await WholeSaler.findById(req.user._id);

    if (!wholesaler) {
      return res.status(404).json({
        success: false,
        message: "Wholesaler not found",
      });
    }

    res.status(200).json({
      success: true,
      addresses: wholesaler.addresses,
    });
  } catch (error) {
    console.error("Get Addresses Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Update Address
// ===============================
exports.updateAddress = async (req, res) => {
  try {
    const wholesaler = await WholeSaler.findById(req.user._id);

    if (!wholesaler) {
      return res.status(404).json({
        success: false,
        message: "Wholesaler not found",
      });
    }

    const address = wholesaler.addresses.id(req.params.addressId);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    // Remove previous default
    if (req.body.isDefault) {
      wholesaler.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    Object.keys(req.body).forEach((key) => {
      address[key] = req.body[key];
    });

    await wholesaler.save();

    res.status(200).json({
      success: true,
      message: "Address updated successfully",
      addresses: wholesaler.addresses,
    });
  } catch (error) {
    console.error("Update Address Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Delete Address
// ===============================
exports.deleteAddress = async (req, res) => {
  try {
    const wholesaler = await WholeSaler.findById(req.user._id);

    if (!wholesaler) {
      return res.status(404).json({
        success: false,
        message: "Wholesaler not found",
      });
    }

    const address = wholesaler.addresses.id(req.params.addressId);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    address.deleteOne();

    await wholesaler.save();

    res.status(200).json({
      success: true,
      message: "Address deleted successfully",
      addresses: wholesaler.addresses,
    });
  } catch (error) {
    console.error("Delete Address Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// Set Default Address
// ===============================
exports.setDefaultAddress = async (req, res) => {
  try {
    const wholesaler = await WholeSaler.findById(req.user._id);

    if (!wholesaler) {
      return res.status(404).json({
        success: false,
        message: "Wholesaler not found",
      });
    }

    wholesaler.addresses.forEach((addr) => {
      addr.isDefault = false;
    });

    const address = wholesaler.addresses.id(req.params.addressId);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    address.isDefault = true;

    await wholesaler.save();

    res.status(200).json({
      success: true,
      message: "Default address updated",
      addresses: wholesaler.addresses,
    });
  } catch (error) {
    console.error("Set Default Address Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
