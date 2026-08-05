const { pool } = require("../config/db");

/*
Returns the current user's saved recipes.

Only active recipes are included.
The optional folderId filter is applied when supplied.
*/
const findAllByUserId = async (
  userId,
  folderId = null
) => {
  let query = `
    SELECT
      sr.id,
      sr.folder_id,
      sr.recipe_id,

      r.title,
      r.image_url,

      r.preparation_time +
        r.cooking_time AS total_time,

      r.difficulty,

      COALESCE(
        cp.display_name,
        u.username
      ) AS chef_name

    FROM saved_recipes sr

    INNER JOIN recipes r
      ON r.id = sr.recipe_id

    INNER JOIN users u
      ON u.id = r.chef_id

    LEFT JOIN chef_profiles cp
      ON cp.user_id = r.chef_id

    WHERE sr.user_id = ?
      AND r.is_active = TRUE
  `;

  const parameters = [userId];

  if (folderId !== null) {
    query +=
      " AND sr.folder_id = ?";

    parameters.push(folderId);
  }

  query +=
    " ORDER BY sr.saved_at DESC";

  const [rows] = await pool.execute(
    query,
    parameters
  );

  return rows;
};

/*
Checks whether the recipe is already saved by the user.

Only the saved record ID is required.
*/
const findByUserIdAndRecipeId = async (
  userId,
  recipeId
) => {
  const [rows] = await pool.execute(
    `
      SELECT
        id
      FROM saved_recipes
      WHERE user_id = ?
        AND recipe_id = ?
      LIMIT 1
    `,
    [userId, recipeId]
  );

  return rows[0] || null;
};

/*
Finds a saved-recipe record only when it belongs
to the authenticated user.
*/
const findByIdAndUserId = async (
  savedRecipeId,
  userId
) => {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        recipe_id,
        folder_id
      FROM saved_recipes
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `,
    [savedRecipeId, userId]
  );

  return rows[0] || null;
};

/*
Checks whether an active recipe exists.

Only the minimum fields required for saving are selected.
*/
const findActiveRecipeById = async (
  recipeId
) => {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        title,
        image_url
      FROM recipes
      WHERE id = ?
        AND is_active = TRUE
      LIMIT 1
    `,
    [recipeId]
  );

  return rows[0] || null;
};

/*
Creates a saved-recipe record without performing
an additional SELECT query.
*/
const create = async (
  userId,
  recipeId,
  folderId
) => {
  const [result] = await pool.execute(
    `
      INSERT INTO saved_recipes (
        user_id,
        recipe_id,
        folder_id
      )
      VALUES (?, ?, ?)
    `,
    [userId, recipeId, folderId]
  );

  return {
    id: result.insertId,
    recipe_id: recipeId,
    folder_id: folderId,
    saved: true,
  };
};

/*
Moves a saved recipe to another folder.

A NULL folder ID means that the recipe remains saved
without belonging to a specific folder.
*/
const move = async (
  savedRecipeId,
  userId,
  folderId
) => {
  const [result] = await pool.execute(
    `
      UPDATE saved_recipes
      SET folder_id = ?
      WHERE id = ?
        AND user_id = ?
    `,
    [
      folderId,
      savedRecipeId,
      userId,
    ]
  );

  return result.affectedRows;
};

/*
Deletes a saved-recipe record owned by the current user.
*/
const remove = async (
  savedRecipeId,
  userId
) => {
  const [result] = await pool.execute(
    `
      DELETE FROM saved_recipes
      WHERE id = ?
        AND user_id = ?
    `,
    [savedRecipeId, userId]
  );

  return result.affectedRows;
};

module.exports = {
  findAllByUserId,
  findByUserIdAndRecipeId,
  findByIdAndUserId,
  findActiveRecipeById,
  create,
  move,
  remove,
};
