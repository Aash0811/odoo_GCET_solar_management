const multer = require("multer");
const { cloudinary, ensureCloudinaryConfigured } = require("../config/cloudinary");
const env = require("../config/env");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only images and PDF files are allowed"));
    }
  },
});

async function uploadToCloudinary(input, folder = "solar_management", filename = null) {
  if (env.cloudinaryConfigured) {
    try {
      const uploadOptions = {
        folder,
        resource_type: "auto",
      };
      if (filename) {
        uploadOptions.public_id = filename;
      }

      if (Buffer.isBuffer(input)) {
        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
            if (error) return reject(error);
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          });
          stream.end(input);
        });
        return uploadResult;
      } else if (typeof input === "string") {
        const result = await cloudinary.uploader.upload(input, uploadOptions);
        return {
          url: result.secure_url,
          publicId: result.public_id,
        };
      }
    } catch (err) {
      console.warn("Cloudinary upload failed, using graceful local base64 fallback:", err.message);
    }
  }

  // Graceful local fallback for demo / hackathon / offline environments
  const base64Data = Buffer.isBuffer(input)
    ? input.toString("base64")
    : typeof input === "string"
      ? input
      : String(input);
  const dataUrl = typeof base64Data === "string" && base64Data.startsWith("data:")
    ? base64Data
    : `data:image/jpeg;base64,${base64Data}`;
  return {
    url: dataUrl,
    publicId: filename || `local_${Date.now()}`,
  };
}

module.exports = {
  upload,
  uploadToCloudinary,
};
