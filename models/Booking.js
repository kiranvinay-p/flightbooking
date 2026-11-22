import mongoose from "mongoose";
import { randomUUID } from "crypto";

// Passenger sub-schema
const passengerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Passenger name is required"],
      trim: true,
    },

    age: {
      type: Number,
      required: [true, "Passenger age is required"],
      min: 1,
      max: 120,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },

    passportNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
  },
  {
    _id: false,
  },
);

// Booking schema
const bookingSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      unique: true,
      default: () => `FB-${randomUUID().toUpperCase()}`,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    flight: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flight",
      required: true,
      index: true,
    },

    passengers: {
      type: [passengerSchema],
      required: true,
      validate: {
        validator: function (passengers) {
          return passengers.length > 0 && passengers.length <= 9;
        },
        message: "A booking must have between 1 and 9 passengers.",
      },
    },

    totalPassengers: {
      type: Number,
      required: true,
      min: 1,
      max: 9,
    },

    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["confirmed", "cancelled"],
      default: "confirmed",
      index: true,
    },

    cancellationRequestStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
    },

    cancellationReason: {
      type: String,
      default: null,
      trim: true,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Booking history optimization
bookingSchema.index({ user: 1, createdAt: -1 });

bookingSchema.index({ status: 1, createdAt: -1 });

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
