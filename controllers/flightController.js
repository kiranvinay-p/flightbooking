import Flight from "../models/Flight.js";
import Booking from "../models/Booking.js";
import fs from "fs/promises";
import path from "path";

// CREATE FLIGHT - Admin only
export const createFlight = async (req, res, next) => {
  try {
    const {
      flightNumber,
      airline,
      departureCity,
      arrivalCity,
      departureDate,
      arrivalDate,
      price,
      totalSeats,
      availableSeats,
      flightClass,
    } = req.body;

    // Required field validation
    if (
      !flightNumber ||
      !airline ||
      !departureCity ||
      !arrivalCity ||
      !departureDate ||
      !arrivalDate ||
      price === undefined ||
      price === "" ||
      totalSeats === undefined ||
      totalSeats === "" ||
      !flightClass
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required flight details.",
      });
    }

    const parsedPrice = Number(price);
    const parsedTotalSeats = Number(totalSeats);
    const parsedAvailableSeats =
      availableSeats === undefined || availableSeats === ""
        ? parsedTotalSeats
        : Number(availableSeats);

    if (
      !Number.isFinite(parsedPrice) ||
      !Number.isInteger(parsedTotalSeats) ||
      !Number.isInteger(parsedAvailableSeats)
    ) {
      return res.status(400).json({
        success: false,
        message: "Price and seat values must be valid numbers.",
      });
    }

    if (
      !Number.isFinite(new Date(departureDate).getTime()) ||
      !Number.isFinite(new Date(arrivalDate).getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid departure and arrival dates.",
      });
    }

    if (parsedAvailableSeats > parsedTotalSeats) {
      return res.status(400).json({
        success: false,
        message: "Available seats cannot exceed total seats.",
      });
    }

    const flight = await Flight.create({
      flightNumber,
      airline,
      departureCity,
      arrivalCity,
      departureDate,
      arrivalDate,
      price: parsedPrice,
      totalSeats: parsedTotalSeats,
      availableSeats: parsedAvailableSeats,
      flightClass,
      image: req.file ? `/uploads/flights/${req.file.filename}` : null,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Flight created successfully.",
      data: { flight },
    });
  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    next(error);
  }
};

export const getAllFlights = async (req, res, next) => {
  try {
    const {
      departureCity,
      arrivalCity,
      departureDate,
      departureDateFrom,
      departureDateTo,
      priceMin,
      priceMax,
      airline,
      flightClass,
      status,
      page = 1,
      limit = 10,
      sortBy = "departureDate",
      sortOrder = "asc",
    } = req.query;

    const filter = {};

    // Departure city
    if (departureCity) {
      filter.departureCity = {
        $regex: departureCity,
        $options: "i",
      };
    }

    // Arrival city
    if (arrivalCity) {
      filter.arrivalCity = {
        $regex: arrivalCity,
        $options: "i",
      };
    }

    // Specific departure date (entire calendar day)
    if (departureDate) {
      const start = new Date(`${departureDate}T00:00:00.000Z`);
      const end = new Date(`${departureDate}T00:00:00.000Z`);
      end.setUTCDate(end.getUTCDate() + 1);

      if (!Number.isFinite(start.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid departure date.",
        });
      }

      filter.departureDate = {
        $gte: start,
        $lt: end,
      };
    } else if (departureDateFrom || departureDateTo) {
      filter.departureDate = {};

      if (departureDateFrom) {
        const from = new Date(departureDateFrom);

        if (!Number.isFinite(from.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid departureDateFrom.",
          });
        }

        filter.departureDate.$gte = from;
      }

      if (departureDateTo) {
        const to = new Date(departureDateTo);

        if (!Number.isFinite(to.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid departureDateTo.",
          });
        }

        // Include the complete final calendar day
        to.setUTCHours(23, 59, 59, 999);
        filter.departureDate.$lte = to;
      }
    }

    // Price range
    if (priceMin !== undefined || priceMax !== undefined) {
      filter.price = {};

      if (priceMin !== undefined) {
        filter.price.$gte = Number(priceMin);
      }

      if (priceMax !== undefined) {
        filter.price.$lte = Number(priceMax);
      }

      if (
        Object.values(filter.price).some(
          (value) => !Number.isFinite(value) || value < 0,
        ) ||
        (filter.price.$gte !== undefined &&
          filter.price.$lte !== undefined &&
          filter.price.$gte > filter.price.$lte)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid price range.",
        });
      }
    }

    // Airline
    if (airline) {
      filter.airline = {
        $regex: airline,
        $options: "i",
      };
    }

    // Flight class
    if (flightClass) {
      filter.flightClass = flightClass;
    }

    // Hide cancelled flights by default
    filter.status = status || { $ne: "cancelled" };

    // Pagination validation
    const pageNumber = Number(page);
    const pageSize = Number(limit);

    if (
      !Number.isInteger(pageNumber) ||
      !Number.isInteger(pageSize) ||
      pageNumber < 1 ||
      pageSize < 1 ||
      pageSize > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters.",
      });
    }

    // Whitelisted sorting fields
    const allowedSortFields = [
      "departureDate",
      "price",
      "createdAt",
      "airline",
      "flightNumber",
    ];

    if (!allowedSortFields.includes(sortBy)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sort field.",
      });
    }

    if (!["asc", "desc"].includes(sortOrder)) {
      return res.status(400).json({
        success: false,
        message: "sortOrder must be asc or desc.",
      });
    }

    const sort = {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
    };

    const skip = (pageNumber - 1) * pageSize;

    const [flights, totalFlights] = await Promise.all([
      Flight.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .select("-__v")
        .lean(),

      Flight.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      message: "Flights fetched successfully.",
      results: flights.length,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(totalFlights / pageSize),
        totalFlights,
        pageSize,
      },
      data: { flights },
    });
  } catch (error) {
    next(error);
  }
};

export const getFlightById = async (req, res, next) => {
  try {
    const flight = await Flight.findById(req.params.id)
      .populate("createdBy", "name email")
      .select("-__v");

    if (!flight) {
      return res.status(404).json({
        success: false,
        message: "Flight not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Flight details fetched successfully.",
      data: { flight },
    });
  } catch (error) {
    next(error);
  }
};

export const updateFlight = async (req, res, next) => {
  try {
    const flight = await Flight.findById(req.params.id);

    if (!flight) {
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }

      return res.status(404).json({
        success: false,
        message: "Flight not found.",
      });
    }

    const allowedFields = [
      "flightNumber",
      "airline",
      "departureCity",
      "arrivalCity",
      "departureDate",
      "arrivalDate",
      "price",
      "totalSeats",
      "flightClass",
      "status",
    ];

    // Reject fields that are not allowed
    const invalidFields = Object.keys(req.body).filter(
      (field) => !allowedFields.includes(field),
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Fields cannot be updated: ${invalidFields.join(", ")}`,
      });
    }

    const oldImage = flight.image;

    // Update normal flight fields
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        flight[field] = req.body[field];
      }
    }

    // Preserve existing booked seats
    if (req.body.totalSeats !== undefined) {
      const newTotalSeats = Number(req.body.totalSeats);

      if (!Number.isInteger(newTotalSeats) || newTotalSeats < 1) {
        return res.status(400).json({
          success: false,
          message: "Total seats must be a positive integer.",
        });
      }

      const bookedSeats = flight.totalSeats - flight.availableSeats;

      if (newTotalSeats < bookedSeats) {
        return res.status(400).json({
          success: false,
          message: `Cannot reduce capacity below ${bookedSeats} already booked seats.`,
        });
      }

      flight.totalSeats = newTotalSeats;
      flight.availableSeats = newTotalSeats - bookedSeats;
    }

    // Update flight image
    if (req.file) {
      flight.image = `/uploads/flights/${req.file.filename}`;
    }

    // Validate and save changes
    await flight.save();

    // Delete old image after successful update
    if (req.file && oldImage && oldImage.startsWith("/uploads/flights/")) {
      const oldPath = path.join(process.cwd(), oldImage.replace(/^\/+/, ""));

      await fs.unlink(oldPath).catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: "Flight updated successfully.",
      data: { flight },
    });
  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    next(error);
  }
};

export const deleteFlight = async (req, res, next) => {
  try {
    const flight = await Flight.findById(req.params.id);

    if (!flight) {
      return res.status(404).json({
        success: false,
        message: "Flight not found.",
      });
    }

    const activeBookings = await Booking.countDocuments({
      flight: flight._id,
      status: "confirmed",
    });

    if (activeBookings > 0) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete this flight because active bookings exist.",
      });
    }

    const imagePath = flight.image;

    await flight.deleteOne();

    // Remove associated local image
    if (imagePath && imagePath.startsWith("/uploads/flights/")) {
      const fullPath = path.join(process.cwd(), imagePath.replace(/^\/+/, ""));

      await fs.unlink(fullPath).catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: "Flight deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
