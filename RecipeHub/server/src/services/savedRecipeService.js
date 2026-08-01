const savedRecipeModel =
  require("../models/savedRecipeModel");

const folderModel =
  require("../models/folderModel");

const AppError =
  require("./appError");

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
Parses an optional folder ID.

A missing or null value means no folder.
*/
const parseOptionalFolderId = (
  folderId
) => {
  if (
    folderId === undefined ||
    folderId === null ||
    folderId === ""
  ) {
    return null;
  }

  const normalizedFolderId =
    Number(folderId);

  validateId(
    normalizedFolderId,
    "Folder ID"
  );

  return normalizedFolderId;
};

/*
Verifies that a folder belongs to the current user.
*/
const validateOwnedFolder = async (
  folderId,
  userId
) => {
  if (folderId === null) {
    return null;
  }

  const folder =
    await folderModel
      .findByIdAndUserId(
        folderId,
        userId
      );

  if (!folder) {
    throw new AppError(
      "Folder not found",
      404
    );
  }

  return folder;
};

/*
Returns the authenticated user's saved recipes.

The optional folderId query parameter limits the result
to a single owned folder.
*/
const getSavedRecipes = async (
  userId,
  query
) => {
  const folderId =
    parseOptionalFolderId(
      query.folderId
    );

  if (folderId !== null) {
    await validateOwnedFolder(
      folderId,
      userId
    );
  }

  return savedRecipeModel
    .findAllByUserId(
      userId,
      folderId
    );
};

/*
Saves an active recipe.

A recipe can be saved once per user.
*/
const saveRecipe = async (
  userId,
  data
) => {
  const recipeId =
    Number(data.recipeId);

  validateId(
    recipeId,
    "Recipe ID"
  );

  const folderId =
    parseOptionalFolderId(
      data.folderId
    );

  const recipe =
    await savedRecipeModel
      .findActiveRecipeById(
        recipeId
      );

  if (!recipe) {
    throw new AppError(
      "Recipe not found",
      404
    );
  }

  if (folderId !== null) {
    await validateOwnedFolder(
      folderId,
      userId
    );
  }

  const existingSavedRecipe =
    await savedRecipeModel
      .findByUserIdAndRecipeId(
        userId,
        recipeId
      );

  if (existingSavedRecipe) {
    throw new AppError(
      "This recipe is already saved",
      409
    );
  }

  const savedRecipe =
    await savedRecipeModel.create(
      userId,
      recipeId,
      folderId
    );

  return {
    ...savedRecipe,
    title: recipe.title,
    image_url: recipe.image_url,
  };
};

/*
Moves a saved recipe to another owned folder.

Sending folderId as null removes the recipe from its folder
without removing it from saved recipes.
*/
const moveSavedRecipe = async (
  savedRecipeId,
  userId,
  data
) => {
  validateId(
    savedRecipeId,
    "Saved recipe ID"
  );

  const folderId =
    parseOptionalFolderId(
      data.folderId
    );

  const savedRecipe =
    await savedRecipeModel
      .findByIdAndUserId(
        savedRecipeId,
        userId
      );

  if (!savedRecipe) {
    throw new AppError(
      "Saved recipe not found",
      404
    );
  }

  if (folderId !== null) {
    await validateOwnedFolder(
      folderId,
      userId
    );
  }

  if (
    Number(savedRecipe.folder_id) ===
      Number(folderId) ||
    (
      savedRecipe.folder_id === null &&
      folderId === null
    )
  ) {
    return {
      id: savedRecipeId,
      folder_id: folderId,
    };
  }

  const affectedRows =
    await savedRecipeModel.move(
      savedRecipeId,
      userId,
      folderId
    );

  if (affectedRows !== 1) {
    throw new AppError(
      "Saved recipe could not be moved",
      409
    );
  }

  return {
    id: savedRecipeId,
    folder_id: folderId,
  };
};

/*
Removes a recipe from the current user's saved recipes.
*/
const deleteSavedRecipe = async (
  savedRecipeId,
  userId
) => {
  validateId(
    savedRecipeId,
    "Saved recipe ID"
  );

  const affectedRows =
    await savedRecipeModel.remove(
      savedRecipeId,
      userId
    );

  if (affectedRows !== 1) {
    throw new AppError(
      "Saved recipe not found",
      404
    );
  }

  return {
    id: savedRecipeId,
    saved: false,
  };
};

module.exports = {
  getSavedRecipes,
  saveRecipe,
  moveSavedRecipe,
  deleteSavedRecipe,
};