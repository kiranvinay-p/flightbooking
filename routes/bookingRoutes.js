import express from "express";

import {
  createBooking,
  getMyBookings,
  getBookingById,
  requestBookingCancellation,
  updateBookingCancellation,
} from "../controllers/bookingController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// All booking APIs require authentication
router.use(protect);

// Create booking
router.post("/", createBooking);

// Get bookings belonging to the logged-in user.
// Admins can see all bookings.
router.get("/", getMyBookings);

// User cancellation request
router.post("/:id/cancellation-request", requestBookingCancellation);

// Admin approval or rejection
router.patch(
  "/:id/cancellation",
  authorizeRoles("admin"),
  updateBookingCancellation,
);

// Get specific booking
router.get("/:id", getBookingById);

export default router;
