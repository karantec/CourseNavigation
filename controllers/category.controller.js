const Category = require("../models/Category.model");
const SubCategory = require("../models/subCategory.model");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");
// Create Category
const createcategory = async (req, res) => {
  try {
    const { name, image } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Name is required",
      });
    }

    const existingCategory = await Category.findOne({
      name: name.trim().toLowerCase(),
    });

    if (existingCategory) {
      return res.status(400).json({
        message: "Category with this name already exists",
      });
    }

    const newCategory = new Category({
      name: name.trim(),
      image,
    });

    await newCategory.save();

    res.status(201).json({
      message: "Category created successfully",
      category: newCategory,
    });
  } catch (error) {
    console.error("Error in createcategory:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation error",
        details: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        message: "Category with this name already exists",
      });
    }

    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

// Get All Categories
const getAllCategories = async (req, res) => {
  try {
    const { search } = req.query;

    const filter = {};
    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const categories = await Category.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      message: "Categories retrieved successfully",
      categories,
      count: categories.length,
    });
  } catch (error) {
    console.error("Error in getAllCategories:", error);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};
const bulkUploadCategories = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "CSV file is required" });
    }

    const filePath = path.join(__dirname, "../uploads", req.file.filename);
    const categoriesData = [];

    // Read and parse CSV
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        // Expecting CSV columns: name,image
        if (row.name) {
          categoriesData.push({
            name: row.name.trim(),
            image: row.image ? row.image.trim() : null,
          });
        }
      })
      .on("end", async () => {
        try {
          const insertedCategories = [];
          const skippedCategories = [];

          for (let category of categoriesData) {
            // Check if category already exists
            const exists = await Category.findOne({
              name: category.name.toLowerCase(),
            });

            if (!exists) {
              const newCategory = new Category({
                name: category.name,
                image: category.image,
              });
              await newCategory.save();
              insertedCategories.push(newCategory);
            } else {
              skippedCategories.push(category.name);
            }
          }

          // Delete CSV after processing
          fs.unlinkSync(filePath);

          return res.status(201).json({
            message: "Bulk categories uploaded successfully",
            insertedCount: insertedCategories.length,
            skippedCount: skippedCategories.length,
            insertedCategories,
            skippedCategories,
          });
        } catch (error) {
          console.error("Error in bulkUploadCategories:", error);
          return res.status(500).json({
            message: "Error saving categories",
            error: error.message,
          });
        }
      });
  } catch (error) {
    console.error("Error in bulkUploadCategories:", error);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};
// Update Category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, image } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    // Check if another category with the same name exists
    const existingCategory = await Category.findOne({
      name: name.trim().toLowerCase(),
      _id: { $ne: id }, // exclude current category
    });

    if (existingCategory) {
      return res.status(400).json({
        message: "Category with this name already exists",
      });
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { name: name.trim(), image },
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({
      message: "Category updated successfully",
      category: updatedCategory,
    });
  } catch (error) {
    console.error("Error in updateCategory:", error);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

// ✅ Get Subcategories by Category Name or ID
const getSubCategoriesByCategory = async (req, res) => {
  try {
    const { identifier } = req.params; // can be name or id

    if (!identifier) {
      return res
        .status(400)
        .json({ message: "Category identifier is required" });
    }

    let category;

    // Check if identifier is a valid MongoDB ObjectId
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier);

    if (isObjectId) {
      // Find by ID
      category = await Category.findById(identifier);
    } else {
      // Find by name (case insensitive)
      category = await Category.findOne({
        name: { $regex: new RegExp("^" + identifier + "$", "i") },
      });
    }

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Find subcategories for the category
    const subcategories = await SubCategory.find({ category: category._id });

    res.status(200).json({
      message: `Subcategories for category '${category.name}' retrieved successfully`,
      category: category.name,
      subcategories,
      count: subcategories.length,
    });
  } catch (error) {
    console.error("Error in getSubCategoriesByCategory:", error);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

// Delete Category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCategory = await Category.findByIdAndDelete(id);

    if (!deletedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({
      message: "Category deleted successfully",
      category: deletedCategory,
    });
  } catch (error) {
    console.error("Error in deleteCategory:", error);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  createcategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
  getSubCategoriesByCategory,
  bulkUploadCategories,
};
