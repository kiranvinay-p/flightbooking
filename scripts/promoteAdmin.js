import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";

const promoteAdmin = async () => {
  try {
    await connectDB();

    const email = process.env.ADMIN_EMAIL;

    if (!email) {
      throw new Error("ADMIN_EMAIL is missing in .env");
    }

    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { $set: { role: "admin" } },
      { new: true, runValidators: true },
    );

    if (!user) {
      throw new Error("User not found. Register this email first.");
    }

    console.log("Admin role assigned successfully!");
    console.log({
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error("Admin promotion failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

promoteAdmin();
