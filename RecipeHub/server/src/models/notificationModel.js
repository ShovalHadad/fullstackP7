const { pool } = require("../config/db");

/*
Builds the shared WHERE section for notification queries.

Every query is restricted to the authenticated user's ID.
*/
const buildNotificationFilters = ({
  userId,
  unreadOnly,
}) => {
  const conditions = [
    "user_id = ?",
  ];

  const parameters = [userId];

  if (unreadOnly) {
    conditions.push("is_read = FALSE");
  }

  return {
    whereClause:
      `WHERE ${conditions.join(" AND ")}`,
    parameters,
  };
};

/*
Returns a paginated notification list for one user.

Only fields required by the notification screen are selected.
*/
const findAllByUserId = async ({
  userId,
  unreadOnly,
  limit,
  offset,
}) => {
  const {
    whereClause,
    parameters,
  } = buildNotificationFilters({
    userId,
    unreadOnly,
  });

  /*
  limit and offset were validated in the service.

  They are inserted directly because some MySQL configurations
  do not support placeholders for LIMIT and OFFSET.
  */
  const safeLimit = Number(limit);
  const safeOffset = Number(offset);

  const [rows] = await pool.execute(
    `
      SELECT
        id,
        type,
        title,
        message,
        related_entity_type,
        related_entity_id,
        is_read,
        created_at
      FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${safeLimit}
      OFFSET ${safeOffset}
    `,
    parameters
  );

  return rows;
};

/*
Counts notifications matching the selected filter.

This count is used only for pagination.
*/
const countByUserId = async ({
  userId,
  unreadOnly,
}) => {
  const {
    whereClause,
    parameters,
  } = buildNotificationFilters({
    userId,
    unreadOnly,
  });

  const [rows] = await pool.execute(
    `
      SELECT
        COUNT(*) AS total_items
      FROM notifications
      ${whereClause}
    `,
    parameters
  );

  return Number(
    rows[0]?.total_items || 0
  );
};

/*
Returns only the unread notification count
for the authenticated user.
*/
const countUnreadByUserId = async (
  userId
) => {
  const [rows] = await pool.execute(
    `
      SELECT
        COUNT(*) AS unread_count
      FROM notifications
      WHERE user_id = ?
        AND is_read = FALSE
    `,
    [userId]
  );

  return Number(
    rows[0]?.unread_count || 0
  );
};

/*
Marks one notification as read only when it belongs
to the authenticated user.

The is_read check avoids performing an unnecessary update
when the notification is already read.
*/
const markAsRead = async (
  notificationId,
  userId
) => {
  const [result] = await pool.execute(
    `
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = ?
        AND user_id = ?
        AND is_read = FALSE
    `,
    [
      notificationId,
      userId,
    ]
  );

  return result.affectedRows;
};

/*
Checks whether a notification belongs to the authenticated user.

Only the minimum required fields are selected.
*/
const findByIdAndUserId = async (
  notificationId,
  userId
) => {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        is_read
      FROM notifications
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `,
    [
      notificationId,
      userId,
    ]
  );

  return rows[0] || null;
};

/*
Marks all unread notifications belonging to one user as read.
*/
const markAllAsRead = async (
  userId
) => {
  const [result] = await pool.execute(
    `
      UPDATE notifications
      SET is_read = TRUE
      WHERE user_id = ?
        AND is_read = FALSE
    `,
    [userId]
  );

  return result.affectedRows;
};

module.exports = {
  findAllByUserId,
  countByUserId,
  countUnreadByUserId,
  markAsRead,
  findByIdAndUserId,
  markAllAsRead,
};