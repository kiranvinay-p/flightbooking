import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Verify user authentication
export const protect = async (req, res, next) => {
  try {
    let token;

    // First check HTTP-only cookie
    if (req.cookies?.[process.env.COOKIE_NAME || "flight_token"]) {
      token = req.cookies[process.env.COOKIE_NAME || "flight_token"];
    }

    // Support Bearer token as an alternative
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Please login.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists.",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};

// Restrict access based on user role
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource.",
      });
    }

    next();
  };
};
