const cloudinary = require("cloudinary").v2;

/**
 * Cloudinary is optional at boot: if the three env vars aren't set, the app
 * still runs and only photo uploads answer 503. That way nobody's local
 * setup breaks just because they haven't added Cloudinary keys yet.
 */
const configured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET,
);

if (configured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const AVATAR_FOLDER = "tuff/avatars";

/** One avatar per user, at a fixed public ID, so a new upload replaces the
 *  old one instead of piling up orphaned images. */
function avatarPublicId(userId) {
  return `${AVATAR_FOLDER}/${userId}`;
}

module.exports = { cloudinary, isCloudinaryConfigured: () => configured, avatarPublicId };
