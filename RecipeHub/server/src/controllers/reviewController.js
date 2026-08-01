const reviewService =
  require("../services/reviewService");

/*
Returns active reviews and rating summary
for an active recipe.
*/
const getRecipeReviews = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await reviewService
        .getRecipeReviews(
          Number(
            req.params.recipeId
          )
        );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/*
Creates a review for an active recipe.

The review image is optional.
*/
const createReview = async (
  req,
  res,
  next
) => {
  try {
    const review =
      await reviewService.createReview(
        Number(
          req.params.recipeId
        ),
        req.user.userId,
        req.body,
        req.file
      );

    res.status(201).json({
      success: true,
      message:
        "Review created successfully",
      data: {
        review,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
Updates a review owned by the authenticated user.

A replacement image is optional.
*/
const updateReview = async (
  req,
  res,
  next
) => {
  try {
    const review =
      await reviewService.updateReview(
        Number(
          req.params.reviewId
        ),
        req.user.userId,
        req.body,
        req.file
      );

    res.status(200).json({
      success: true,
      message:
        "Review updated successfully",
      data: {
        review,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
Soft-deletes a review owned by the authenticated user.
*/
const deleteReview = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await reviewService.deleteReview(
        Number(
          req.params.reviewId
        ),
        req.user.userId
      );

    res.status(200).json({
      success: true,
      message:
        "Review deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecipeReviews,
  createReview,
  updateReview,
  deleteReview,
};