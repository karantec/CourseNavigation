// controllers/testimonial.controller.js

const Testimonial = require("../models/Testimonial.model");

// 🔹 ADD TESTIMONIAL (Dashboard)
exports.addTestimonial = async (req, res) => {
  try {
    const { name, image, rating, review, date } = req.body;

    const testimonial = new Testimonial({
      name,
      image,
      rating,
      review,
      date,
    });

    await testimonial.save();

    res.status(201).json({
      success: true,
      message: "Testimonial added successfully",
      data: testimonial,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding testimonial",
      error: error.message,
    });
  }
};
exports.updateTestimonial = async (req, res) => {
  try {
    const updated = await Testimonial.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true },
    );

    res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
// 🔹 GET ALL TESTIMONIALS (Website)
exports.getTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: testimonials.length,
      data: testimonials,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching testimonials",
      error: error.message,
    });
  }
};

// 🔹 DELETE TESTIMONIAL (Optional)
exports.deleteTestimonial = async (req, res) => {
  try {
    const { id } = req.params;

    await Testimonial.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Testimonial deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting testimonial",
      error: error.message,
    });
  }
};
