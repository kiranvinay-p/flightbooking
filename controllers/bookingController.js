import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Flight from "../models/Flight.js";

// CREATE BOOKING
export const createBooking = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const { flightId, passengers } = req.body;

    // Validate request
    if (!flightId || !mongoose.isValidObjectId(flightId)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid flight ID.",
      });
    }

    if (
      !Array.isArray(passengers) ||
      passengers.length === 0 ||
      passengers.length > 9
    ) {
      return res.status(400).json({
        success: false,
        message: "A booking must contain between 1 and 9 passengers.",
      });
    }

    // Validate passenger details
    for (const passenger of passengers) {
      if (
        !passenger.name ||
        typeof passenger.name !== "string" ||
        passenger.name.trim().length < 2 ||
        !Number.isInteger(Number(passenger.age)) ||
        Number(passenger.age) < 1 ||
        Number(passenger.age) > 120 ||
        !["male", "female", "other"].includes(passenger.gender)
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide valid passenger details.",
        });
      }
    }

    let createdBooking;

    // Start MongoDB transaction
    await session.withTransaction(async () => {
      // Find flight inside transaction
      const existingFlight = await Flight.findById(flightId).session(session);

      if (!existingFlight) {
        const error = new Error("Flight not found.");
        error.statusCode = 404;
        throw error;
      }

      if (
        existingFlight.status !== "scheduled" ||
        existingFlight.departureDate <= new Date()
      ) {
        const error = new Error("This flight is not available for booking.");
        error.statusCode = 400;
        throw error;
      }

      const passengerCount = passengers.length;

      // Atomically reserve seats
      const flight = await Flight.findOneAndUpdate(
        {
          _id: flightId,
          status: "scheduled",
          departureDate: { $gt: new Date() },
          availableSeats: { $gte: passengerCount },
        },
        {
          $inc: {
            availableSeats: -passengerCount,
          },
        },
        {
          new: true,
          runValidators: true,
          session,
        },
      );

      if (!flight) {
        const error = new Error(
          "Not enough seats available. Please try again.",
        );
        error.statusCode = 409;
        throw error;
      }

      // Calculate price using database flight price
      const totalPrice = existingFlight.price * passengerCount;

      // Create booking
      const bookings = await Booking.create(
        [
          {
            user: req.user._id,
            flight: flight._id,
            passengers: passengers.map((passenger) => ({
              name: passenger.name.trim(),
              age: Number(passenger.age),
              gender: passenger.gender,
              passportNumber: passenger.passportNumber || null,
            })),
            totalPassengers: passengerCount,
            totalPrice,
          },
        ],
        { session },
      );

      createdBooking = bookings[0];
    });

    // Fetch populated booking after transaction
    const booking = await Booking.findById(createdBooking._id)
      .populate("user", "name email")
      .populate(
        "flight",
        "flightNumber airline departureCity arrivalCity departureDate arrivalDate price flightClass",
      );

    res.status(201).json({
      success: true,
      message: "Flight booked successfully.",
      data: { booking },
    });
  } catch (error) {
    next(error);
  } finally {
    await session.endSession();
  }
};

export const getMyBookings = async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);

    if (
      !Number.isInteger(page) ||
      !Number.isInteger(limit) ||
      page < 1 ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters.",
      });
    }

    // Admin can see all bookings.
    // Normal users can only see their own bookings.
    const filter = req.user.role === "admin" ? {} : { user: req.user._id };

    const skip = (page - 1) * limit;

    const [bookings, totalBookings] = await Promise.all([
      Booking.find(filter)
        .populate("user", "name email")
        .populate(
          "flight",
          "flightNumber airline departureCity arrivalCity departureDate arrivalDate price",
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Booking.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      results: bookings.length,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalBookings / limit),
        totalBookings,
      },
      data: { bookings },
    });
  } catch (error) {
    next(error);
  }
};

export const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email")
      .populate("flight");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    // Only booking owner or admin can access
    const isOwner = booking.user._id.toString() === req.user._id.toString();

    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You cannot access this booking.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Booking details fetched successfully.",
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

export const requestBookingCancellation = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "This booking is already cancelled.",
      });
    }

    if (booking.cancellationRequestStatus === "pending") {
      return res.status(400).json({
        success: false,
        message: "Cancellation request is already pending.",
      });
    }

    booking.cancellationRequestStatus = "pending";
    booking.cancellationReason = reason
      ? String(reason).trim()
      : "No reason provided";

    await booking.save();

    res.status(200).json({
      success: true,
      message:
        "Cancellation request submitted successfully. Awaiting admin approval.",
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

export const updateBookingCancellation = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const { action } = req.body;

    if (!["approved", "rejected"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be approved or rejected.",
      });
    }

    let updatedBooking;

    await session.withTransaction(async () => {
      const booking = await Booking.findById(req.params.id).session(session);

      if (!booking) {
        const error = new Error("Booking not found.");
        error.statusCode = 404;
        throw error;
      }

      if (booking.status === "cancelled") {
        const error = new Error("Booking is already cancelled.");
        error.statusCode = 400;
        throw error;
      }

      if (booking.cancellationRequestStatus !== "pending") {
        const error = new Error("There is no pending cancellation request.");
        error.statusCode = 400;
        throw error;
      }

      if (action === "approved") {
        // Restore seats only when cancellation is approved
        const flight = await Flight.findOneAndUpdate(
          {
            _id: booking.flight,
            $expr: {
              $lte: [
                {
                  $add: ["$availableSeats", booking.totalPassengers],
                },
                "$totalSeats",
              ],
            },
          },
          {
            $inc: {
              availableSeats: booking.totalPassengers,
            },
          },
          {
            new: true,
            session,
          },
        );

        if (!flight) {
          const error = new Error(
            "Flight not found or seat inventory is inconsistent.",
          );
          error.statusCode = 409;
          throw error;
        }

        booking.status = "cancelled";
        booking.cancelledAt = new Date();
        booking.cancellationRequestStatus = "approved";
      } else {
        // Reject cancellation without restoring seats
        booking.cancellationRequestStatus = "rejected";
      }

      await booking.save({ session });

      updatedBooking = booking;
    });

    const booking = await Booking.findById(updatedBooking._id)
      .populate("user", "name email")
      .populate("flight");

    res.status(200).json({
      success: true,
      message:
        action === "approved"
          ? "Booking cancelled successfully. Seats restored."
          : "Cancellation request rejected. Booking remains confirmed.",
      data: { booking },
    });
  } catch (error) {
    next(error);
  } finally {
    await session.endSession();
  }
};
