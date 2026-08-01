const { pool } = require("../config/db");

/*
Returns all folders that belong to the authenticated user.

The recipe count includes only active recipes.
*/
const findAllByUserId = async (userId) => {
  const [rows] = await pool.execute(
    `
      SELECT
        f.id,
        f.name,

        COUNT(
          CASE
            WHEN r.is_active = TRUE
            THEN sr.id
          END
        ) AS recipe_count

      FROM folders f

      LEFT JOIN saved_recipes sr
        ON sr.folder_id = f.id
        AND sr.user_id = f.user_id

      LEFT JOIN recipes r
        ON r.id = sr.recipe_id

      WHERE f.user_id = ?

      GROUP BY
        f.id,
        f.name

      ORDER BY f.name ASC
    `,
    [userId]
  );

  return rows;
};

/*
Finds a folder only when it belongs to the specified user.

Including user_id in the query prevents access
to another user's folder.
*/
const findByIdAndUserId = async (
  folderId,
  userId
) => {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        name
      FROM folders
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `,
    [folderId, userId]
  );

  return rows[0] || null;
};

/*
Finds and locks a folder inside a transaction.

The folder is returned only when it belongs
to the authenticated user.
*/
const findByIdAndUserIdForUpdate = async (
  connection,
  folderId,
  userId
) => {
  const [rows] = await connection.execute(
    `
      SELECT
        id,
        name
      FROM folders
      WHERE id = ?
        AND user_id = ?
      FOR UPDATE
    `,
    [folderId, userId]
  );

  return rows[0] || null;
};

/*
Finds a folder by name for the current user.

Only the ID is required for duplicate-name validation.
*/
const findByNameAndUserId = async (
  name,
  userId
) => {
  const [rows] = await pool.execute(
    `
      SELECT
        id
      FROM folders
      WHERE user_id = ?
        AND name = ?
      LIMIT 1
    `,
    [userId, name]
  );

  return rows[0] || null;
};

/*
Creates a personal folder without performing
an additional SELECT query.
*/
const create = async (userId, name) => {
  const [result] = await pool.execute(
    `
      INSERT INTO folders (
        user_id,
        name
      )
      VALUES (?, ?)
    `,
    [userId, name]
  );

  return {
    id: result.insertId,
    name,
    recipe_count: 0,
  };
};

/*
Updates only a folder that belongs to the current user.
*/
const update = async (
  folderId,
  userId,
  name
) => {
  const [result] = await pool.execute(
    `
      UPDATE folders
      SET
        name = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND user_id = ?
    `,
    [name, folderId, userId]
  );

  return result.affectedRows;
};

/*
Deletes all saved-recipe records that belong
to the user and are stored inside the specified folder.

The recipes themselves are not deleted.
Only the user's saved references are removed.
*/
const deleteSavedRecipesByFolder = async (
  connection,
  folderId,
  userId
) => {
  const [result] = await connection.execute(
    `
      DELETE FROM saved_recipes
      WHERE folder_id = ?
        AND user_id = ?
    `,
    [folderId, userId]
  );

  return result.affectedRows;
};

/*
Deletes a folder inside the current transaction.

The query includes user_id so one user cannot delete
another user's folder.
*/
const remove = async (
  connection,
  folderId,
  userId
) => {
  const [result] = await connection.execute(
    `
      DELETE FROM folders
      WHERE id = ?
        AND user_id = ?
    `,
    [folderId, userId]
  );

  return result.affectedRows;
};

module.exports = {
  findAllByUserId,
  findByIdAndUserId,
  findByIdAndUserIdForUpdate,
  findByNameAndUserId,
  create,
  update,
  deleteSavedRecipesByFolder,
  remove,
};