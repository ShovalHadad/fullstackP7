const { pool } = require("../config/db");

const reviewModel =
  require("../models/reviewModel");

const imageService =
  require("./imageService");

const AppError =
  require("./appError");

const MIN_RATING = 1;
const MAX_RATING = 5;
const MAX_COMMENT_LENGTH = 2000;

/*
Validates a positive integer identifier.
*/
const validateId = (
  value,
  fieldName
) => {
  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new AppError(
      `${fieldName} is not valid`,
      400
    );
  }
};

/*
Validates and normalizes review data.
*/
const validateReviewData = (data) => {
  const rating = Number(data.rating);

  if (
    !Number.isInteger(rating) ||
    rating < MIN_RATING ||
    rating > MAX_RATING
  ) {
    throw new AppError(
      `Rating must be an integer between ${MIN_RATING} and ${MAX_RATING}`,
      400
    );
  }

  let comment = null;

  if (
    data.comment !== undefined &&
    data.comment !== null
  ) {
    if (typeof data.comment !== "string") {
      throw new AppError(
        "Review comment must be text",
        400
      );
    }

    comment =
      data.comment.trim() || null;

    if (
      comment &&
      comment.length >
        MAX_COMMENT_LENGTH
    ) {
      throw new AppError(
        `Review comment cannot exceed ${MAX_COMMENT_LENGTH} characters`,
        400
      );
    }
  }

  return {
    rating,
    comment,
  };
};

/*
Returns active reviews and a compact rating summary
for an active recipe.

The two independent queries run in parallel.
*/
const getRecipeReviews = async (
  recipeId
) => {
  validateId(
    recipeId,
    "Recipe ID"
  );

  const recipe =
    await reviewModel
      .findActiveRecipeById(
        recipeId
      );

  if (!recipe) {
    throw new AppError(
      "Recipe not found",
      404
    );
  }

  const [reviews, summary] =
    await Promise.all([
      reviewModel
        .findAllByRecipeId(
          recipeId
        ),

      reviewModel
        .findRatingSummaryByRecipeId(
          recipeId
        ),
    ]);

  return {
    items: reviews.map((review) => ({
      id: review.id,
      rating: Number(review.rating),
      comment: review.comment,
      image_url: review.image_url,
      created_at: review.created_at,
      updated_at: review.updated_at,

      user: {
        id: review.user_id,
        username: review.username,
        profile_image_url:
          review.profile_image_url,
      },
    })),

    summary: {
      average_rating:
        summary.average_rating === null
          ? 0
          : Number(
              summary.average_rating
            ),

      review_count:
        Number(
          summary.review_count || 0
        ),
    },
  };
};

/*
Creates or reactivates a review.

A user may have only one active review per recipe.
A chef may not review their own recipe.

The optional image is uploaded before the transaction.
If database work fails, the new image is deleted.
*/
const createReview = async (
  recipeId,
  userId,
  reviewData,
  imageFile
) => {
  validateId(
    recipeId,
    "Recipe ID"
  );

  const validatedData =
    validateReviewData(
      reviewData
    );

  const recipe =
    await reviewModel
      .findActiveRecipeById(
        recipeId
      );

  if (!recipe) {
    throw new AppError(
      "Recipe not found",
      404
    );
  }

  if (
    Number(recipe.chef_id) ===
    Number(userId)
  ) {
    throw new AppError(
      "You cannot review your own recipe",
      403
    );
  }

  const existingActiveReview =
    await reviewModel
      .findActiveByUserIdAndRecipeId(
        userId,
        recipeId
      );

  if (existingActiveReview) {
    throw new AppError(
      "You already reviewed this recipe",
      409
    );
  }

  let uploadedImage = null;
  let connection = null;
  let transactionCommitted = false;

  try {
    if (imageFile?.buffer) {
      uploadedImage =
        await imageService
          .uploadImageBuffer(
            imageFile.buffer,
            "recipehub/reviews"
          );
    }

    connection =
      await pool.getConnection();

    await connection.beginTransaction();

    const existingReview =
      await reviewModel
        .findAnyByUserIdAndRecipeIdForUpdate(
          connection,
          userId,
          recipeId
        );

    let reviewId;

    if (existingReview) {
      if (existingReview.is_active) {
        throw new AppError(
          "You already reviewed this recipe",
          409
        );
      }

      reviewId = existingReview.id;

      await reviewModel.reactivate(
        connection,
        reviewId,
        {
          ...validatedData,

          imageUrl:
            uploadedImage?.imageUrl ||
            null,

          imagePublicId:
            uploadedImage
              ?.imagePublicId ||
            null,
        }
      );
    } else {
      reviewId =
        await reviewModel.create(
          connection,
          {
            recipeId,
            userId,
            ...validatedData,

            imageUrl:
              uploadedImage?.imageUrl ||
              null,

            imagePublicId:
              uploadedImage
                ?.imagePublicId ||
              null,
          }
        );
    }

    await reviewModel
      .createNotification(
        connection,
        {
          userId: recipe.chef_id,
          type: "new_review",
          title:
            "New review on your recipe",
          message:
            `A new review was posted on "${recipe.title}"`,
          relatedEntityType:
            "review",
          relatedEntityId:
            reviewId,
        }
      );

    await connection.commit();
    transactionCommitted = true;

    return {
      id: reviewId,
      recipe_id: recipeId,
      rating:
        validatedData.rating,
      comment:
        validatedData.comment,
      image_url:
        uploadedImage?.imageUrl ||
        null,
    };
  } catch (error) {
    if (
      connection &&
      !transactionCommitted
    ) {
      await connection.rollback();
    }

    if (
      uploadedImage?.imagePublicId &&
      !transactionCommitted
    ) {
      try {
        await imageService.deleteImage(
          uploadedImage.imagePublicId
        );
      } catch (
        imageDeletionError
      ) {
        console.error(
          "Failed to remove unused review image:",
          imageDeletionError.message
        );
      }
    }

    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/*
Updates a review owned by the authenticated user.

A new image is optional.
The body may also include:
removeImage=true

Rules:
- New image: replace old image.
- removeImage=true: remove old image without replacement.
- Neither supplied: keep the existing image.
*/
const updateReview = async (
  reviewId,
  userId,
  reviewData,
  imageFile
) => {
  validateId(
    reviewId,
    "Review ID"
  );

  const validatedData =
    validateReviewData(
      reviewData
    );

  const removeImage =
    reviewData.removeImage === true ||
    reviewData.removeImage === "true";

  if (
    removeImage &&
    imageFile?.buffer
  ) {
    throw new AppError(
      "A new image and removeImage cannot be used together",
      400
    );
  }

  let uploadedImage = null;
  let oldImagePublicId = null;
  let connection = null;
  let transactionCommitted = false;

  try {
    if (imageFile?.buffer) {
      uploadedImage =
        await imageService
          .uploadImageBuffer(
            imageFile.buffer,
            "recipehub/reviews"
          );
    }

    connection =
      await pool.getConnection();

    await connection.beginTransaction();

    const existingReview =
      await reviewModel
        .findByIdAndUserIdForUpdate(
          connection,
          reviewId,
          userId
        );

    if (
      !existingReview ||
      !existingReview.is_active
    ) {
      throw new AppError(
        "Review not found",
        404
      );
    }

    oldImagePublicId =
      existingReview.image_public_id;

    let finalImageUrl =
      existingReview.image_url;

    let finalImagePublicId =
      existingReview.image_public_id;

    if (uploadedImage) {
      finalImageUrl =
        uploadedImage.imageUrl;

      finalImagePublicId =
        uploadedImage.imagePublicId;
    } else if (removeImage) {
      finalImageUrl = null;
      finalImagePublicId = null;
    }

    const affectedRows =
      await reviewModel.update(
        connection,
        reviewId,
        userId,
        {
          ...validatedData,
          imageUrl: finalImageUrl,
          imagePublicId:
            finalImagePublicId,
        }
      );

    if (affectedRows !== 1) {
      throw new AppError(
        "Review could not be updated",
        409
      );
    }

    await connection.commit();
    transactionCommitted = true;

    /*
    The old Cloudinary image is removed only after
    the database update succeeds.
    */
    if (
      oldImagePublicId &&
      (
        uploadedImage?.imagePublicId ||
        removeImage
      ) &&
      oldImagePublicId !==
        uploadedImage?.imagePublicId
    ) {
      try {
        await imageService.deleteImage(
          oldImagePublicId
        );
      } catch (
        imageDeletionError
      ) {
        console.error(
          "Failed to delete previous review image:",
          imageDeletionError.message
        );
      }
    }

    return {
      id: reviewId,
      rating:
        validatedData.rating,
      comment:
        validatedData.comment,
      image_url: finalImageUrl,
    };
  } catch (error) {
    if (
      connection &&
      !transactionCommitted
    ) {
      await connection.rollback();
    }

    if (
      uploadedImage?.imagePublicId &&
      !transactionCommitted
    ) {
      try {
        await imageService.deleteImage(
          uploadedImage.imagePublicId
        );
      } catch (
        imageDeletionError
      ) {
        console.error(
          "Failed to remove unused updated review image:",
          imageDeletionError.message
        );
      }
    }

    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/*
Soft-deletes a review owned by the current user.

The Cloudinary image is deleted only after the transaction
successfully clears its reference from the database.
*/
const deleteReview = async (
  reviewId,
  userId
) => {
  validateId(
    reviewId,
    "Review ID"
  );

  const connection =
    await pool.getConnection();

  let imagePublicId = null;
  let transactionCommitted = false;

  try {
    await connection.beginTransaction();

    const review =
      await reviewModel
        .findByIdAndUserIdForUpdate(
          connection,
          reviewId,
          userId
        );

    if (
      !review ||
      !review.is_active
    ) {
      throw new AppError(
        "Review not found",
        404
      );
    }

    imagePublicId =
      review.image_public_id;

    const affectedRows =
      await reviewModel.deactivate(
        connection,
        reviewId,
        userId
      );

    if (affectedRows !== 1) {
      throw new AppError(
        "Review could not be deleted",
        409
      );
    }

    await connection.commit();
    transactionCommitted = true;

    if (imagePublicId) {
      try {
        await imageService.deleteImage(
          imagePublicId
        );
      } catch (
        imageDeletionError
      ) {
        console.error(
          "Failed to delete review image:",
          imageDeletionError.message
        );
      }
    }

    return {
      id: reviewId,
      is_active: 0,
    };
  } catch (error) {
    if (!transactionCommitted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  getRecipeReviews,
  createReview,
  updateReview,
  deleteReview,
};