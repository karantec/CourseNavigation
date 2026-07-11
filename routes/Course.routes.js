const express = require("express");
const {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  addSession,
  updateSession,
  deleteSession,
} = require("../controllers/Course.controller");
const { protect, admin } = require("../middleware/auth.middleware");

const router = express.Router();

// ── Course ────────────────────────────────────────────────────
router.post("/create", protect, admin, createCourse);
router.get("/all", getAllCourses);
router.get("/:id", getCourseById);
router.put("/update/:id", protect, admin, updateCourse);
router.delete("/delete/:id", protect, admin, deleteCourse);

// ── Session ───────────────────────────────────────────────────
router.post("/:id/session/add", protect, admin, addSession);
router.put(
  "/:courseId/session/:sessionId/update",
  protect,
  admin,
  updateSession,
);
router.delete(
  "/:courseId/session/:sessionId/delete",
  protect,
  admin,
  deleteSession,
);

module.exports = router;
