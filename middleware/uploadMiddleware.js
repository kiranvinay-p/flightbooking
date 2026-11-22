import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), "uploads", "profiles");

fs.mkdirSync(uploadDir, { recursive: true });

// Allowed image types
const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    cb(null, `${randomUUID()}${extension}`);
  },
});

// File validation
const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();

  if (
    allowedMimeTypes.includes(file.mimetype) &&
    allowedExtensions.includes(extension)
  ) {
    return cb(null, true);
  }

  cb(new Error("Only JPG, JPEG, PNG and WEBP images are allowed."));
};

// Multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
  },
});

export default upload;
