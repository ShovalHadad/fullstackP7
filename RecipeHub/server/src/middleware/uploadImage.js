const multer = require("multer");

const AppError = require("../services/appError");

/*
Stores the uploaded file temporarily in memory.

The file will be sent from memory directly to Cloudinary,
so it is not stored permanently inside the server.
*/
const storage = multer.memoryStorage();

/*
Allows only supported image formats.
*/
const imageFileFilter = (req, file, callback) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return callback(
      new AppError(
        "Only JPEG, PNG and WebP images are allowed",
        400
      )
    );
  }

  callback(null, true);
};

/*
Creates the Multer middleware.

The maximum allowed image size is 5 MB.
*/
const uploadImage = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

module.exports = uploadImage;