const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    label: { type: String, required: true }, // "📹 Video" / "📋 Doc"
    url: { type: String, required: true }, // Google Drive link
  },
  { _id: false },
);

const sessionSchema = new mongoose.Schema(
  {
    sessionNumber: { type: Number, required: true }, // 1, 2, 3...
    title: { type: String, required: true }, // "LLD Introduction + Core Concepts"
    subtitle: { type: String }, // "Foundation★ Start Here"
    resources: [resourceSchema], // [{ label, url }]
    serialNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    questionLink: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["Basic", "Standard", "Non Standard"],
      // basic - green, standard - green, non standard - red
      required: true,
    },
  },
  { _id: true, timestamps: true },
);

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true }, // "Low Level Design"
    totalSessions: { type: Number, default: 0 },
    sessions: [sessionSchema],
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Course", courseSchema);
