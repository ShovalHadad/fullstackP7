const express =
  require("express");

const recipeController =
  require("../controllers/recipeController");

const authenticateToken =
  require("../middleware/authenticateToken");

const authorizeRoles =
  require("../middleware/authorizeRoles");

const uploadImage =
  require("../middleware/uploadImage");

const router = express.Router();

/*
Every recipe route requires authentication.

The middleware verifies:
- A valid JWT exists.
- The user still exists.
- The account is not blocked.
- The current role is read from the database.
*/
router.use(authenticateToken);

/*
Returns a paginated recipe-card list.

Supported query parameters:
- page
- limit
- search
- categoryId
- difficulty
- dietType
- maxTotalTime
- chefId
- sort
*/
router.get(
  "/",
  recipeController.getRecipes
);

/*
Returns one complete active recipe.
*/
router.get(
  "/:recipeId",
  recipeController.getRecipeById
);

/*
Only an authenticated chef may create a recipe.

The role check runs before Multer processes the image.
*/
router.post(
  "/",
  authorizeRoles("chef"),
  uploadImage.single("image"),
  recipeController.createRecipe
);

/*
Only an authenticated chef may update a recipe.

The service verifies recipe ownership.
The image field is optional.
*/
router.put(
  "/:recipeId",
  authorizeRoles("chef"),
  uploadImage.single("image"),
  recipeController.updateRecipe
);

/*
Only an authenticated chef may delete a recipe.

The service verifies that the recipe belongs
to the authenticated chef.

The deletion is soft:
is_active is changed to false.
*/
router.delete(
  "/:recipeId",
  authorizeRoles("chef"),
  recipeController.deleteOwnRecipe
);

module.exports = router;