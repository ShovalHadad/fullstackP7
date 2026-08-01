const { pool } = require("../config/db");

const questionModel =
  require("../models/questionModel");

const AppError =
  require("./appError");

const MAX_QUESTION_LENGTH = 1000;
const MAX_ANSWER_LENGTH = 2000;

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
Validates and normalizes question text.
*/
const validateQuestionText = (
  questionText
) => {
  if (
    typeof questionText !== "string" ||
    !questionText.trim()
  ) {
    throw new AppError(
      "Question text is required",
      400
    );
  }

  const normalizedText =
    questionText.trim();

  if (normalizedText.length < 3) {
    throw new AppError(
      "Question must contain at least 3 characters",
      400
    );
  }

  if (
    normalizedText.length >
    MAX_QUESTION_LENGTH
  ) {
    throw new AppError(
      `Question cannot exceed ${MAX_QUESTION_LENGTH} characters`,
      400
    );
  }

  return normalizedText;
};

/*
Validates and normalizes answer text.
*/
const validateAnswerText = (
  answerText
) => {
  if (
    typeof answerText !== "string" ||
    !answerText.trim()
  ) {
    throw new AppError(
      "Answer text is required",
      400
    );
  }

  const normalizedText =
    answerText.trim();

  if (normalizedText.length < 2) {
    throw new AppError(
      "Answer must contain at least 2 characters",
      400
    );
  }

  if (
    normalizedText.length >
    MAX_ANSWER_LENGTH
  ) {
    throw new AppError(
      `Answer cannot exceed ${MAX_ANSWER_LENGTH} characters`,
      400
    );
  }

  return normalizedText;
};

/*
Returns active questions and answers for an active recipe.
*/
const getRecipeQuestions = async (
  recipeId
) => {
  validateId(
    recipeId,
    "Recipe ID"
  );

  const recipe =
    await questionModel
      .findActiveRecipeById(
        recipeId
      );

  if (!recipe) {
    throw new AppError(
      "Recipe not found",
      404
    );
  }

  const rows =
    await questionModel
      .findAllByRecipeId(
        recipeId
      );

  return rows.map((row) => ({
    id: row.id,
    question_text:
      row.question_text,
    created_at:
      row.created_at,

    user: {
      id: row.user_id,
      username:
        row.question_username,
      profile_image_url:
        row.question_user_image_url,
    },

    answer: row.answer_id
      ? {
          id: row.answer_id,
          answer_text:
            row.answer_text,
          created_at:
            row.answer_created_at,

          chef: {
            id:
              row.answer_chef_id,
            name:
              row.answer_chef_name,
            profile_image_url:
              row.answer_chef_image_url,
          },
        }
      : null,
  }));
};

/*
Creates a question on an active recipe.

The question and notification are saved
inside one transaction.
*/
const createQuestion = async (
  recipeId,
  userId,
  data
) => {
  validateId(
    recipeId,
    "Recipe ID"
  );

  const questionText =
    validateQuestionText(
      data.questionText
    );

  const recipe =
    await questionModel
      .findActiveRecipeById(
        recipeId
      );

  if (!recipe) {
    throw new AppError(
      "Recipe not found",
      404
    );
  }

  const connection =
    await pool.getConnection();

  try {
    await connection.beginTransaction();

    const questionId =
      await questionModel
        .createQuestion(
          connection,
          {
            recipeId,
            userId,
            questionText,
          }
        );

    /*
    A chef who asks on their own recipe does not need
    a notification about their own action.
    */
    if (
      Number(recipe.chef_id) !==
      Number(userId)
    ) {
      await questionModel
        .createNotification(
          connection,
          {
            userId:
              recipe.chef_id,

            type: "new_question",

            title:
              "New question on your recipe",

            message:
              `A new question was posted on "${recipe.title}"`,

            relatedEntityType:
              "question",

            relatedEntityId:
              questionId,
          }
        );
    }

    await connection.commit();

    return {
      id: questionId,
      recipe_id: recipeId,
      question_text:
        questionText,
      user_id: userId,
      answer: null,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/*
Updates a question owned by the authenticated user.
*/
const updateQuestion = async (
  questionId,
  userId,
  data
) => {
  validateId(
    questionId,
    "Question ID"
  );

  const questionText =
    validateQuestionText(
      data.questionText
    );

  const question =
    await questionModel
      .findQuestionByIdAndUserId(
        questionId,
        userId
      );

  if (
    !question ||
    !question.is_active
  ) {
    throw new AppError(
      "Question not found",
      404
    );
  }

  if (
    question.question_text ===
    questionText
  ) {
    return {
      id: questionId,
      question_text:
        questionText,
    };
  }

  const affectedRows =
    await questionModel
      .updateQuestion(
        questionId,
        userId,
        questionText
      );

  if (affectedRows !== 1) {
    throw new AppError(
      "Question could not be updated",
      409
    );
  }

  return {
    id: questionId,
    question_text:
      questionText,
  };
};

/*
Soft-deletes a question and all answers connected to it.

Both operations run inside one transaction:
1. Active answers are deactivated.
2. The question is deactivated.
*/
const deleteQuestion = async (
  questionId,
  userId
) => {
  validateId(
    questionId,
    "Question ID"
  );

  const connection =
    await pool.getConnection();

  try {
    await connection.beginTransaction();

    const question =
      await questionModel
        .findQuestionForDelete(
          connection,
          questionId,
          userId
        );

    if (
      !question ||
      !question.is_active
    ) {
      throw new AppError(
        "Question not found",
        404
      );
    }

    const deletedAnswerCount =
      await questionModel
        .deactivateAnswersByQuestionId(
          connection,
          questionId
        );

    const affectedRows =
      await questionModel
        .deactivateQuestion(
          connection,
          questionId,
          userId
        );

    if (affectedRows !== 1) {
      throw new AppError(
        "Question could not be deleted",
        409
      );
    }

    await connection.commit();

    return {
      id: questionId,
      is_active: 0,
      deleted_answer_count:
        deletedAnswerCount,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/*
Creates an answer.

Only the chef who owns the recipe may answer.
The answer and user notification are saved together.
*/
const createAnswer = async (
  questionId,
  chefId,
  data
) => {
  validateId(
    questionId,
    "Question ID"
  );

  const answerText =
    validateAnswerText(
      data.answerText
    );

  const connection =
    await pool.getConnection();

  try {
    await connection.beginTransaction();

    const question =
      await questionModel
        .findQuestionForAnswer(
          connection,
          questionId
        );

    if (
      !question ||
      !question.is_active ||
      !question.recipe_is_active
    ) {
      throw new AppError(
        "Question not found",
        404
      );
    }

    if (
      Number(question.chef_id) !==
      Number(chefId)
    ) {
      throw new AppError(
        "Only the chef who created the recipe can answer this question",
        403
      );
    }

    const existingAnswer =
      await questionModel
        .findActiveAnswerByQuestionId(
          connection,
          questionId
        );

    if (existingAnswer) {
      throw new AppError(
        "This question already has an answer",
        409
      );
    }

    const answerId =
      await questionModel
        .createAnswer(
          connection,
          {
            questionId,
            chefId,
            answerText,
          }
        );

    if (
      Number(question.user_id) !==
      Number(chefId)
    ) {
      await questionModel
        .createNotification(
          connection,
          {
            userId:
              question.user_id,

            type: "new_answer",

            title:
              "Your question was answered",

            message:
              `The chef answered your question on "${question.recipe_title}"`,

            relatedEntityType:
              "answer",

            relatedEntityId:
              answerId,
          }
        );
    }

    await connection.commit();

    return {
      id: answerId,
      question_id: questionId,
      chef_id: chefId,
      answer_text:
        answerText,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/*
Updates an answer owned by the authenticated chef.
*/
const updateAnswer = async (
  answerId,
  chefId,
  data
) => {
  validateId(
    answerId,
    "Answer ID"
  );

  const answerText =
    validateAnswerText(
      data.answerText
    );

  const answer =
    await questionModel
      .findAnswerByIdAndChefId(
        answerId,
        chefId
      );

  if (
    !answer ||
    !answer.is_active
  ) {
    throw new AppError(
      "Answer not found",
      404
    );
  }

  if (
    answer.answer_text ===
    answerText
  ) {
    return {
      id: answerId,
      answer_text:
        answerText,
    };
  }

  const affectedRows =
    await questionModel
      .updateAnswer(
        answerId,
        chefId,
        answerText
      );

  if (affectedRows !== 1) {
    throw new AppError(
      "Answer could not be updated",
      409
    );
  }

  return {
    id: answerId,
    answer_text:
      answerText,
  };
};

module.exports = {
  getRecipeQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  createAnswer,
  updateAnswer,
};