const cloudinary = require("cloudinary").v2;
const env = require("./env");

if (env.cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

function ensureCloudinaryConfigured() {
  if (!env.cloudinaryConfigured) {
    const error = new Error(
      "File uploads are unavailable. Configure Cloudinary environment variables."
    );

    error.statusCode = 503;
    throw error;
  }
}

module.exports = {
  cloudinary,
  ensureCloudinaryConfigured
};