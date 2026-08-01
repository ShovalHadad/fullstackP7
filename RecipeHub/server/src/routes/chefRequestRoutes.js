const express = require("express");

const chefRequestController =
  require("../controllers/chefRequestController");

const authenticateToken =
  require("../middleware/authenticateToken");

const authorizeRoles =
  require("../middleware/authorizeRoles");

const router = express.Router();

/*
Every route in this router requires
an authenticated and active user.
*/
router.use(authenticateToken);

/*
Only a regular user can submit a request
to become a chef.
*/
router.post(
  "/",
  authorizeRoles("user"),
  chefRequestController.submitRequest
);

/*
Only a regular user can view their latest chef request.

A chef cannot submit another request because the account
has already received the chef role.
*/
router.get(
  "/me",
  authorizeRoles("user"),
  chefRequestController.getMyRequest
);

module.exports = router;