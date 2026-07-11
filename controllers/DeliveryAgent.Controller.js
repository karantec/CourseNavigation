const Order = require("../models/Order");
const DeliveryPartner = require("../models/DeliveryPartner");
const io = require("../socket").getIO();

/* -----------------------------------------------------
   1) GET ALL AVAILABLE ORDERS FOR THIS DELIVERY AGENT
----------------------------------------------------- */
exports.getAvailableOrders = async (req, res) => {
  try {
    const vendorId = req.agent.vendorId; // agent belongs to a vendor/store

    const orders = await Order.find({
      "selectedStore.storeId": vendorId,
      status: { $in: ["VENDOR_ACCEPTED", "READY_FOR_PICKUP"] },
    }).sort({ createdAt: 1 });

    return res.json({ success: true, orders });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server Error" });
  }
};

/* -----------------------------------------------------
   2) DELIVERY AGENT ACCEPTS ORDER
----------------------------------------------------- */
exports.acceptOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const agent = req.agent;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Create snapshot of agent details
    const agentSnapshot = {
      partnerId: agent._id,
      name: agent.name,
      phone: agent.phone,
      vehicleType: agent.vehicleType,
      vehicleNumber: agent.vehicleNumber,
    };

    order.deliveryAgent = agentSnapshot;
    order.status = "AGENT_ASSIGNED";
    order.agentAssignedAt = new Date();

    order.events.push({
      status: "AGENT_ASSIGNED",
      actor: "AGENT",
      actorId: agent._id,
    });

    await order.save();

    // Notify user & vendor
    io.to(orderId).emit("statusUpdate", {
      status: "AGENT_ASSIGNED",
      agent: agentSnapshot,
    });

    return res.json({ success: true, order });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server Error" });
  }
};

/* -----------------------------------------------------
   3) DELIVERY AGENT PICKS UP ORDER
----------------------------------------------------- */
exports.pickUpOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const agent = req.agent;

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        status: "PICKED_UP",
        pickedUpAt: new Date(),
        $push: {
          events: { status: "PICKED_UP", actor: "AGENT", actorId: agent._id },
        },
      },
      { new: true }
    );

    io.to(orderId).emit("statusUpdate", { status: "PICKED_UP" });

    return res.json({ success: true, order });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server Error" });
  }
};

/* -----------------------------------------------------
   4) ORDER IS OUT FOR DELIVERY
----------------------------------------------------- */
exports.outForDelivery = async (req, res) => {
  try {
    const { orderId } = req.params;
    const agent = req.agent;

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        status: "OUT_FOR_DELIVERY",
        outForDeliveryAt: new Date(),
        $push: {
          events: {
            status: "OUT_FOR_DELIVERY",
            actor: "AGENT",
            actorId: agent._id,
          },
        },
      },
      { new: true }
    );

    io.to(orderId).emit("statusUpdate", { status: "OUT_FOR_DELIVERY" });

    return res.json({ success: true, order });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server Error" });
  }
};

/* -----------------------------------------------------
   5) LIVE LOCATION UPDATES (Every 5 seconds)
----------------------------------------------------- */
exports.updateLocation = async (req, res) => {
  try {
    const { orderId, lat, lng } = req.body;

    if (!lat || !lng)
      return res.status(400).json({ message: "Location missing" });

    // Update order location
    await Order.findByIdAndUpdate(orderId, {
      deliveryAgentLocation: { lat, lng, updatedAt: new Date() },
    });

    // Update agent live location
    await DeliveryPartner.findByIdAndUpdate(req.agent._id, {
      currentLocation: { lat, lng, updatedAt: new Date() },
    });

    // Send live location to customer app
    io.to(orderId).emit("locationUpdate", { lat, lng });

    return res.json({ success: true });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server Error" });
  }
};

/* -----------------------------------------------------
   6) DELIVER ORDER (with photo proof + COD)
----------------------------------------------------- */
exports.deliverOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { note, cashCollected } = req.body;

    const file = req.file;
    const photoUrl = file ? `/uploads/${file.filename}` : null;

    const agent = req.agent;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Mark as delivered
    order.status = "DELIVERED";
    order.deliveredAt = new Date();

    order.deliveryProof = {
      photoUrl,
      note,
    };

    // Payment handling
    if (order.paymentMethod === "COD") {
      order.paymentStatus = "PAID";
      order.cashCollected = cashCollected || 0;
    }

    order.events.push({
      status: "DELIVERED",
      actor: "AGENT",
      actorId: agent._id,
    });

    await order.save();

    io.to(orderId).emit("statusUpdate", { status: "DELIVERED" });

    return res.json({ success: true, order });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server Error" });
  }
};
