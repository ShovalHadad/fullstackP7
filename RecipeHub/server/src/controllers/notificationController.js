const notificationService =
  require("../services/notificationService");

/*
Returns a paginated notification list
for the authenticated user.
*/
const getNotifications = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await notificationService
        .getNotifications(
          req.user.userId,
          req.query
        );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/*
Returns only the unread notification count.
*/
const getUnreadCount = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await notificationService
        .getUnreadCount(
          req.user.userId
        );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/*
Marks one notification owned by the current user as read.
*/
const markNotificationAsRead = async (
  req,
  res,
  next
) => {
  try {
    const notification =
      await notificationService
        .markNotificationAsRead(
          Number(
            req.params.notificationId
          ),
          req.user.userId
        );

    res.status(200).json({
      success: true,
      message:
        "Notification marked as read",
      data: {
        notification,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
Marks all unread notifications
belonging to the current user as read.
*/
const markAllNotificationsAsRead = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await notificationService
        .markAllNotificationsAsRead(
          req.user.userId
        );

    res.status(200).json({
      success: true,
      message:
        "All notifications marked as read",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};