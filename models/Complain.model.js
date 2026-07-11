const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
});

const complaintSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    orderId: {
      type: String,
      trim: true,
      default: "",
      index: true, // Add index for faster queries by orderId
    },
    productName: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "Product Quality",
        "Delivery Issue",
        "Customer Service",
        "Billing / Payment",
        "Technical Issue",
        "Other",
      ],
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Pending", "In Review", "Resolved", "Rejected"],
      default: "Pending",
    },
    complainantName: { type: String, trim: true, default: "" },
    complainantEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    complainantPhone: { type: String, trim: true, default: "" },
    attachments: { type: [attachmentSchema], default: [] },
    adminNotes: { type: String, trim: true, default: "" },
    resolution: { type: String, trim: true, default: "" },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// Add index for better query performance
complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ priority: 1 });
complaintSchema.index({ category: 1 });
complaintSchema.index({ orderId: 1 }); // Index for orderId

module.exports = mongoose.model("Complaint", complaintSchema);
