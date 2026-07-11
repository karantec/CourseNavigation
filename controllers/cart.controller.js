// controllers/cartController.js

const Cart = require("../models/Cart.model");
const Product = require("../models/Product.model");

// ---------------- GET USER CART ----------------
const userCart = async (req, res) => {
  const userId = req.query.userId || req.params.userId;
  if (!userId) return res.status(400).json({ message: "userId is required" });

  try {
    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(200).json({
        items: [],
        subTotal: 0,
        grandTotal: 0,
      });
    }

    // Assign designId to designs that don't have it
cart.items.forEach((item) => {
  item.designs.forEach((d) => {
    if (!d.designId) {
      d.designId = d._id.toString();
    }
  });
});

// Save to persist the changes
await cart.save();

    res.status(200).json({
      items: cart.items,
      subTotal: cart.subTotal,
      grandTotal: cart.grandTotal,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------------- ADD TO CART ----------------
const addToCart = async (req, res) => {
  const { userId, productId, configs = [], offers = [] } = req.body;

  if (!userId || !productId)
    return res.status(400).json({ message: "Missing fields" });

  // 🔥 ADD THIS VALIDATION
  if (!configs || configs.length === 0) {
    return res.status(400).json({ message: "No configurations provided" });
  }

  const normalizedConfigs = configs.map((c) => {
    const rawConfig = c.config || c;

    const cleanedConfig = { ...rawConfig };

    delete cleanedConfig.quantity;
    delete cleanedConfig.__designId;
    delete cleanedConfig.designId;

    return {
      config: cleanedConfig,
      quantity: c.quantity || 1,
      designId: c.designId,
    };
  });

  try {
    let cart = await Cart.findOne({ user: userId });
    if (!cart) cart = new Cart({ user: userId });

    const product = await Product.findById(productId).lean();
    if (!product) return res.status(404).json({ message: "Product not found" });
    console.log("PRICE GOING INTO CART:", product.price);

    let index = cart.items.findIndex(
      (i) => i.productId.toString() === productId,
    );

    if (index > -1) {
      // 🔥 UPDATE EXISTING PRODUCT
      if (!cart.items[index].customizations) {
        cart.items[index].customizations = product.customizations || [];
      }

      normalizedConfigs.forEach((newDesign) => {
        // 🔥 IF designId EXISTS → UPDATE EXISTING DESIGN
        if (newDesign.designId) {
          const existingDesign = cart.items[index].designs.find(
            (d) => d.designId === newDesign.designId
          );

          if (existingDesign) {
            existingDesign.config = newDesign.config;
            existingDesign.quantity = newDesign.quantity || 1;
            existingDesign.offers = offers || [];
          } else {
            // Design with this ID not found, add as new
            cart.items[index].designs.push({
              config: newDesign.config,
              quantity: newDesign.quantity || 1,
              offers: offers || [],
              designId: newDesign.designId,
            });
          }
        } else {
          // 🔥 NEW DESIGN (no designId yet)
          cart.items[index].designs.push({
            config: newDesign.config,
            quantity: newDesign.quantity || 1,
            offers: offers || [],
            designId: undefined, // Will get MongoDB _id on save
          });
        }
      });

      // 🔥 REMOVE DESIGNS NOT IN UPDATE (only for updates with designId)
      const designIdsToKeep = normalizedConfigs
        .filter((c) => c.designId) // Only filter if we have designIds
        .map((c) => c.designId);

      if (designIdsToKeep.length > 0) {
        cart.items[index].designs = cart.items[index].designs.filter((d) =>
          designIdsToKeep.includes(d.designId)
        );
      }
    } else {
      // 🔥 NEW PRODUCT
      cart.items.push({
        productId: product._id,
        name: product.name,
        image: product.images?.[0] || "",
        price: product.discountedMRP || product.price,
        customizations: product.customizations || [],
        designs: normalizedConfigs.map((c) => ({
          config: c.config,
          quantity: c.quantity || 1,
          offers: offers || [],
          designId: c.designId, // Include designId (may be undefined for new)
        })),
      });
    }

    await cart.save();

    res.status(200).json({
      message: "Added to cart",
      items: cart.items,
      subTotal: cart.subTotal,
      grandTotal: cart.grandTotal,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------------- UPDATE QUANTITY ----------------
const updateQuantity = async (req, res) => {
  const { userId, productId, designId, quantity } = req.body;

  try {
    if (!userId || !productId || !designId) {
      return res.status(400).json({ message: "Missing fields" });
    }

    if (!quantity || isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({ message: "Invalid quantity" });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find((i) => i.productId.toString() === productId);

    if (!item) return res.status(404).json({ message: "Item not found" });

    const design = item.designs.find((d) => d.designId === designId);
    if (!design) return res.status(404).json({ message: "Design not found" });

    design.quantity = Number(quantity);

    await cart.save();

    res.status(200).json({
      message: "Quantity updated",
      items: cart.items,
      subTotal: cart.subTotal,
      grandTotal: cart.grandTotal,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------------- REMOVE FROM CART ----------------
const removeFromCart = async (req, res) => {
  const { userId, productId, designId } = req.body;

  try {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find((i) => i.productId.toString() === productId);

    if (!item) return res.status(404).json({ message: "Item not found" });

    // 🔥 REMOVE SPECIFIC DESIGN BY ID
item.designs = item.designs.filter((d) => d.designId !== designId);

    // 🔥 If no designs left → remove product completely
    if (item.designs.length === 0) {
      cart.items = cart.items.filter(
        (i) => i.productId.toString() !== productId,
      );
    }

    await cart.save();

    res.status(200).json({
      message: "Item removed",
      items: cart.items,
      subTotal: cart.subTotal,
      grandTotal: cart.grandTotal,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  userCart,
  addToCart,
  updateQuantity,
  removeFromCart,
};
