// routes/questionRoutes.js

const express = require("express");
const router = express.Router();

const {
  createQuestion,
  getAllQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
} = require("../controllers/Sheet.Controller");
const { protect, admin } = require("../middleware/auth.middleware");
router.post("/", protect, admin, createQuestion);

router.get("/", getAllQuestions);

router.get("/:id", getQuestionById);

router.put("/:id", protect, admin, updateQuestion);

router.delete("/:id", protect, admin, deleteQuestion);

module.exports = router;
