const cloudinary = require("../config/cloudinary");
const AppError = require("./appError");

/*
Uploads an image buffer to Cloudinary.

The function returns only the values that the application
needs to store in MySQL.
*/
const uploadImageBuffer = (
  fileBuffer,
  folderName
) => {
  if (!fileBuffer) {
    throw new AppError("Image file is required", 400);
  }

  return new Promise((resolve, reject) => {
    const uploadStream =
      cloudinary.uploader.upload_stream(
        {
          folder: folderName,
          resource_type: "image",

          /*
          Cloudinary can optimize the delivered image format
          and quality when the image is displayed.
          */
          transformation: [
            {
              width: 1200,
              height: 900,
              crop: "limit",
              quality: "auto",
              fetch_format: "auto",
            },
          ],
        },
        (error, result) => {
          if (error) {
            console.error(
              "Cloudinary upload failed:",
              error.message
            );

            return reject(
              new AppError(
                "Image upload failed",
                500
              )
            );
          }

          resolve({
            imageUrl: result.secure_url,
            imagePublicId: result.public_id,
          });
        }
      );

    uploadStream.end(fileBuffer);
  });
};

/*
Deletes an image from Cloudinary using its public ID.

This will be used when an image is replaced
or when its related resource is permanently deleted.
*/
const deleteImage = async (publicId) => {
  if (!publicId) {
    return;
  }

  const result = await cloudinary.uploader.destroy(
    publicId,
    {
      resource_type: "image",
    }
  );

  if (
    result.result !== "ok" &&
    result.result !== "not found"
  ) {
    throw new AppError(
      "Image deletion failed",
      500
    );
  }
};

module.exports = {
  uploadImageBuffer,
  deleteImage,
};
