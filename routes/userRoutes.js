import express from "express";

import {
  getUserProfile,
  updateUserProfile,
} from "../controllers/userController.js";

import { protect } from "../middleware/authMiddleware.js";

import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

// All user routes require authentication
router.use(protect);

// Get logged-in user's profile
router.get("/", getUserProfile);

// Update profile details and upload profile picture
router.put("/profile", upload.single("profilePicture"), updateUserProfile);

export default router;
