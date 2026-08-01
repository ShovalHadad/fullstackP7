const express =
  require("express");

const questionController =
  require("../controllers/questionController");

const authenticateToken =
  require("../middleware/authenticateToken");

const authorizeRoles =
  require("../middleware/authorizeRoles");

const router = express.Router();

/*
Every question and answer route requires authentication.
*/
router.use(authenticateToken);

/*
Returns active questions and their answers
for an active recipe.
*/
router.get(
  "/recipes/:recipeId/questions",
  questionController.getRecipeQuestions
);

/*
Every authenticated user may ask a question.
*/
router.post(
  "/recipes/:recipeId/questions",
  questionController.createQuestion
);

/*
Only the authenticated owner of the question
may update it.

Ownership is checked in the service and SQL query.
*/
router.put(
  "/questions/:questionId",
  questionController.updateQuestion
);

/*
Only the authenticated owner of the question
may soft-delete it.
*/
router.delete(
  "/questions/:questionId",
  questionController.deleteQuestion
);

/*
Only a chef may reach the answer service.

The service additionally verifies that the chef
owns the recipe connected to the question.
*/
router.post(
  "/questions/:questionId/answer",
  authorizeRoles("chef"),
  questionController.createAnswer
);

/*
Only a chef may update an answer.

The service verifies that the answer belongs
to the authenticated chef.
*/
router.put(
  "/answers/:answerId",
  authorizeRoles("chef"),
  questionController.updateAnswer
);

module.exports = router;