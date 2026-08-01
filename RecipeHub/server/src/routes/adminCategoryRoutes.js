const express = require("express");

const categoryController =
  require("../controllers/categoryController");

const authenticateToken =
  require("../middleware/authenticateToken");

const authorizeRoles =
  require("../middleware/authorizeRoles");

const router = express.Router();

/*
Every route in this router requires:
1. A valid JWT.
2. An active account.
3. The administrator role.
*/
router.use(
  authenticateToken,
  authorizeRoles("admin")
);

router.get(
  "/",
  categoryController.getAllCategories
);

router.post(
  "/",
  categoryController.createCategory
);

router.put(
  "/:categoryId",
  categoryController.updateCategory
);

router.patch(
  "/:categoryId/deactivate",
  categoryController.deactivateCategory
);

router.patch(
  "/:categoryId/activate",
  categoryController.activateCategory
);

module.exports = router;