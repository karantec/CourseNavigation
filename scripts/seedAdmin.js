const mongoose = require("mongoose");
const User = require("../models/user.model");

require("dotenv").config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "LLD",
    });

    console.log("Connected to DB");

    const existingAdmin = await User.findOne({
      email: process.env.ADMIN_EMAIL,
    });

    if (existingAdmin) {
      console.log("Admin already exists");
      process.exit();
    }

    const admin = new User({
      name: "Super Admin",
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      phoneNumber: process.env.ADMIN_PHONE,
      role: "ADMIN",
      isAdmin: true,
      isVerified: true,
    });

    await admin.save();

    console.log("✅ Admin seeded successfully");

    process.exit();
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

seedAdmin();
