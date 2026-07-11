// const Razorpay = require("razorpay");
// const crypto = require("crypto");
// const Order = require("../models/Order.model");
// const Cart = require("../models/Cart.model");
// const product = require("../models/Product.model");

// // Initialize Razorpay
// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// // 🔹 Create Order
// const createOrder = async (req, res) => {
//   try {
//     const { _id: userId } = req.user || {};
//     const { shippingAddress, paymentMethod, cartId } = req.body;

//     if (!userId) {
//       return res.status(403).json({ message: "User authentication failed" });
//     }

//     if (!cartId) {
//       return res
//         .status(400)
//         .json({ message: "Cart ID and User ID are required" });
//     }

//     const cart = await Cart.findOne({ _id: cartId }).populate(
//       "items.productId"
//     );
//     if (!cart || cart.items.length === 0) {
//       return res.status(400).json({ message: "Cart is empty" });
//     }

//     let totalAmount = 0;
//     const orderItems = [];

//     for (const item of cart.items) {
//       const product = item.productId;

//       if (!product) {
//         return res.status(400).json({
//           message: `Invalid product: ${item?.productId || "unknown"}`,
//         });
//       }

//       const priceDetails = await product.getCurrentPrice();
//       const latestBasePrice = parseFloat(priceDetails.currentTotalPrice);
//       if (isNaN(latestBasePrice)) {
//         return res
//           .status(400)
//           .json({ message: "Unable to get latest product price" });
//       }

//       const priceWithGST = +(latestBasePrice * 1.03).toFixed(2);
//       const totalItemPrice = +(priceWithGST * item.quantity).toFixed(2);
//       totalAmount += totalItemPrice;

//       orderItems.push({
//         productId: product._id,
//         quantity: item.quantity,
//         priceAtTimeOfAdding: priceWithGST,
//         productSnapshot: {
//           name: product.name,
//           description: product.description,
//           category: product.category,
//           image: product.image,
//         },
//       });
//     }

//     const newOrderData = {
//       userId,
//       cartId: cart._id,
//       items: orderItems,
//       totalAmount,
//       shippingAddress,
//       paymentMethod,
//       paymentStatus: paymentMethod === "COD" ? "Pending" : "Pending",
//       orderStatus: paymentMethod === "COD" ? "ORDER PLACED" : "Created",
//       orderDate: new Date(),
//     };

//     // ✅ Razorpay payment method with max limit check
//     if (paymentMethod === "ONLINE") {
//       const amountInPaisa = Math.round(totalAmount * 100);
//       const MAX_RAZORPAY_AMOUNT = 50000000 * 100; // ₹5,00,000 in paisa

//       if (amountInPaisa > MAX_RAZORPAY_AMOUNT) {
//         return res.status(400).json({
//           message:
//             "Order amount exceeds Razorpay’s ₹5,00,000 limit. Please split your cart.",
//         });
//       }

//       const razorpayOrder = await razorpay.orders.create({
//         amount: amountInPaisa,
//         currency: "INR",
//         receipt: `order_rcptid_${cart._id}`,
//         payment_capture: 1,
//       });

//       newOrderData.razorpay = {
//         orderId: razorpayOrder.id,
//         orderDetails: razorpayOrder,
//       };
//     }

//     const newOrder = new Order(newOrderData);
//     await newOrder.save();

//     for (const item of cart.items) {
//       await product.findByIdAndUpdate(item.productId._id, {
//         isAvailable: false,
//       });
//     }

//     await Cart.findByIdAndUpdate(cartId, { $set: { items: [] } });

//     res.status(201).json({
//       message: "Order created successfully",
//       order: newOrder,
//       razorpayOrder: newOrder.razorpay?.orderDetails || null,
//     });
//   } catch (error) {
//     console.error("🔥 Error creating order:", error);
//     res
//       .status(500)
//       .json({ message: "Internal server error", error: error.message });
//   }
// };

// const verifyPayment = async (req, res) => {
//   try {
//     const {
//       razorpay_order_id,
//       razorpay_payment_id,
//       razorpay_signature,
//       orderId, // our own order _id in DB
//     } = req.body;

//     // Step 1: Verify Razorpay signature
//     const generatedSignature = crypto
//       .createHmac("sha256", process.env.RAZORPAY_SECRET)
//       .update(razorpay_order_id + "|" + razorpay_payment_id)
//       .digest("hex");

//     if (generatedSignature !== razorpay_signature) {
//       return res.status(400).json({ message: "Payment verification failed" });
//     }

//     // Step 2: Update order status in DB
//     const updatedOrder = await Order.findByIdAndUpdate(
//       orderId,
//       {
//         paymentStatus: "Paid",
//         orderStatus: "ORDER PLACED",
//         "razorpay.paymentId": razorpay_payment_id,
//         "razorpay.signature": razorpay_signature,
//       },
//       { new: true }
//     );

//     if (!updatedOrder) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     res.status(200).json({
//       message: "Payment verified successfully",
//       order: updatedOrder,
//     });
//   } catch (error) {
//     console.error("🔥 Error verifying payment:", error);
//     res
//       .status(500)
//       .json({ message: "Internal server error", error: error.message });
//   }
// };

// const getOrdersByUser = async (req, res) => {
//   try {
//     const { _id: userId } = req.user || {};

//     const orders = await Order.find({ userId })
//       .populate({
//         path: "cartId",
//         populate: {
//           path: "items.productId",
//           model: "product",
//         },
//       })
//       .sort({ createdAt: -1 });

//     res.status(200).json(orders);
//   } catch (error) {
//     console.error("🔥 Error in getOrdersByUser:", error);
//     res
//       .status(500)
//       .json({ message: "Internal server error", error: error.message });
//   }
// };

// const getOrderById = async (req, res) => {
//   try {
//     const order = await Order.findById(req.params.id).populate({
//       path: "cartId",
//       populate: {
//         path: "items.productId",
//         model: "product",
//       },
//     });

//     if (!order) return res.status(404).json({ message: "Order not found" });

//     res.status(200).json(order);
//   } catch (error) {
//     console.error("🔥 Error in getOrderById:", error);
//     res
//       .status(500)
//       .json({ message: "Internal server error", error: error.message });
//   }
// };
// const getAllOrders = async (req, res) => {
//   try {
//     const orders = await Order.find()
//       .populate({
//         path: "cartId",
//         populate: {
//           path: "items.productId",
//           model: "product",
//         },
//       })
//       .sort({ createdAt: -1 });

//     res.status(200).json(orders);
//   } catch (error) {
//     console.error("🔥 Error in getAllOrders:", error);
//     res
//       .status(500)
//       .json({ message: "Internal server error", error: error.message });
//   }
// };

// module.exports = {
//   createOrder,
//   getOrdersByUser,
//   verifyPayment,
//   getOrderById,
//   getAllOrders,
// };
