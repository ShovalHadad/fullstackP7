const { pool } = require("../config/db");

/*
Returns the minimum active recipe data required
for creating or displaying reviews.
*/
const findActiveRecipeById = async (
  recipeId
) => {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        chef_id,
        title
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
Returns active reviews for an active recipe.

Only fields required by the review section are selected.
*/
const findAllByRecipeId = async (
  recipeId
) => {
  const [rows] = await pool.execute(
    `
      SELECT
        rv.id,
        rv.rating,
        rv.comment,
        rv.image_url,
        rv.created_at,
        rv.updated_at,

        rv.user_id,
        u.username,
        u.profile_image_url

      FROM reviews rv

      INNER JOIN users u
        ON u.id = rv.user_id

      WHERE rv.recipe_id = ?
        AND rv.is_active = TRUE

      ORDER BY rv.created_at DESC
    `,
    [recipeId]
  );

  return rows;
};

/*
Returns the rating summary for a recipe.

This is kept separate from the review list so the response
contains only the required aggregated values.
*/
const findRatingSummaryByRecipeId = async (
  recipeId
) => {
  const [rows] = await pool.execute(
    `
      SELECT
        ROUND(AVG(rating), 1)
          AS average_rating,
        COUNT(*) AS review_count
      FROM reviews
      WHERE recipe_id = ?
        AND is_active = TRUE
    `,
    [recipeId]
  );

  return rows[0] || {
    average_rating: null,
    review_count: 0,
  };
};

/*
Checks whether the user already has an active review
for the specified recipe.
*/
const findActiveByUserIdAndRecipeId = async (
  userId,
  recipeId
) => {
  const [rows] = await pool.execute(
    `
      SELECT
        id
      FROM reviews
      WHERE user_id = ?
        AND recipe_id = ?
        AND is_active = TRUE
      LIMIT 1
    `,
    [userId, recipeId]
  );

  return rows[0] || null;
};

/*
Checks whether a review record already exists for the user
and recipe, including a previously deactivated review.

The database schema may enforce one row per user and recipe,
so an old row can be reactivated instead of inserting
a duplicate.
*/
const findAnyByUserIdAndRecipeIdForUpdate =
  async (
    connection,
    userId,
    recipeId
  ) => {
    const [rows] =
      await connection.execute(
        `
          SELECT
            id,
            is_active,
            image_public_id
          FROM reviews
          WHERE user_id = ?
            AND recipe_id = ?
          LIMIT 1
          FOR UPDATE
        `,
        [userId, recipeId]
      );

    return rows[0] || null;
  };

/*
Creates a new active review inside a transaction.
*/
const create = async (
  connection,
  {
    recipeId,
    userId,
    rating,
    comment,
    imageUrl,
    imagePublicId,
  }
) => {
  const [result] =
    await connection.execute(
      `
        INSERT INTO reviews (
          recipe_id,
          user_id,
          rating,
          comment,
          image_url,
          image_public_id,
          is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, TRUE)
      `,
      [
        recipeId,
        userId,
        rating,
        comment,
        imageUrl,
        imagePublicId,
      ]
    );

  return result.insertId;
};

/*
Reactivates a previously deleted review.

This supports schemas with a UNIQUE constraint on:
(user_id, recipe_id).
*/
const reactivate = async (
  connection,
  reviewId,
  {
    rating,
    comment,
    imageUrl,
    imagePublicId,
  }
) => {
  await connection.execute(
    `
      UPDATE reviews
      SET
        rating = ?,
        comment = ?,
        image_url = ?,
        image_public_id = ?,
        is_active = TRUE,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      rating,
      comment,
      imageUrl,
      imagePublicId,
      reviewId,
    ]
  );
};

/*
Creates a notification inside the current transaction.
*/
const createNotification = async (
  connection,
  {
    userId,
    type,
    title,
    message,
    relatedEntityType,
    relatedEntityId,
  }
) => {
  await connection.execute(
    `
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        related_entity_type,
        related_entity_id,
        is_read
      )
      VALUES (?, ?, ?, ?, ?, ?, FALSE)
    `,
    [
      userId,
      type,
      title,
      message,
      relatedEntityType,
      relatedEntityId,
    ]
  );
};

/*
Returns and locks a review owned by the authenticated user.

Internal image data is included because it may be required
for replacement or deletion in Cloudinary.
*/
const findByIdAndUserIdForUpdate = async (
  connection,
  reviewId,
  userId
) => {
  const [rows] =
    await connection.execute(
      `
        SELECT
          id,
          recipe_id,
          user_id,
          rating,
          comment,
          image_url,
          image_public_id,
          is_active
        FROM reviews
        WHERE id = ?
          AND user_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [reviewId, userId]
    );

  return rows[0] || null;
};

/*
Updates an active review inside the current transaction.
*/
const update = async (
  connection,
  reviewId,
  userId,
  {
    rating,
    comment,
    imageUrl,
    imagePublicId,
  }
) => {
  const [result] =
    await connection.execute(
      `
        UPDATE reviews
        SET
          rating = ?,
          comment = ?,
          image_url = ?,
          image_public_id = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND user_id = ?
          AND is_active = TRUE
      `,
      [
        rating,
        comment,
        imageUrl,
        imagePublicId,
        reviewId,
        userId,
      ]
    );

  return result.affectedRows;
};

/*
Soft-deletes an active review owned by the current user.

The Cloudinary image fields are cleared because the image
is removed after the database transaction succeeds.
*/
const deactivate = async (
  connection,
  reviewId,
  userId
) => {
  const [result] =
    await connection.execute(
      `
        UPDATE reviews
        SET
          is_active = FALSE,
          image_url = NULL,
          image_public_id = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND user_id = ?
          AND is_active = TRUE
      `,
      [reviewId, userId]
    );

  return result.affectedRows;
};

module.exports = {
  findActiveRecipeById,
  findAllByRecipeId,
  findRatingSummaryByRecipeId,
  findActiveByUserIdAndRecipeId,
  findAnyByUserIdAndRecipeIdForUpdate,
  create,
  reactivate,
  createNotification,
  findByIdAndUserIdForUpdate,
  update,
  deactivate,
};