const { pool } = require("../config/db");

/*
Creates the main recipe row inside an existing transaction.

The transaction connection is supplied by the service so the
recipe, ingredients and steps succeed or fail together.
*/
const create = async (
  connection,
  {
    chefId,
    categoryId,
    title,
    description,
    imageUrl,
    imagePublicId,
    preparationTime,
    cookingTime,
    difficulty,
    servings,
    dietType,
    allergens,
    chefTips,
  }
) => {
  const [result] = await connection.execute(
    `
      INSERT INTO recipes (
        chef_id,
        category_id,
        title,
        description,
        image_url,
        image_public_id,
        preparation_time,
        cooking_time,
        difficulty,
        servings,
        diet_type,
        allergens,
        chef_tips,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
    `,
    [
      chefId,
      categoryId,
      title,
      description,
      imageUrl,
      imagePublicId,
      preparationTime,
      cookingTime,
      difficulty,
      servings,
      dietType,
      allergens,
      chefTips,
    ]
  );

  return result.insertId;
};

/*
Creates all recipe ingredients inside the current transaction.
*/
const createIngredients = async (
  connection,
  recipeId,
  ingredients
) => {
  for (const ingredient of ingredients) {
    await connection.execute(
      `
        INSERT INTO recipe_ingredients (
          recipe_id,
          ingredient_name,
          quantity,
          unit,
          position
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        recipeId,
        ingredient.name,
        ingredient.quantity,
        ingredient.unit,
        ingredient.position,
      ]
    );
  }
};

/*
Creates all preparation steps inside the current transaction.
*/
const createSteps = async (
  connection,
  recipeId,
  steps
) => {
  for (const step of steps) {
    await connection.execute(
      `
        INSERT INTO recipe_steps (
          recipe_id,
          step_number,
          instruction
        )
        VALUES (?, ?, ?)
      `,
      [
        recipeId,
        step.stepNumber,
        step.instruction,
      ]
    );
  }
};

/*
Builds the shared WHERE section for recipe-list queries.

All user values are passed separately as query parameters.
*/
const buildRecipeListFilters = ({
  search,
  categoryId,
  difficulty,
  dietType,
  maxTotalTime,
  chefId,
}) => {
  const conditions = [
    "r.is_active = TRUE",
  ];

  const parameters = [];

  if (search) {
    conditions.push("r.title LIKE ?");
    parameters.push(`%${search}%`);
  }

  if (categoryId) {
    conditions.push("r.category_id = ?");
    parameters.push(categoryId);
  }

  if (difficulty) {
    conditions.push("r.difficulty = ?");
    parameters.push(difficulty);
  }

  if (dietType) {
    conditions.push("r.diet_type = ?");
    parameters.push(dietType);
  }

  if (maxTotalTime) {
    conditions.push(
      "(r.preparation_time + r.cooking_time) <= ?"
    );

    parameters.push(maxTotalTime);
  }

  if (chefId) {
    conditions.push("r.chef_id = ?");
    parameters.push(chefId);
  }

  return {
    whereClause:
      `WHERE ${conditions.join(" AND ")}`,
    parameters,
  };
};

/*
Returns a paginated list containing only recipe-card data.

Ingredients, steps, description and internal image identifiers
are not returned here.
*/
const findAll = async ({
  search,
  categoryId,
  difficulty,
  dietType,
  maxTotalTime,
  chefId,
  limit,
  offset,
  sortSql,
}) => {
  const {
    whereClause,
    parameters,
  } = buildRecipeListFilters({
    search,
    categoryId,
    difficulty,
    dietType,
    maxTotalTime,
    chefId,
  });

  /*
  limit and offset were already validated by the service.

  They are converted again to numbers before being placed
  directly in the query because some MySQL configurations
  do not support placeholders for LIMIT and OFFSET.
  */
  const safeLimit = Number(limit);
  const safeOffset = Number(offset);

  const query = `
    SELECT
      r.id,
      r.title,
      r.image_url,
      r.preparation_time +
        r.cooking_time AS total_time,
      r.difficulty,
      r.diet_type,

      c.id AS category_id,
      c.name AS category_name,

      r.chef_id,

      COALESCE(
        cp.display_name,
        u.username
      ) AS chef_name,

      COALESCE(
        review_summary.average_rating,
        0
      ) AS average_rating,

      COALESCE(
        review_summary.review_count,
        0
      ) AS review_count

    FROM recipes r

    INNER JOIN categories c
      ON c.id = r.category_id

    INNER JOIN users u
      ON u.id = r.chef_id

    LEFT JOIN chef_profiles cp
      ON cp.user_id = r.chef_id

    LEFT JOIN (
      SELECT
        recipe_id,
        ROUND(AVG(rating), 1)
          AS average_rating,
        COUNT(*) AS review_count
      FROM reviews
      WHERE is_active = TRUE
      GROUP BY recipe_id
    ) AS review_summary
      ON review_summary.recipe_id = r.id

    ${whereClause}

    ORDER BY ${sortSql}

    LIMIT ${safeLimit}
    OFFSET ${safeOffset}
  `;

  const [rows] = await pool.execute(
    query,
    parameters
  );

  return rows;
};

/*
Counts matching recipes for pagination.

Only the matching number is required, so no joins with
ingredients, steps or reviews are performed.
*/
const countAll = async ({
  search,
  categoryId,
  difficulty,
  dietType,
  maxTotalTime,
  chefId,
}) => {
  const {
    whereClause,
    parameters,
  } = buildRecipeListFilters({
    search,
    categoryId,
    difficulty,
    dietType,
    maxTotalTime,
    chefId,
  });

  const [rows] = await pool.execute(
    `
      SELECT
        COUNT(*) AS total_items
      FROM recipes r
      ${whereClause}
    `,
    parameters
  );

  return Number(
    rows[0]?.total_items || 0
  );
};

/*
Returns the recipe fields required by the recipe-details page.

Internal fields such as image_public_id and is_active
are deliberately not returned to the client.
*/
const findById = async (recipeId) => {
  const [rows] = await pool.execute(
    `
      SELECT
        r.id,
        r.chef_id,
        r.category_id,
        r.title,
        r.description,
        r.image_url,
        r.preparation_time,
        r.cooking_time,
        r.difficulty,
        r.servings,
        r.diet_type,
        r.allergens,
        r.chef_tips,
        r.created_at,

        c.name AS category_name,

        u.username AS chef_username,

        u.profile_image_url
          AS chef_profile_image_url,

        cp.display_name
          AS chef_display_name

      FROM recipes r

      INNER JOIN categories c
        ON c.id = r.category_id

      INNER JOIN users u
        ON u.id = r.chef_id

      LEFT JOIN chef_profiles cp
        ON cp.user_id = r.chef_id

      WHERE r.id = ?
        AND r.is_active = TRUE

      LIMIT 1
    `,
    [recipeId]
  );

  return rows[0] || null;
};

/*
Returns only the ingredient fields required
for displaying a complete recipe.
*/
const findIngredientsByRecipeId = async (
  recipeId
) => {
  const [rows] = await pool.execute(
    `
      SELECT
        ingredient_name,
        quantity,
        unit,
        position
      FROM recipe_ingredients
      WHERE recipe_id = ?
      ORDER BY position ASC
    `,
    [recipeId]
  );

  return rows;
};

/*
Returns only the preparation-step fields required
for displaying a complete recipe.
*/
const findStepsByRecipeId = async (
  recipeId
) => {
  const [rows] = await pool.execute(
    `
      SELECT
        step_number,
        instruction
      FROM recipe_steps
      WHERE recipe_id = ?
      ORDER BY step_number ASC
    `,
    [recipeId]
  );

  return rows;
};

/*
Returns internal recipe data required for update or deletion.

The selected row is locked until the transaction completes.
*/
const findByIdForUpdate = async (
  connection,
  recipeId
) => {
  const [rows] = await connection.execute(
    `
      SELECT
        id,
        chef_id,
        category_id,
        image_url,
        image_public_id,
        is_active
      FROM recipes
      WHERE id = ?
      FOR UPDATE
    `,
    [recipeId]
  );

  return rows[0] || null;
};

/*
Updates the main recipe row inside an existing transaction.
*/
const update = async (
  connection,
  recipeId,
  {
    categoryId,
    title,
    description,
    imageUrl,
    imagePublicId,
    preparationTime,
    cookingTime,
    difficulty,
    servings,
    dietType,
    allergens,
    chefTips,
  }
) => {
  await connection.execute(
    `
      UPDATE recipes
      SET
        category_id = ?,
        title = ?,
        description = ?,
        image_url = ?,
        image_public_id = ?,
        preparation_time = ?,
        cooking_time = ?,
        difficulty = ?,
        servings = ?,
        diet_type = ?,
        allergens = ?,
        chef_tips = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      categoryId,
      title,
      description,
      imageUrl,
      imagePublicId,
      preparationTime,
      cookingTime,
      difficulty,
      servings,
      dietType,
      allergens,
      chefTips,
      recipeId,
    ]
  );
};

/*
Deletes existing ingredient rows inside the current transaction.

New ingredient rows are inserted afterwards.
*/
const deleteIngredients = async (
  connection,
  recipeId
) => {
  await connection.execute(
    `
      DELETE FROM recipe_ingredients
      WHERE recipe_id = ?
    `,
    [recipeId]
  );
};

/*
Deletes existing preparation steps inside the transaction.

New step rows are inserted afterwards.
*/
const deleteSteps = async (
  connection,
  recipeId
) => {
  await connection.execute(
    `
      DELETE FROM recipe_steps
      WHERE recipe_id = ?
    `,
    [recipeId]
  );
};

/*
Soft-deletes a recipe inside an existing transaction.

The recipe and its related data remain in the database,
but the recipe is no longer returned by active recipe queries.
*/
const deactivate = async (
  connection,
  recipeId
) => {
  const [result] = await connection.execute(
    `
      UPDATE recipes
      SET
        is_active = FALSE,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND is_active = TRUE
    `,
    [recipeId]
  );

  return result.affectedRows;
};

module.exports = {
  create,
  createIngredients,
  createSteps,
  findAll,
  countAll,
  findById,
  findIngredientsByRecipeId,
  findStepsByRecipeId,
  findByIdForUpdate,
  update,
  deleteIngredients,
  deleteSteps,
  deactivate,
};