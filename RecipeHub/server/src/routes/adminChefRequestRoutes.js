const express = require("express");

const chefRequestController =
  require("../controllers/chefRequestController");

const authenticateToken =
  require("../middleware/authenticateToken");

const authorizeRoles =
  require("../middleware/authorizeRoles");

const router = express.Router();

/*
Every route in this router requires:
1. Authentication.
2. An active account.
3. The administrator role.
*/
router.use(
  authenticateToken,
  authorizeRoles("admin")
);

router.get(
  "/",
  chefRequestController.getAllRequests
);

router.patch(
  "/:requestId/approve",
  chefRequestController.approveRequest
);

router.patch(
  "/:requestId/reject",
  chefRequestController.rejectRequest
);

module.exports = router;