const mongoose = require("mongoose");
const Subcategory = require("../models/subCategory.model");
const Category = require("../models/Category.model");
const Product = require("../models/Product.model"); // Missing import added
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");

// ================= Helper Functions ================= //

// Validate ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Find category by ID or name
const findCategory = async (categoryInput) => {
  if (!categoryInput) return null;

  // Try to find by ObjectId first
  if (mongoose.Types.ObjectId.isValid(categoryInput)) {
    const cat = await Category.findById(categoryInput);
    if (cat) return cat;
  }

  // Otherwise, find by name (case-insensitive)
  const catByName = await Category.findOne({
    name: { $regex: new RegExp(`^${categoryInput.trim()}$`, "i") },
  });
  return catByName;
};

// ================= CRUD Controllers ================= //

// CREATE Subcategory
const createSubcategory = async (req, res) => {
  try {
    const { name, category, image, section } = req.body;

    // Fixed: Added section to required check
    if (!name || !category || !image || !section) {
      return res.status(400).json({
        message: "Name, category, image, and section are required",
      });
    }

    const categoryExists = await findCategory(category);
    if (!categoryExists) {
      return res.status(400).json({
        message: "Invalid category. Category does not exist.",
      });
    }

    const categoryId = categoryExists._id;

    // Prevent duplicates (based on name + category)
    const existingSubcategory = await Subcategory.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      category: categoryId,
    });

    if (existingSubcategory) {
      return res.status(400).json({
        message: "Subcategory with this name already exists in this category",
      });
    }

    const subcategory = await Subcategory.create({
      name: name.trim(),
      category: categoryId,
      image: image.trim(),
      section: section.trim(), // Added section field
    });

    const populatedSubcategory = await Subcategory.findById(
      subcategory._id,
    ).populate("category", "name");

    return res.status(201).json({
      message: "Subcategory created successfully",
      subcategory: populatedSubcategory,
    });
  } catch (error) {
    console.error("Error creating subcategory:", error);

    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: "Validation error", details: error.message });
    }
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid category ID format" });
    }
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "Duplicate subcategory name in this category" });
    }

    return res.status(500).json({ message: "Internal server error" });
  }
};

// READ All Subcategories (with pagination & filter)
const getSubcategories = async (req, res) => {
  try {
    const { category, section } = req.query;

    const filter = {};

    // Category filter
    if (category) {
      if (isValidObjectId(category)) {
        filter.category = category;
      } else {
        const categoryDoc = await Category.findOne({
          name: { $regex: new RegExp(`^${category}$`, "i") },
        });

        if (!categoryDoc) {
          return res.status(400).json({ message: "Category not found" });
        }

        filter.category = categoryDoc._id;
      }
    }

    // Section filter
    if (section) {
      filter.section = section;
    }

    // Fetch all without pagination
    const subcategories = await Subcategory.find(filter)
      .populate("category", "name")
      .sort({ name: 1 });

    const total = await Subcategory.countDocuments(filter);

    return res.status(200).json({
      message: "Subcategories retrieved successfully",
      subcategories,
      count: subcategories.length,
      total,
    });
  } catch (error) {
    console.error("Error fetching subcategories:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// READ Subcategory by ID
const getSubcategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid subcategory ID format" });
    }

    const subcategory = await Subcategory.findById(id).populate(
      "category",
      "name",
    );

    if (!subcategory) {
      return res.status(404).json({ message: "Subcategory not found" });
    }

    return res.status(200).json({
      message: "Subcategory retrieved successfully",
      subcategory,
    });
  } catch (error) {
    console.error("Error fetching subcategory:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// READ Subcategories by Category
const getSubcategoriesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    if (!isValidObjectId(categoryId)) {
      return res.status(400).json({ message: "Invalid category ID format" });
    }

    const categoryExists = await Category.findById(categoryId);
    if (!categoryExists) {
      return res.status(404).json({ message: "Category not found" });
    }

    const subcategories = await Subcategory.find({ category: categoryId })
      .populate("category", "name")
      .sort({ name: 1 });

    return res.status(200).json({
      message: "Subcategories retrieved successfully",
      category: categoryExists.name,
      subcategories,
      count: subcategories.length,
    });
  } catch (error) {
    console.error("Error fetching subcategories by category:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET All Categories with their Subcategories
const getAllCategoriesWithSubcategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });

    const results = await Promise.all(
      categories.map(async (cat) => {
        const subcategories = await Subcategory.find({ category: cat._id })
          .populate("category", "name")
          .sort({ name: 1 });

        return {
          _id: cat._id,
          name: cat.name,
          image: cat.image || null,
          subcategories,
          subcategoryCount: subcategories.length,
        };
      }),
    );

    return res.status(200).json({
      message: "Categories with subcategories retrieved successfully",
      count: results.length,
      categories: results,
    });
  } catch (error) {
    console.error("Error fetching categories with subcategories:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// UPDATE Subcategory
const updateSubcategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, image, section } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid subcategory ID format" });
    }

    // Build update data dynamically
    const updateData = {};

    if (name) {
      updateData.name = name.trim();
    }

    if (category) {
      const categoryExists = await findCategory(category);
      if (!categoryExists) {
        return res
          .status(400)
          .json({ message: "Invalid category. Category does not exist." });
      }
      updateData.category = categoryExists._id;
    }

    if (image) {
      updateData.image = image.trim();
    }

    if (section) {
      updateData.section = section.trim();
    }

    // Check for duplicate only if name or category is being updated
    if (name || category) {
      const existingSubcategory = await Subcategory.findOne({
        name: updateData.name || (await Subcategory.findById(id)).name,
        category:
          updateData.category || (await Subcategory.findById(id)).category,
        _id: { $ne: id },
      });

      if (existingSubcategory) {
        return res.status(400).json({
          message: "Subcategory with this name already exists in this category",
        });
      }
    }

    const subcategory = await Subcategory.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("category", "name");

    if (!subcategory) {
      return res.status(404).json({ message: "Subcategory not found" });
    }

    return res.status(200).json({
      message: "Subcategory updated successfully",
      subcategory,
    });
  } catch (error) {
    console.error("Error updating subcategory:", error);

    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: "Validation error", details: error.message });
    }

    return res.status(500).json({ message: "Internal server error" });
  }
};

// DELETE Subcategory
const deleteSubcategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid subcategory ID format" });
    }

    // Check if subcategory has any products before deletion (optional)
    const productsCount = await Product.countDocuments({ subcategory: id });
    if (productsCount > 0) {
      return res.status(400).json({
        message: `Cannot delete subcategory. It has ${productsCount} associated products.`,
      });
    }

    const subcategory = await Subcategory.findByIdAndDelete(id).populate(
      "category",
      "name",
    );

    if (!subcategory) {
      return res.status(404).json({ message: "Subcategory not found" });
    }

    return res.status(200).json({
      message: "Subcategory deleted successfully",
      subcategory,
    });
  } catch (error) {
    console.error("Error deleting subcategory:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET Products by Category
const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const categoryDoc = await findCategory(category);
    if (!categoryDoc) {
      return res.status(404).json({ message: "Category not found" });
    }

    const skip = (page - 1) * limit;

    const products = await Product.find({ category: categoryDoc._id })
      .populate("category", "name")
      .populate("subcategory", "name")
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments({ category: categoryDoc._id });

    return res.status(200).json({
      message: "Products retrieved successfully",
      category: categoryDoc.name,
      products,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching products by category:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// BULK UPLOAD Subcategories from CSV
const bulkUploadSubcategories = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "CSV file is required" });
    }

    const filePath = path.join(__dirname, "..", req.file.path);
    const subcategoriesToInsert = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        const name = row.name?.trim();
        const category = row.category?.trim();
        const image = row.image?.trim();
        const section = row.section?.trim(); // Added section field

        if (name && category && image && section) {
          subcategoriesToInsert.push({ name, category, image, section });
        }
      })
      .on("end", async () => {
        try {
          const inserted = [];
          const skipped = [];

          for (const sub of subcategoriesToInsert) {
            try {
              let categoryExists;

              if (mongoose.Types.ObjectId.isValid(sub.category)) {
                categoryExists = await Category.findById(sub.category);
              } else {
                categoryExists = await Category.findOne({
                  name: { $regex: new RegExp(`^${sub.category}$`, "i") },
                });
              }

              if (!categoryExists) {
                skipped.push({ ...sub, reason: "Category not found" });
                continue;
              }

              const existing = await Subcategory.findOne({
                name: { $regex: new RegExp(`^${sub.name}$`, "i") },
                category: categoryExists._id,
              });

              if (existing) {
                skipped.push({ ...sub, reason: "Duplicate subcategory" });
                continue;
              }

              const newSub = await Subcategory.create({
                name: sub.name,
                category: categoryExists._id,
                image: sub.image,
                section: sub.section,
              });

              inserted.push(newSub);
            } catch (err) {
              console.error(`Error processing subcategory ${sub.name}:`, err);
              skipped.push({ ...sub, reason: err.message });
            }
          }

          // Remove CSV file after processing
          try {
            fs.unlinkSync(filePath);
          } catch (fileErr) {
            console.error("Error removing CSV file:", fileErr);
          }

          return res.status(201).json({
            message: "Bulk subcategories upload completed",
            insertedCount: inserted.length,
            skippedCount: skipped.length,
            insertedSubcategories: inserted,
            skippedSubcategories: skipped,
          });
        } catch (processingError) {
          console.error("Error processing CSV data:", processingError);

          try {
            fs.unlinkSync(filePath);
          } catch (fileErr) {
            console.error("Error removing CSV file:", fileErr);
          }

          return res.status(500).json({
            message: "Error processing CSV data",
            error: processingError.message,
          });
        }
      })
      .on("error", (streamError) => {
        console.error("CSV parsing error:", streamError);

        try {
          fs.unlinkSync(filePath);
        } catch (fileErr) {
          console.error("Error removing CSV file:", fileErr);
        }

        return res.status(400).json({
          message: "Error parsing CSV file",
          error: streamError.message,
        });
      });
  } catch (error) {
    console.error("Error bulk uploading subcategories:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

// ================= Export ================= //
module.exports = {
  createSubcategory,
  getSubcategories,
  getSubcategoryById,
  getSubcategoriesByCategory,
  updateSubcategory,
  deleteSubcategory,
  getProductsByCategory,
  getAllCategoriesWithSubcategories,
  bulkUploadSubcategories,
};
