const express =
  require("express");

const recipeController =
  require("../controllers/recipeController");

const authenticateToken =
  require("../middleware/authenticateToken");

const authorizeRoles =
  require("../middleware/authorizeRoles");

const router = express.Router();

/*
Every route in this router requires:
1. A valid JWT.
2. An active, non-blocked account.
3. The administrator role.
*/
router.use(
  authenticateToken,
  authorizeRoles("admin")
);

/*
Soft-deletes any active recipe.

The administrator does not need to own the recipe.
*/
router.delete(
  "/:recipeId",
  recipeController.adminDeleteRecipe
);

module.exports = router;