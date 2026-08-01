const multer = require("multer");

/*
Central error-handling middleware.

Express identifies this as error middleware because
it receives four parameters: error, req, res and next.
*/
const errorHandler = (error, req, res, next) => {
  console.error(error);

  /*
  Handles Multer errors such as an image that is too large.
  */
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message:
          "The image cannot exceed 5 MB",
      });
    }

    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message:
          "Only one image can be uploaded",
      });
    }

    return res.status(400).json({
      success: false,
      message: "Invalid image upload",
    });
  }

  const statusCode = error.statusCode || 500;

  const message = error.isOperational
    ? error.message
    : "An unexpected server error occurred";

  res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = errorHandler;