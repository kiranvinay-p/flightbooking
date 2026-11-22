import express from "express";

import {
  createFlight,
  getAllFlights,
  getFlightById,
  updateFlight,
  deleteFlight,
} from "../controllers/flightController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

import flightUpload from "../middleware/flightUploadMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", getAllFlights);
router.get("/:id", getFlightById);

// Admin-only routes
router.post(
  "/",
  protect,
  authorizeRoles("admin"),
  flightUpload.single("image"),
  createFlight,
);

router.put(
  "/:id",
  protect,
  authorizeRoles("admin"),
  flightUpload.single("image"),
  updateFlight,
);

router.delete("/:id", protect, authorizeRoles("admin"), deleteFlight);

export default router;
