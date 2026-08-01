const { pool } = require("../config/db");

/*
Returns the minimum active recipe data required
for creating a question.
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
Returns active questions and their optional active answers.

Only fields required by the recipe questions section
are returned.
*/
const findAllByRecipeId = async (
  recipeId
) => {
  const [rows] = await pool.execute(
    `
      SELECT
        q.id,
        q.question_text,
        q.created_at,

        q.user_id,
        question_user.username
          AS question_username,

        question_user.profile_image_url
          AS question_user_image_url,

        a.id AS answer_id,
        a.answer_text,
        a.created_at AS answer_created_at,

        a.chef_id AS answer_chef_id,

        COALESCE(
          cp.display_name,
          answer_chef.username
        ) AS answer_chef_name,

        answer_chef.profile_image_url
          AS answer_chef_image_url

      FROM questions q

      INNER JOIN users question_user
        ON question_user.id = q.user_id

      LEFT JOIN answers a
        ON a.question_id = q.id
        AND a.is_active = TRUE

      LEFT JOIN users answer_chef
        ON answer_chef.id = a.chef_id

      LEFT JOIN chef_profiles cp
        ON cp.user_id = a.chef_id

      WHERE q.recipe_id = ?
        AND q.is_active = TRUE

      ORDER BY q.created_at DESC
    `,
    [recipeId]
  );

  return rows;
};

/*
Creates a question inside an existing transaction.
*/
const createQuestion = async (
  connection,
  {
    recipeId,
    userId,
    questionText,
  }
) => {
  const [result] = await connection.execute(
    `
      INSERT INTO questions (
        recipe_id,
        user_id,
        question_text,
        is_active
      )
      VALUES (?, ?, ?, TRUE)
    `,
    [
      recipeId,
      userId,
      questionText,
    ]
  );

  return result.insertId;
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
Returns a question only when it belongs
to the specified authenticated user.
*/
const findQuestionByIdAndUserId = async (
  questionId,
  userId
) => {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        recipe_id,
        user_id,
        question_text,
        is_active
      FROM questions
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `,
    [questionId, userId]
  );

  return rows[0] || null;
};

/*
Returns and locks a question before deletion.

The question is returned only when it belongs
to the authenticated user.
*/
const findQuestionForDelete = async (
  connection,
  questionId,
  userId
) => {
  const [rows] = await connection.execute(
    `
      SELECT
        id,
        recipe_id,
        user_id,
        is_active
      FROM questions
      WHERE id = ?
        AND user_id = ?
      FOR UPDATE
    `,
    [questionId, userId]
  );

  return rows[0] || null;
};

/*
Updates only an active question owned by the current user.
*/
const updateQuestion = async (
  questionId,
  userId,
  questionText
) => {
  const [result] = await pool.execute(
    `
      UPDATE questions
      SET
        question_text = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND user_id = ?
        AND is_active = TRUE
    `,
    [
      questionText,
      questionId,
      userId,
    ]
  );

  return result.affectedRows;
};

/*
Soft-deletes all active answers connected to a question.

The answer records remain in the database
but are no longer displayed.
*/
const deactivateAnswersByQuestionId = async (
  connection,
  questionId
) => {
  const [result] = await connection.execute(
    `
      UPDATE answers
      SET
        is_active = FALSE,
        updated_at = CURRENT_TIMESTAMP
      WHERE question_id = ?
        AND is_active = TRUE
    `,
    [questionId]
  );

  return result.affectedRows;
};

/*
Soft-deletes an active question owned by the current user.
*/
const deactivateQuestion = async (
  connection,
  questionId,
  userId
) => {
  const [result] = await connection.execute(
    `
      UPDATE questions
      SET
        is_active = FALSE,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND user_id = ?
        AND is_active = TRUE
    `,
    [questionId, userId]
  );

  return result.affectedRows;
};

/*
Returns and locks a question while an answer
is being created.

The recipe chef ID is included so the service can verify
that only the owner of the recipe may answer.
*/
const findQuestionForAnswer = async (
  connection,
  questionId
) => {
  const [rows] = await connection.execute(
    `
      SELECT
        q.id,
        q.recipe_id,
        q.user_id,
        q.question_text,
        q.is_active,

        r.chef_id,
        r.title AS recipe_title,
        r.is_active AS recipe_is_active

      FROM questions q

      INNER JOIN recipes r
        ON r.id = q.recipe_id

      WHERE q.id = ?

      FOR UPDATE
    `,
    [questionId]
  );

  return rows[0] || null;
};

/*
Checks whether the question already has an active answer.
*/
const findActiveAnswerByQuestionId = async (
  connection,
  questionId
) => {
  const [rows] = await connection.execute(
    `
      SELECT
        id
      FROM answers
      WHERE question_id = ?
        AND is_active = TRUE
      LIMIT 1
    `,
    [questionId]
  );

  return rows[0] || null;
};

/*
Creates an answer inside the current transaction.
*/
const createAnswer = async (
  connection,
  {
    questionId,
    chefId,
    answerText,
  }
) => {
  const [result] = await connection.execute(
    `
      INSERT INTO answers (
        question_id,
        chef_id,
        answer_text,
        is_active
      )
      VALUES (?, ?, ?, TRUE)
    `,
    [
      questionId,
      chefId,
      answerText,
    ]
  );

  return result.insertId;
};

/*
Returns an answer only when it belongs
to the specified chef.
*/
const findAnswerByIdAndChefId = async (
  answerId,
  chefId
) => {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        question_id,
        chef_id,
        answer_text,
        is_active
      FROM answers
      WHERE id = ?
        AND chef_id = ?
      LIMIT 1
    `,
    [answerId, chefId]
  );

  return rows[0] || null;
};

/*
Updates only an active answer owned by the chef.
*/
const updateAnswer = async (
  answerId,
  chefId,
  answerText
) => {
  const [result] = await pool.execute(
    `
      UPDATE answers
      SET
        answer_text = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND chef_id = ?
        AND is_active = TRUE
    `,
    [
      answerText,
      answerId,
      chefId,
    ]
  );

  return result.affectedRows;
};

module.exports = {
  findActiveRecipeById,
  findAllByRecipeId,
  createQuestion,
  createNotification,
  findQuestionByIdAndUserId,
  findQuestionForDelete,
  updateQuestion,
  deactivateAnswersByQuestionId,
  deactivateQuestion,
  findQuestionForAnswer,
  findActiveAnswerByQuestionId,
  createAnswer,
  findAnswerByIdAndChefId,
  updateAnswer,
};