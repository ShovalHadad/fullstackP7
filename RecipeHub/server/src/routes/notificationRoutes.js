const express =
  require("express");

const notificationController =
  require("../controllers/notificationController");

const authenticateToken =
  require("../middleware/authenticateToken");

const router = express.Router();

/*
Every notification route requires authentication.

All model queries also include the authenticated user's ID,
so users can access only their own notifications.
*/
router.use(authenticateToken);

/*
Returns the unread notification count.

This route must appear before /:notificationId/read
so Express does not interpret "unread-count"
as an ID.
*/
router.get(
  "/unread-count",
  notificationController.getUnreadCount
);

/*
Returns the authenticated user's notifications.

Supported query parameters:
- page
- limit
- unreadOnly
*/
router.get(
  "/",
  notificationController.getNotifications
);

/*
Marks all notifications as read.

This route must appear before /:notificationId/read
so Express does not interpret "read-all" as an ID.
*/
router.patch(
  "/read-all",
  notificationController
    .markAllNotificationsAsRead
);

/*
Marks one notification as read.
*/
router.patch(
  "/:notificationId/read",
  notificationController
    .markNotificationAsRead
);

module.exports = router;