import User from "../models/User.js";
import fs from "fs/promises";
import path from "path";

// Get logged-in user's profile
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile fetched successfully.",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          gender: user.gender,
          profilePicture: user.profilePicture,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update logged-in user's profile
export const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const { name, email, password, gender } = req.body;

    // Update name
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: "Name must contain at least 2 characters.",
        });
      }

      user.name = name.trim();
    }

    // Update email
    if (email !== undefined) {
      if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email.trim())) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email.",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const existingUser = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: user._id },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email is already registered.",
        });
      }

      user.email = normalizedEmail;
    }

    // Update password
    if (password !== undefined) {
      if (typeof password !== "string" || password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must contain at least 8 characters.",
        });
      }

      user.password = password;
    }

    // Update gender
    if (gender !== undefined) {
      const allowedGenders = ["male", "female", "other", "prefer_not_to_say"];

      if (!allowedGenders.includes(gender)) {
        return res.status(400).json({
          success: false,
          message: "Invalid gender value.",
        });
      }

      user.gender = gender;
    }

    // Update profile picture
    if (req.file) {
      user.profilePicture = `/uploads/profiles/${req.file.filename}`;
    }

    // Save changes (password is hashed by User pre-save hook)
    await user.save();

    // Remove previous local profile image after successful save
    if (req.file && user.profilePicture) {
      const oldPicture = req.user.profilePicture;

      if (oldPicture && oldPicture.startsWith("/uploads/profiles/")) {
        const oldPath = path.join(
          process.cwd(),
          oldPicture.replace(/^\/+/, ""),
        );

        const newPath = path.join(
          process.cwd(),
          "uploads",
          "profiles",
          req.file.filename,
        );

        if (oldPath !== newPath) {
          await fs.unlink(oldPath).catch(() => {});
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          gender: user.gender,
          profilePicture: user.profilePicture,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    // Remove newly uploaded file if profile update fails
    if (req.file) {
      const filePath = path.join(
        process.cwd(),
        "uploads",
        "profiles",
        req.file.filename,
      );

      await fs.unlink(filePath).catch(() => {});
    }

    next(error);
  }
};
