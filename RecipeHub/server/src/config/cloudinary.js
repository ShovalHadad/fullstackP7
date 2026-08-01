const { v2: cloudinary } = require("cloudinary");

/*
Configures the Cloudinary SDK using environment variables.

The API secret must remain only on the server
and must never be exposed to the React client.
*/
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

module.exports = cloudinary;