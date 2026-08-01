const savedRecipeService =
  require("../services/savedRecipeService");

/*
Returns the authenticated user's saved recipes.
*/
const getSavedRecipes = async (
  req,
  res,
  next
) => {
  try {
    const recipes =
      await savedRecipeService
        .getSavedRecipes(
          req.user.userId,
          req.query
        );

    res.status(200).json({
      success: true,
      data: {
        recipes,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
Saves a recipe for the authenticated user.
*/
const saveRecipe = async (
  req,
  res,
  next
) => {
  try {
    const savedRecipe =
      await savedRecipeService
        .saveRecipe(
          req.user.userId,
          req.body
        );

    res.status(201).json({
      success: true,
      message:
        "Recipe saved successfully",
      data: {
        saved_recipe: savedRecipe,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
Moves a saved recipe to another folder.
*/
const moveSavedRecipe = async (
  req,
  res,
  next
) => {
  try {
    const savedRecipe =
      await savedRecipeService
        .moveSavedRecipe(
          Number(
            req.params.savedRecipeId
          ),
          req.user.userId,
          req.body
        );

    res.status(200).json({
      success: true,
      message:
        "Saved recipe moved successfully",
      data: {
        saved_recipe: savedRecipe,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
Removes a recipe from saved recipes.
*/
const deleteSavedRecipe = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await savedRecipeService
        .deleteSavedRecipe(
          Number(
            req.params.savedRecipeId
          ),
          req.user.userId
        );

    res.status(200).json({
      success: true,
      message:
        "Recipe removed from saved recipes",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSavedRecipes,
  saveRecipe,
  moveSavedRecipe,
  deleteSavedRecipe,
};