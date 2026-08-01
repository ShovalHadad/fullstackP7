const express =
  require("express");

const savedRecipeController =
  require("../controllers/savedRecipeController");

const authenticateToken =
  require("../middleware/authenticateToken");

const router = express.Router();

/*
Every saved-recipe route requires authentication.

Ownership checks use req.user.userId in every service call.
*/
router.use(authenticateToken);

/*
Returns the current user's saved recipes.

Optional query:
?folderId=1
*/
router.get(
  "/",
  savedRecipeController.getSavedRecipes
);

/*
Saves an active recipe.

Expected JSON:
{
  "recipeId": 1,
  "folderId": 2
}

folderId may be omitted or null.
*/
router.post(
  "/",
  savedRecipeController.saveRecipe
);

/*
Moves a saved recipe to another folder.

Expected JSON:
{
  "folderId": 3
}

Use null to remove it from a folder.
*/
router.patch(
  "/:savedRecipeId/move",
  savedRecipeController.moveSavedRecipe
);

/*
Removes a recipe from the current user's saved recipes.
*/
router.delete(
  "/:savedRecipeId",
  savedRecipeController.deleteSavedRecipe
);

module.exports = router;