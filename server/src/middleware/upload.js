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

async function uploadToCloudinary(buffer, folder = "solar_management", filename = null) {
  if (env.cloudinaryConfigured) {
    try {
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadOptions = {
          folder,
          resource_type: "auto",
        };
        if (filename) {
          uploadOptions.public_id = filename;
        }

        const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
          if (error) return reject(error);
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        });

        stream.end(buffer);
      });
      return uploadResult;
    } catch (err) {
      console.warn("Cloudinary upload failed, using graceful local base64 fallback:", err.message);
    }
  }

  // Graceful local fallback for demo / hackathon / offline environments
  const base64Data = buffer.toString("base64");
  const dataUrl = `data:image/jpeg;base64,${base64Data}`;
  return {
    url: dataUrl,
    publicId: filename || `local_${Date.now()}`,
  };
}

module.exports = {
  upload,
  uploadToCloudinary,
};
