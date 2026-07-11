const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
  } ,
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
});

const Admin = mongoose.model("Admin", adminSchema);

module.exports = Admin;
