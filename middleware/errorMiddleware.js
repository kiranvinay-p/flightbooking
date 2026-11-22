import multer from "multer";

const errorMiddleware = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;

  let message = err.message || "Internal Server Error";

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
  }

  // Invalid MongoDB ObjectId
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource ID";
  }

  // Duplicate MongoDB field
  if (err.code === 11000) {
    statusCode = 409;
    message = "Duplicate field value";
  }

  // Invalid JWT
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid authentication token";
  }

  // Expired JWT
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Authentication token expired";
  }

  if (err instanceof multer.MulterError) {
    statusCode = 400;

    if (err.code === "LIMIT_FILE_SIZE") {
      message = "Image size must not exceed 2 MB.";
    } else if (err.code === "LIMIT_FILE_COUNT") {
      message = "Only one image can be uploaded.";
    } else {
      message = err.message;
    }
  }

  console.error(err);

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
    }),
  });
};

export default errorMiddleware;
