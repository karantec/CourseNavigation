const express = require("express");

const {
  getAllComplaints,
  getComplaintById,
  createComplaint,
  updateComplaint,
  deleteComplaint,
  updateComplaintStatus,
  updateResolution,
  getComplaintsByStatus,
  getComplaintsByPriority,
  getComplaintStats,
  getComplaintsByOrderId,
  getComplaintsByProductName,
} = require("../controllers/Complaint.Controller");

const router = express.Router();

// Base routes
router
  .route("/")
  .get(getAllComplaints) // GET  – list all
  .post(createComplaint); // POST – create new

// Single complaint routes
router
  .route("/:id")
  .get(getComplaintById) // GET    – single record
  .put(updateComplaint) // PUT    – full / partial update
  .delete(deleteComplaint); // DELETE – remove

// Status management routes
router.patch("/:id/status", updateComplaintStatus); // Update complaint status
router.patch("/:id/resolution", updateResolution); // Update resolution notes

// Filter and statistics routes
router.get("/filter/status/:status", getComplaintsByStatus); // Get by status
router.get("/filter/priority/:priority", getComplaintsByPriority); // Get by priority
router.get("/stats/summary", getComplaintStats); // Get statistics

// Order and Product filtering routes (NEW)
router.get("/order/:orderId", getComplaintsByOrderId); // Get complaints by order ID
router.get("/product/:productName", getComplaintsByProductName); // Get complaints by product name

module.exports = router;
