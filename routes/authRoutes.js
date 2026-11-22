import express from "express";

import {
  registerUser,
  loginUser,
  logoutUser,
} from "../controllers/authController.js";

import { protect } from "../middleware/authMiddleware.js";

import validateRequest from "../middleware/validateRequest.js";

import {
  registerValidator,
  loginValidator,
} from "../validators/authValidators.js";

const router = express.Router();

// Public routes
router.post("/register", registerValidator, validateRequest, registerUser);
router.post("/login", loginValidator, validateRequest, loginUser);

// Protected route
router.post("/logout", protect, logoutUser);

export default router;
