const questionService =
  require("../services/questionService");

/*
Returns active questions and answers
for one active recipe.
*/
const getRecipeQuestions = async (
  req,
  res,
  next
) => {
  try {
    const questions =
      await questionService
        .getRecipeQuestions(
          Number(
            req.params.recipeId
          )
        );

    res.status(200).json({
      success: true,
      data: {
        questions,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
Creates a question on an active recipe.
*/
const createQuestion = async (
  req,
  res,
  next
) => {
  try {
    const question =
      await questionService
        .createQuestion(
          Number(
            req.params.recipeId
          ),
          req.user.userId,
          req.body
        );

    res.status(201).json({
      success: true,
      message:
        "Question created successfully",
      data: {
        question,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
Updates a question owned by the current user.
*/
const updateQuestion = async (
  req,
  res,
  next
) => {
  try {
    const question =
      await questionService
        .updateQuestion(
          Number(
            req.params.questionId
          ),
          req.user.userId,
          req.body
        );

    res.status(200).json({
      success: true,
      message:
        "Question updated successfully",
      data: {
        question,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
Soft-deletes a question owned by the current user.
*/
const deleteQuestion = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await questionService
        .deleteQuestion(
          Number(
            req.params.questionId
          ),
          req.user.userId
        );

    res.status(200).json({
      success: true,
      message:
        "Question deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/*
Creates an answer by the recipe owner chef.
*/
const createAnswer = async (
  req,
  res,
  next
) => {
  try {
    const answer =
      await questionService
        .createAnswer(
          Number(
            req.params.questionId
          ),
          req.user.userId,
          req.body
        );

    res.status(201).json({
      success: true,
      message:
        "Answer created successfully",
      data: {
        answer,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
Updates an answer owned by the authenticated chef.
*/
const updateAnswer = async (
  req,
  res,
  next
) => {
  try {
    const answer =
      await questionService
        .updateAnswer(
          Number(
            req.params.answerId
          ),
          req.user.userId,
          req.body
        );

    res.status(200).json({
      success: true,
      message:
        "Answer updated successfully",
      data: {
        answer,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecipeQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  createAnswer,
  updateAnswer,
};