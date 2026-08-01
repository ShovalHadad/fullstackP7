const express =
  require("express");

const reviewController =
  require("../controllers/reviewController");

const authenticateToken =
  require("../middleware/authenticateToken");

const uploadImage =
  require("../middleware/uploadImage");

const router = express.Router();

/*
Every review route requires authentication.
*/
router.use(authenticateToken);

/*
Returns active reviews and rating summary
for an active recipe.
*/
router.get(
  "/recipes/:recipeId/reviews",
  reviewController.getRecipeReviews
);

/*
Creates one review for the authenticated user.

The optional image field is processed only after
authentication succeeds.
*/
router.post(
  "/recipes/:recipeId/reviews",
  uploadImage.single("image"),
  reviewController.createReview
);

/*
Updates a review owned by the authenticated user.

The image field is optional.

To remove an existing image without replacing it,
send:
removeImage=true
*/
router.put(
  "/reviews/:reviewId",
  uploadImage.single("image"),
  reviewController.updateReview
);

/*
Soft-deletes a review owned by the authenticated user.
*/
router.delete(
  "/reviews/:reviewId",
  reviewController.deleteReview
);

module.exports = router;