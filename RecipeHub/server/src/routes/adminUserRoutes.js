const express =
  require("express");

const adminUserController =
  require("../controllers/adminUserController");

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

/*
Returns the user-management list.

Supported query parameters:
- page
- limit
- search
- role
- isBlocked
*/
router.get(
  "/",
  adminUserController.getUsers
);

/*
Blocks one user or chef account.
*/
router.patch(
  "/:userId/block",
  adminUserController.blockUser
);

/*
Unblocks one user or chef account.
*/
router.patch(
  "/:userId/unblock",
  adminUserController.unblockUser
);

module.exports = router;