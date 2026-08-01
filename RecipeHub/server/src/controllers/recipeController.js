const recipeService =
  require("../services/recipeService");

/*
Returns a filtered and paginated recipe-card list.

Authentication is applied in the route.
*/
const getRecipes = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await recipeService.getRecipes(
        req.query
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
Creates a complete recipe for the authenticated chef.
*/
const createRecipe = async (
  req,
  res,
  next
) => {
  try {
    const recipe =
      await recipeService.createRecipe(
        req.user.userId,
        req.body,
        req.file
      );

    res.status(201).json({
      success: true,
      message:
        "Recipe created successfully",
      data: {
        recipe,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
Returns a complete active recipe by ID.
*/
const getRecipeById = async (
  req,
  res,
  next
) => {
  try {
    const recipe =
      await recipeService
        .getRecipeById(
          Number(
            req.params.recipeId
          )
        );

    res.status(200).json({
      success: true,
      data: {
        recipe,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
Updates a recipe owned by the authenticated chef.

The replacement image is optional.
*/
const updateRecipe = async (
  req,
  res,
  next
) => {
  try {
    const recipe =
      await recipeService.updateRecipe(
        Number(req.params.recipeId),
        req.user.userId,
        req.body,
        req.file
      );

    res.status(200).json({
      success: true,
      message:
        "Recipe updated successfully",
      data: {
        recipe,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
Soft-deletes a recipe owned by the authenticated chef.
*/
const deleteOwnRecipe = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await recipeService
        .deleteOwnRecipe(
          Number(
            req.params.recipeId
          ),
          req.user.userId
        );

    res.status(200).json({
      success: true,
      message:
        "Recipe deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/*
Soft-deletes any active recipe as an administrator.
*/
const adminDeleteRecipe = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await recipeService
        .adminDeleteRecipe(
          Number(
            req.params.recipeId
          )
        );

    res.status(200).json({
      success: true,
      message:
        "Recipe removed by administrator",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecipes,
  createRecipe,
  getRecipeById,
  updateRecipe,
  deleteOwnRecipe,
  adminDeleteRecipe,
};