const express = require("express");

const categoryController =
  require("../controllers/categoryController");

const authenticateToken =
  require("../middleware/authenticateToken");

const router = express.Router();

/*
Returns active categories only to authenticated users.
*/
router.get(
  "/",
  authenticateToken,
  categoryController.getActiveCategories
);

module.exports = router;