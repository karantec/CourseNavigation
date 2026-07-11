// models/Question.js

const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
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
      //basic -green  standard - green // non standard-red
      required: true,
    },

    videoLink: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Question", questionSchema);
