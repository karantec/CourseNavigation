const Complaint = require("../models/Complain.model");

// ─── Helpers ─────────────────────────────────────────────────────────────────

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const sendSuccess = (res, data, statusCode = 200) =>
  res.status(statusCode).json({ success: true, data });

const sendError = (res, message, statusCode = 400) =>
  res.status(statusCode).json({ success: false, message });

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/complaints
 * Returns all complaints (newest first).
 */
const getAllComplaints = asyncHandler(async (req, res) => {
  const complaints = await Complaint.find().sort({ createdAt: -1 });
  sendSuccess(res, complaints);
});

/**
 * GET /api/complaints/:id
 * Returns a single complaint by ID.
 */
const getComplaintById = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return sendError(res, "Complaint not found", 404);
  sendSuccess(res, complaint);
});

/**
 * POST /api/complaints
 * Creates a new complaint.
 * Required body fields: title, description, category
 */
const createComplaint = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    orderId,
    productName,
    category,
    priority,
    status,
    complainantName,
    complainantEmail,
    complainantPhone,
    attachments,
    adminNotes,
    resolution,
  } = req.body;

  // Basic validation (schema also validates, but gives cleaner messages here)
  if (!title || !description || !category) {
    return sendError(res, "Title, description and category are required");
  }

  const complaint = await Complaint.create({
    title,
    description,
    orderId,
    productName,
    category,
    priority,
    status,
    complainantName,
    complainantEmail,
    complainantPhone,
    attachments,
    adminNotes,
    resolution,
  });

  sendSuccess(res, complaint, 201);
});

/**
 * PUT /api/complaints/:id
 * Updates an existing complaint (full or partial update).
 */
const updateComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return sendError(res, "Complaint not found", 404);

  const allowedFields = [
    "title",
    "description",
    "orderId",
    "productName",
    "category",
    "priority",
    "status",
    "complainantName",
    "complainantEmail",
    "complainantPhone",
    "attachments",
    "adminNotes",
    "resolution",
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      complaint[field] = req.body[field];
    }
  });

  await complaint.save();
  sendSuccess(res, complaint);
});

/**
 * DELETE /api/complaints/:id
 * Deletes a complaint by ID.
 */
const deleteComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return sendError(res, "Complaint not found", 404);

  await complaint.deleteOne();
  sendSuccess(res, { message: "Complaint deleted successfully" });
});

/**
 * GET /api/complaints/order/:orderId
 * Returns complaints filtered by order ID
 */
const getComplaintsByOrderId = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  if (!orderId) {
    return sendError(res, "Order ID is required", 400);
  }

  const complaints = await Complaint.find({ orderId }).sort({ createdAt: -1 });
  sendSuccess(res, complaints);
});

/**
 * GET /api/complaints/product/:productName
 * Returns complaints filtered by product name (partial match)
 */
const getComplaintsByProductName = asyncHandler(async (req, res) => {
  const { productName } = req.params;

  if (!productName) {
    return sendError(res, "Product name is required", 400);
  }

  const complaints = await Complaint.find({
    productName: { $regex: productName, $options: "i" },
  }).sort({ createdAt: -1 });

  sendSuccess(res, complaints);
});

// ─── New Status Management Controllers ─────────────────────────────────────────────

/**
 * PATCH /api/complaints/:id/status
 * Updates complaint status and resolution (for users)
 * Allows users to mark complaint as Resolved/Rejected with resolution notes
 */
const updateComplaintStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, resolution } = req.body;

  // Validate status
  const allowedStatuses = ["Resolved", "Rejected"];
  if (!allowedStatuses.includes(status)) {
    return sendError(
      res,
      "Status must be either 'Resolved' or 'Rejected'",
      400,
    );
  }

  // Resolution is required when marking as resolved or rejected
  if (!resolution || !resolution.trim()) {
    return sendError(
      res,
      "Resolution details are required when updating status",
      400,
    );
  }

  const complaint = await Complaint.findById(id);
  if (!complaint) {
    return sendError(res, "Complaint not found", 404);
  }

  // Check if complaint is already resolved/rejected
  if (complaint.status === "Resolved" || complaint.status === "Rejected") {
    return sendError(
      res,
      `Complaint is already ${complaint.status.toLowerCase()}`,
      400,
    );
  }

  // Update the complaint
  complaint.status = status;
  complaint.resolution = resolution.trim();

  // Add timestamp for when it was resolved/rejected
  complaint.resolvedAt = new Date();

  await complaint.save();

  sendSuccess(res, {
    id: complaint._id,
    status: complaint.status,
    resolution: complaint.resolution,
    resolvedAt: complaint.resolvedAt,
    message: `Complaint has been marked as ${status.toLowerCase()}`,
  });
});

/**
 * PATCH /api/complaints/:id/resolution
 * Adds or updates resolution notes (admin only or extended user)
 */
const updateResolution = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { resolution, adminNotes } = req.body;

  const complaint = await Complaint.findById(id);
  if (!complaint) {
    return sendError(res, "Complaint not found", 404);
  }

  if (resolution !== undefined) {
    complaint.resolution = resolution.trim();
  }

  if (adminNotes !== undefined) {
    complaint.adminNotes = adminNotes.trim();
  }

  await complaint.save();

  sendSuccess(res, {
    resolution: complaint.resolution,
    adminNotes: complaint.adminNotes,
  });
});

/**
 * GET /api/complaints/status/:status
 * Returns complaints filtered by status (Pending, In Review, Resolved, Rejected)
 */
const getComplaintsByStatus = asyncHandler(async (req, res) => {
  const { status } = req.params;
  const validStatuses = ["Pending", "In Review", "Resolved", "Rejected"];

  if (!validStatuses.includes(status)) {
    return sendError(
      res,
      "Invalid status. Valid options: Pending, In Review, Resolved, Rejected",
      400,
    );
  }

  const complaints = await Complaint.find({ status }).sort({ createdAt: -1 });
  sendSuccess(res, complaints);
});

/**
 * GET /api/complaints/priority/:priority
 * Returns complaints filtered by priority (Low, Medium, High, Urgent)
 */
const getComplaintsByPriority = asyncHandler(async (req, res) => {
  const { priority } = req.params;
  const validPriorities = ["Low", "Medium", "High", "Urgent"];

  if (!validPriorities.includes(priority)) {
    return sendError(
      res,
      "Invalid priority. Valid options: Low, Medium, High, Urgent",
      400,
    );
  }

  const complaints = await Complaint.find({ priority }).sort({ createdAt: -1 });
  sendSuccess(res, complaints);
});

/**
 * GET /api/complaints/stats/summary
 * Returns summary statistics about complaints
 */
const getComplaintStats = asyncHandler(async (req, res) => {
  const stats = await Complaint.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] } },
        inReview: {
          $sum: { $cond: [{ $eq: ["$status", "In Review"] }, 1, 0] },
        },
        resolved: { $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ["$status", "Rejected"] }, 1, 0] } },
        highPriority: {
          $sum: { $cond: [{ $eq: ["$priority", "High"] }, 1, 0] },
        },
        mediumPriority: {
          $sum: { $cond: [{ $eq: ["$priority", "Medium"] }, 1, 0] },
        },
        lowPriority: { $sum: { $cond: [{ $eq: ["$priority", "Low"] }, 1, 0] } },
        urgentPriority: {
          $sum: { $cond: [{ $eq: ["$priority", "Urgent"] }, 1, 0] },
        },
      },
    },
    {
      $project: {
        _id: 0,
        total: 1,
        pending: 1,
        inReview: 1,
        resolved: 1,
        rejected: 1,
        highPriority: 1,
        mediumPriority: 1,
        lowPriority: 1,
        urgentPriority: 1,
      },
    },
  ]);

  sendSuccess(
    res,
    stats[0] || {
      total: 0,
      pending: 0,
      inReview: 0,
      resolved: 0,
      rejected: 0,
      highPriority: 0,
      mediumPriority: 0,
      lowPriority: 0,
      urgentPriority: 0,
    },
  );
});

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  // Existing exports
  getAllComplaints,
  getComplaintById,
  createComplaint,
  updateComplaint,
  deleteComplaint,

  // New exports for order/product filtering
  getComplaintsByOrderId,
  getComplaintsByProductName,

  // New exports for status management
  updateComplaintStatus,
  updateResolution,
  getComplaintsByStatus,
  getComplaintsByPriority,
  getComplaintStats,
};
