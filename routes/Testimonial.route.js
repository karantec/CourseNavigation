// routes/testimonial.routes.js

const express = require("express");
const router = express.Router();

const {
  addTestimonial,
  getTestimonials,
  deleteTestimonial,
  updateTestimonial,
} = require("../controllers/Testimonial.Controller");

// Dashboard
router.post("/add", addTestimonial);

// Website
router.get("/get", getTestimonials);

router.put("/update/:id", updateTestimonial);
// Optional
router.delete("/delete/:id", deleteTestimonial);

module.exports = router;
