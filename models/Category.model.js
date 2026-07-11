const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      unique: true,
    },
    image: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Check if model exists before creating it
const Category =
  mongoose.models.Category || mongoose.model("Category", categorySchema);

module.exports = Category;
