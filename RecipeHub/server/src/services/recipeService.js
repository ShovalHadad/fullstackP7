const { pool } = require("../config/db");

const recipeModel =
  require("../models/recipeModel");

const categoryModel =
  require("../models/categoryModel");

const imageService =
  require("./imageService");

const AppError =
  require("./appError");

const ALLOWED_DIFFICULTIES = [
  "easy",
  "medium",
  "hard",
];

const ALLOWED_DIET_TYPES = [
  "meat",
  "dairy",
  "parve",
  "vegan",
  "vegetarian",
  "other",
];

const ALLOWED_SORTS = {
  newest: "r.created_at DESC",
  oldest: "r.created_at ASC",
  rating:
    "average_rating DESC, r.created_at DESC",
  timeAsc:
    "total_time ASC, r.created_at DESC",
  timeDesc:
    "total_time DESC, r.created_at DESC",
  titleAsc: "r.title ASC",
  titleDesc: "r.title DESC",
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

/*
Validates a recipe ID.
*/
const validateRecipeId = (recipeId) => {
  if (
    !Number.isInteger(recipeId) ||
    recipeId <= 0
  ) {
    throw new AppError(
      "Recipe ID is not valid",
      400
    );
  }
};

/*
Parses an optional positive integer.

When the value is missing, null is returned.
*/
const parseOptionalPositiveInteger = (
  value,
  fieldName
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const parsedValue = Number(value);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue <= 0
  ) {
    throw new AppError(
      `${fieldName} must be a positive integer`,
      400
    );
  }

  return parsedValue;
};

/*
Validates and normalizes recipe-list query parameters.
*/
const validateRecipeListQuery = (query) => {
  const page =
    query.page === undefined
      ? DEFAULT_PAGE
      : Number(query.page);

  if (
    !Number.isInteger(page) ||
    page <= 0
  ) {
    throw new AppError(
      "Page must be a positive integer",
      400
    );
  }

  const limit =
    query.limit === undefined
      ? DEFAULT_LIMIT
      : Number(query.limit);

  if (
    !Number.isInteger(limit) ||
    limit <= 0 ||
    limit > MAX_LIMIT
  ) {
    throw new AppError(
      `Limit must be between 1 and ${MAX_LIMIT}`,
      400
    );
  }

  let search = null;

  if (
    query.search !== undefined &&
    query.search !== null
  ) {
    if (typeof query.search !== "string") {
      throw new AppError(
        "Search must be text",
        400
      );
    }

    search =
      query.search.trim() || null;

    if (
      search &&
      search.length > 100
    ) {
      throw new AppError(
        "Search cannot exceed 100 characters",
        400
      );
    }
  }

  const categoryId =
    parseOptionalPositiveInteger(
      query.categoryId,
      "Category ID"
    );

  const maxTotalTime =
    parseOptionalPositiveInteger(
      query.maxTotalTime,
      "Maximum total time"
    );

  const chefId =
    parseOptionalPositiveInteger(
      query.chefId,
      "Chef ID"
    );

  let difficulty = null;

  if (
    query.difficulty !== undefined &&
    query.difficulty !== ""
  ) {
    difficulty = query.difficulty;

    if (
      !ALLOWED_DIFFICULTIES.includes(
        difficulty
      )
    ) {
      throw new AppError(
        "Recipe difficulty is not valid",
        400
      );
    }
  }

  let dietType = null;

  if (
    query.dietType !== undefined &&
    query.dietType !== ""
  ) {
    dietType = query.dietType;

    if (
      !ALLOWED_DIET_TYPES.includes(
        dietType
      )
    ) {
      throw new AppError(
        "Recipe diet type is not valid",
        400
      );
    }
  }

  const sort =
    query.sort || "newest";

  if (!ALLOWED_SORTS[sort]) {
    throw new AppError(
      "Recipe sort option is not valid",
      400
    );
  }

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    search,
    categoryId,
    difficulty,
    dietType,
    maxTotalTime,
    chefId,
    sort,
    sortSql: ALLOWED_SORTS[sort],
  };
};

/*
Returns a paginated and filtered recipe-card list.

The list query and count query run in parallel.
*/
const getRecipes = async (query) => {
  const filters =
    validateRecipeListQuery(query);

  const [recipes, totalItems] =
    await Promise.all([
      recipeModel.findAll(filters),
      recipeModel.countAll(filters),
    ]);

  const totalPages =
    totalItems === 0
      ? 0
      : Math.ceil(
          totalItems / filters.limit
        );

  return {
    items: recipes,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total_items: totalItems,
      total_pages: totalPages,
    },
  };
};

/*
Parses a JSON array received through multipart/form-data.
*/
const parseJsonArray = (
  value,
  fieldName
) => {
  if (!value) {
    throw new AppError(
      `${fieldName} are required`,
      400
    );
  }

  let parsedValue;

  try {
    parsedValue =
      typeof value === "string"
        ? JSON.parse(value)
        : value;
  } catch (error) {
    throw new AppError(
      `${fieldName} must contain valid JSON`,
      400
    );
  }

  if (!Array.isArray(parsedValue)) {
    throw new AppError(
      `${fieldName} must be an array`,
      400
    );
  }

  return parsedValue;
};

/*
Validates and normalizes the ingredient list.
*/
const validateIngredients = (
  ingredientsValue
) => {
  const ingredients = parseJsonArray(
    ingredientsValue,
    "Ingredients"
  );

  if (ingredients.length === 0) {
    throw new AppError(
      "At least one ingredient is required",
      400
    );
  }

  return ingredients.map(
    (ingredient, index) => {
      if (
        !ingredient ||
        typeof ingredient.name !==
          "string" ||
        !ingredient.name.trim()
      ) {
        throw new AppError(
          `Ingredient ${index + 1} must have a name`,
          400
        );
      }

      let quantity = null;

      if (
        ingredient.quantity !==
          undefined &&
        ingredient.quantity !== null &&
        ingredient.quantity !== ""
      ) {
        quantity = Number(
          ingredient.quantity
        );

        if (
          !Number.isFinite(quantity) ||
          quantity <= 0
        ) {
          throw new AppError(
            `Ingredient ${index + 1} has an invalid quantity`,
            400
          );
        }
      }

      let unit = null;

      if (
        ingredient.unit !== undefined &&
        ingredient.unit !== null
      ) {
        if (
          typeof ingredient.unit !==
            "string"
        ) {
          throw new AppError(
            `Ingredient ${index + 1} has an invalid unit`,
            400
          );
        }

        unit =
          ingredient.unit.trim() ||
          null;
      }

      return {
        name:
          ingredient.name.trim(),
        quantity,
        unit,
        position: index + 1,
      };
    }
  );
};

/*
Validates and normalizes preparation steps.
*/
const validateSteps = (stepsValue) => {
  const steps = parseJsonArray(
    stepsValue,
    "Steps"
  );

  if (steps.length === 0) {
    throw new AppError(
      "At least one preparation step is required",
      400
    );
  }

  return steps.map((step, index) => {
    const instruction =
      typeof step === "string"
        ? step
        : step?.instruction;

    if (
      typeof instruction !== "string" ||
      !instruction.trim()
    ) {
      throw new AppError(
        `Step ${index + 1} must contain an instruction`,
        400
      );
    }

    return {
      stepNumber: index + 1,
      instruction:
        instruction.trim(),
    };
  });
};

/*
Validates and normalizes the main recipe fields.
*/
const validateRecipeData = (
  recipeData
) => {
  const {
    title,
    description,
    categoryId,
    preparationTime,
    cookingTime,
    difficulty,
    servings,
    dietType,
    allergens,
    chefTips,
  } = recipeData;

  if (
    typeof title !== "string" ||
    title.trim().length < 2
  ) {
    throw new AppError(
      "Recipe title must contain at least 2 characters",
      400
    );
  }

  if (
    typeof description !== "string" ||
    description.trim().length < 10
  ) {
    throw new AppError(
      "Recipe description must contain at least 10 characters",
      400
    );
  }

  const normalizedCategoryId =
    Number(categoryId);

  if (
    !Number.isInteger(
      normalizedCategoryId
    ) ||
    normalizedCategoryId <= 0
  ) {
    throw new AppError(
      "Category ID is not valid",
      400
    );
  }

  const normalizedPreparationTime =
    Number(preparationTime);

  if (
    !Number.isInteger(
      normalizedPreparationTime
    ) ||
    normalizedPreparationTime <= 0
  ) {
    throw new AppError(
      "Preparation time must be a positive integer",
      400
    );
  }

  const normalizedCookingTime =
    Number(cookingTime);

  if (
    !Number.isInteger(
      normalizedCookingTime
    ) ||
    normalizedCookingTime < 0
  ) {
    throw new AppError(
      "Cooking time must be zero or a positive integer",
      400
    );
  }

  const normalizedServings =
    Number(servings);

  if (
    !Number.isInteger(
      normalizedServings
    ) ||
    normalizedServings <= 0
  ) {
    throw new AppError(
      "Servings must be a positive integer",
      400
    );
  }

  if (
    !ALLOWED_DIFFICULTIES.includes(
      difficulty
    )
  ) {
    throw new AppError(
      "Recipe difficulty is not valid",
      400
    );
  }

  if (
    !ALLOWED_DIET_TYPES.includes(
      dietType
    )
  ) {
    throw new AppError(
      "Recipe diet type is not valid",
      400
    );
  }

  let normalizedAllergens = null;

  if (
    allergens !== undefined &&
    allergens !== null
  ) {
    if (
      typeof allergens !== "string"
    ) {
      throw new AppError(
        "Allergens must be text",
        400
      );
    }

    normalizedAllergens =
      allergens.trim() || null;
  }

  let normalizedChefTips = null;

  if (
    chefTips !== undefined &&
    chefTips !== null
  ) {
    if (
      typeof chefTips !== "string"
    ) {
      throw new AppError(
        "Chef tips must be text",
        400
      );
    }

    normalizedChefTips =
      chefTips.trim() || null;
  }

  return {
    title: title.trim(),
    description:
      description.trim(),
    categoryId:
      normalizedCategoryId,
    preparationTime:
      normalizedPreparationTime,
    cookingTime:
      normalizedCookingTime,
    difficulty,
    servings:
      normalizedServings,
    dietType,
    allergens:
      normalizedAllergens,
    chefTips:
      normalizedChefTips,
  };
};

/*
Returns a complete active recipe.

The ingredient and step queries run in parallel.
*/
const getRecipeById = async (
  recipeId
) => {
  validateRecipeId(recipeId);

  const recipe =
    await recipeModel.findById(
      recipeId
    );

  if (!recipe) {
    throw new AppError(
      "Recipe not found",
      404
    );
  }

  const [ingredients, steps] =
    await Promise.all([
      recipeModel
        .findIngredientsByRecipeId(
          recipeId
        ),

      recipeModel
        .findStepsByRecipeId(
          recipeId
        ),
    ]);

  return {
    ...recipe,
    ingredients,
    steps,
  };
};

/*
Creates a complete recipe.

The response is built from values already available in memory,
so no additional SELECT is performed after the transaction.
*/
const createRecipe = async (
  chefId,
  recipeData,
  imageFile
) => {
  if (!imageFile?.buffer) {
    throw new AppError(
      "Recipe image is required",
      400
    );
  }

  const validatedRecipeData =
    validateRecipeData(recipeData);

  const ingredients =
    validateIngredients(
      recipeData.ingredients
    );

  const steps =
    validateSteps(
      recipeData.steps
    );

  const category =
    await categoryModel.findById(
      validatedRecipeData.categoryId
    );

  if (
    !category ||
    !category.is_active
  ) {
    throw new AppError(
      "The selected category is not available",
      400
    );
  }

  let uploadedImage = null;
  let connection = null;

  try {
    uploadedImage =
      await imageService
        .uploadImageBuffer(
          imageFile.buffer,
          "recipehub/recipes"
        );

    connection =
      await pool.getConnection();

    await connection.beginTransaction();

    const recipeId =
      await recipeModel.create(
        connection,
        {
          chefId,
          ...validatedRecipeData,
          imageUrl:
            uploadedImage.imageUrl,
          imagePublicId:
            uploadedImage.imagePublicId,
        }
      );

    await recipeModel
      .createIngredients(
        connection,
        recipeId,
        ingredients
      );

    await recipeModel.createSteps(
      connection,
      recipeId,
      steps
    );

    await connection.commit();

    return {
      id: recipeId,
      title:
        validatedRecipeData.title,
      description:
        validatedRecipeData
          .description,
      image_url:
        uploadedImage.imageUrl,

      category: {
        id:
          validatedRecipeData
            .categoryId,
        name: category.name,
      },

      preparation_time:
        validatedRecipeData
          .preparationTime,

      cooking_time:
        validatedRecipeData
          .cookingTime,

      difficulty:
        validatedRecipeData
          .difficulty,

      servings:
        validatedRecipeData
          .servings,

      diet_type:
        validatedRecipeData.dietType,

      allergens:
        validatedRecipeData
          .allergens,

      chef_tips:
        validatedRecipeData
          .chefTips,

      ingredients:
        ingredients.map(
          (ingredient) => ({
            ingredient_name:
              ingredient.name,
            quantity:
              ingredient.quantity,
            unit:
              ingredient.unit,
            position:
              ingredient.position,
          })
        ),

      steps:
        steps.map((step) => ({
          step_number:
            step.stepNumber,
          instruction:
            step.instruction,
        })),
    };
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    if (
      uploadedImage?.imagePublicId
    ) {
      try {
        await imageService.deleteImage(
          uploadedImage.imagePublicId
        );
      } catch (imageDeletionError) {
        console.error(
          "Failed to remove unused recipe image:",
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
Updates a recipe owned by the authenticated chef.

The recipe, ingredients and steps are updated
inside one MySQL transaction.
*/
const updateRecipe = async (
  recipeId,
  chefId,
  recipeData,
  imageFile
) => {
  validateRecipeId(recipeId);

  const validatedRecipeData =
    validateRecipeData(recipeData);

  const ingredients =
    validateIngredients(
      recipeData.ingredients
    );

  const steps =
    validateSteps(
      recipeData.steps
    );

  const category =
    await categoryModel.findById(
      validatedRecipeData.categoryId
    );

  if (
    !category ||
    !category.is_active
  ) {
    throw new AppError(
      "The selected category is not available",
      400
    );
  }

  let uploadedImage = null;
  let connection = null;
  let transactionCommitted = false;
  let oldImagePublicId = null;

  try {
    if (imageFile?.buffer) {
      uploadedImage =
        await imageService
          .uploadImageBuffer(
            imageFile.buffer,
            "recipehub/recipes"
          );
    }

    connection =
      await pool.getConnection();

    await connection.beginTransaction();

    const existingRecipe =
      await recipeModel
        .findByIdForUpdate(
          connection,
          recipeId
        );

    if (
      !existingRecipe ||
      !existingRecipe.is_active
    ) {
      throw new AppError(
        "Recipe not found",
        404
      );
    }

    if (
      Number(existingRecipe.chef_id) !==
      Number(chefId)
    ) {
      throw new AppError(
        "You are not allowed to update this recipe",
        403
      );
    }

    oldImagePublicId =
      existingRecipe.image_public_id;

    const finalImageUrl =
      uploadedImage?.imageUrl ||
      existingRecipe.image_url;

    const finalImagePublicId =
      uploadedImage?.imagePublicId ||
      existingRecipe.image_public_id;

    await recipeModel.update(
      connection,
      recipeId,
      {
        ...validatedRecipeData,
        imageUrl: finalImageUrl,
        imagePublicId:
          finalImagePublicId,
      }
    );

    await recipeModel.deleteIngredients(
      connection,
      recipeId
    );

    await recipeModel.createIngredients(
      connection,
      recipeId,
      ingredients
    );

    await recipeModel.deleteSteps(
      connection,
      recipeId
    );

    await recipeModel.createSteps(
      connection,
      recipeId,
      steps
    );

    await connection.commit();
    transactionCommitted = true;

    if (
      uploadedImage?.imagePublicId &&
      oldImagePublicId &&
      oldImagePublicId !==
        uploadedImage.imagePublicId
    ) {
      try {
        await imageService.deleteImage(
          oldImagePublicId
        );
      } catch (imageDeletionError) {
        console.error(
          "Failed to delete previous recipe image:",
          imageDeletionError.message
        );
      }
    }

    return {
      id: recipeId,

      title:
        validatedRecipeData.title,

      description:
        validatedRecipeData
          .description,

      image_url:
        uploadedImage?.imageUrl ||
        existingRecipe.image_url,

      category: {
        id:
          validatedRecipeData
            .categoryId,
        name: category.name,
      },

      preparation_time:
        validatedRecipeData
          .preparationTime,

      cooking_time:
        validatedRecipeData
          .cookingTime,

      difficulty:
        validatedRecipeData
          .difficulty,

      servings:
        validatedRecipeData
          .servings,

      diet_type:
        validatedRecipeData.dietType,

      allergens:
        validatedRecipeData
          .allergens,

      chef_tips:
        validatedRecipeData
          .chefTips,

      ingredients:
        ingredients.map(
          (ingredient) => ({
            ingredient_name:
              ingredient.name,
            quantity:
              ingredient.quantity,
            unit:
              ingredient.unit,
            position:
              ingredient.position,
          })
        ),

      steps:
        steps.map((step) => ({
          step_number:
            step.stepNumber,
          instruction:
            step.instruction,
        })),
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
      } catch (imageDeletionError) {
        console.error(
          "Failed to remove unused updated recipe image:",
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
Soft-deletes a recipe owned by the authenticated chef.

The recipe row, image, ingredients and steps remain stored.
*/
const deleteOwnRecipe = async (
  recipeId,
  chefId
) => {
  validateRecipeId(recipeId);

  const connection =
    await pool.getConnection();

  try {
    await connection.beginTransaction();

    const recipe =
      await recipeModel
        .findByIdForUpdate(
          connection,
          recipeId
        );

    if (
      !recipe ||
      !recipe.is_active
    ) {
      throw new AppError(
        "Recipe not found",
        404
      );
    }

    if (
      Number(recipe.chef_id) !==
      Number(chefId)
    ) {
      throw new AppError(
        "You are not allowed to delete this recipe",
        403
      );
    }

    const affectedRows =
      await recipeModel.deactivate(
        connection,
        recipeId
      );

    if (affectedRows !== 1) {
      throw new AppError(
        "Recipe could not be deleted",
        409
      );
    }

    await connection.commit();

    return {
      id: recipeId,
      is_active: 0,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/*
Soft-deletes any active recipe as an administrator.

Administrators do not need to own the recipe.
*/
const adminDeleteRecipe = async (
  recipeId
) => {
  validateRecipeId(recipeId);

  const connection =
    await pool.getConnection();

  try {
    await connection.beginTransaction();

    const recipe =
      await recipeModel
        .findByIdForUpdate(
          connection,
          recipeId
        );

    if (
      !recipe ||
      !recipe.is_active
    ) {
      throw new AppError(
        "Recipe not found",
        404
      );
    }

    const affectedRows =
      await recipeModel.deactivate(
        connection,
        recipeId
      );

    if (affectedRows !== 1) {
      throw new AppError(
        "Recipe could not be deleted",
        409
      );
    }

    await connection.commit();

    return {
      id: recipeId,
      is_active: 0,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
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