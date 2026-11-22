import mongoose from "mongoose";

const flightSchema = new mongoose.Schema(
  {
    flightNumber: {
      type: String,
      required: [true, "Flight number is required"],
      trim: true,
      uppercase: true,
    },

    airline: {
      type: String,
      required: [true, "Airline name is required"],
      trim: true,
    },

    departureCity: {
      type: String,
      required: [true, "Departure city is required"],
      trim: true,
      index: true,
    },

    arrivalCity: {
      type: String,
      required: [true, "Arrival city is required"],
      trim: true,
      index: true,
    },

    departureDate: {
      type: Date,
      required: [true, "Departure date is required"],
    },

    arrivalDate: {
      type: Date,
      required: [true, "Arrival date is required"],
    },

    price: {
      type: Number,
      required: [true, "Ticket price is required"],
      min: [0, "Price cannot be negative"],
    },

    totalSeats: {
      type: Number,
      required: [true, "Total seats are required"],
      min: [1, "Total seats must be at least 1"],
      validate: {
        validator: Number.isInteger,
        message: "Total seats must be an integer",
      },
    },

    availableSeats: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Available seats must be an integer",
      },
    },

    flightClass: {
      type: String,
      enum: ["Economy", "Business", "First"],
      required: [true, "Flight class is required"],
    },

    image: {
      type: String,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["scheduled", "delayed", "cancelled"],
      default: "scheduled",
    },
  },
  {
    timestamps: true,
  },
);

// Validate flight timing
flightSchema.pre("validate", function () {
  if (
    this.departureDate &&
    this.arrivalDate &&
    this.arrivalDate <= this.departureDate
  ) {
    this.invalidate("arrivalDate", "Arrival date must be after departure date");
  }

  if (
    this.totalSeats !== undefined &&
    this.availableSeats !== undefined &&
    this.availableSeats > this.totalSeats
  ) {
    this.invalidate(
      "availableSeats",
      "Available seats cannot exceed total seats",
    );
  }
});

// Prevent duplicate flight number for the same departure
flightSchema.index({ flightNumber: 1, departureDate: 1 }, { unique: true });

// Optimize common flight searches
flightSchema.index({
  departureCity: 1,
  arrivalCity: 1,
  departureDate: 1,
  flightClass: 1,
});

flightSchema.index({ price: 1 });
flightSchema.index({ airline: 1 });

const Flight = mongoose.model("Flight", flightSchema);

export default Flight;
