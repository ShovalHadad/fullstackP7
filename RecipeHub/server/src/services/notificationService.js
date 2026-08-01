const notificationModel =
  require("../models/notificationModel");

const AppError =
  require("./appError");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/*
Validates a notification ID received from a route parameter.
*/
const validateNotificationId = (
  notificationId
) => {
  if (
    !Number.isInteger(notificationId) ||
    notificationId <= 0
  ) {
    throw new AppError(
      "Notification ID is not valid",
      400
    );
  }
};

/*
Converts common query-string boolean values.

Supported true values:
true
1

Supported false values:
false
0
empty or missing
*/
const parseBooleanQuery = (
  value,
  fieldName
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return false;
  }

  if (
    value === true ||
    value === "true" ||
    value === "1"
  ) {
    return true;
  }

  if (
    value === false ||
    value === "false" ||
    value === "0"
  ) {
    return false;
  }

  throw new AppError(
    `${fieldName} must be true or false`,
    400
  );
};

/*
Validates notification-list query parameters.
*/
const validateListQuery = (query) => {
  const page =
    query.page === undefined
      ? DEFAULT_PAGE
      : Number(query.page);

  if (
    !Number.isInteger(page) ||
    page <= 0
  ) {
    throw new AppError(
      "Page must be a positive integer",
      400
    );
  }

  const limit =
    query.limit === undefined
      ? DEFAULT_LIMIT
      : Number(query.limit);

  if (
    !Number.isInteger(limit) ||
    limit <= 0 ||
    limit > MAX_LIMIT
  ) {
    throw new AppError(
      `Limit must be between 1 and ${MAX_LIMIT}`,
      400
    );
  }

  const unreadOnly =
    parseBooleanQuery(
      query.unreadOnly,
      "unreadOnly"
    );

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    unreadOnly,
  };
};

/*
Returns a paginated notification list
for the authenticated user.

The list and pagination count queries run in parallel.
*/
const getNotifications = async (
  userId,
  query
) => {
  const options =
    validateListQuery(query);

  const [notifications, totalItems] =
    await Promise.all([
      notificationModel
        .findAllByUserId({
          userId,
          ...options,
        }),

      notificationModel
        .countByUserId({
          userId,
          unreadOnly:
            options.unreadOnly,
        }),
    ]);

  const totalPages =
    totalItems === 0
      ? 0
      : Math.ceil(
          totalItems / options.limit
        );

  return {
    items: notifications.map(
      (notification) => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message:
          notification.message,

        related_entity:
          notification
            .related_entity_type
            ? {
                type:
                  notification
                    .related_entity_type,

                id:
                  notification
                    .related_entity_id,
              }
            : null,

        is_read:
          Boolean(
            notification.is_read
          ),

        created_at:
          notification.created_at,
      })
    ),

    pagination: {
      page: options.page,
      limit: options.limit,
      total_items: totalItems,
      total_pages: totalPages,
    },
  };
};

/*
Returns only the unread notification count.

This endpoint is intended for the notification badge,
so it does not return the notification list.
*/
const getUnreadCount = async (
  userId
) => {
  const unreadCount =
    await notificationModel
      .countUnreadByUserId(
        userId
      );

  return {
    unread_count: unreadCount,
  };
};

/*
Marks one notification as read.

When it is already read, no UPDATE is required.
*/
const markNotificationAsRead = async (
  notificationId,
  userId
) => {
  validateNotificationId(
    notificationId
  );

  /*
  First attempt the minimal UPDATE.

  If one row changes, no SELECT is required.
  */
  const affectedRows =
    await notificationModel.markAsRead(
      notificationId,
      userId
    );

  if (affectedRows === 1) {
    return {
      id: notificationId,
      is_read: true,
      changed: true,
    };
  }

  /*
  affectedRows can also be zero when the notification
  already belongs to the user but is already read.

  A small ownership check distinguishes that case
  from a missing or unauthorized notification.
  */
  const notification =
    await notificationModel
      .findByIdAndUserId(
        notificationId,
        userId
      );

  if (!notification) {
    throw new AppError(
      "Notification not found",
      404
    );
  }

  return {
    id: notificationId,
    is_read: true,
    changed: false,
  };
};

/*
Marks all unread notifications belonging
to the authenticated user as read.
*/
const markAllNotificationsAsRead = async (
  userId
) => {
  const updatedCount =
    await notificationModel
      .markAllAsRead(
        userId
      );

  return {
    updated_count: updatedCount,
  };
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};