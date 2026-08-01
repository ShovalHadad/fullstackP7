const express = require("express");

const authController = require("../controllers/authController");
const authenticateToken = require("../middleware/authenticateToken");

const router = express.Router();

/*
Public authentication routes.
*/
router.post(
  "/register",
  authController.register
);

router.post(
  "/login",
  authController.login
);

/*
Protected route.

Only an authenticated and active user can retrieve
their current account information.
*/
router.get(
  "/me",
  authenticateToken,
  authController.getCurrentUser
);

module.exports = router;