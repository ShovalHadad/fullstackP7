const { pool } = require("../config/db");

/*
Builds filters for the administrator user list.

All dynamic values are passed as prepared-statement parameters.
*/
const buildUserFilters = ({
  search,
  role,
  isBlocked,
}) => {
  const conditions = [];
  const parameters = [];

  if (search) {
    conditions.push(
      `
        (
          full_name LIKE ?
          OR username LIKE ?
          OR email LIKE ?
        )
      `
    );

    const searchPattern = `%${search}%`;

    parameters.push(
      searchPattern,
      searchPattern,
      searchPattern
    );
  }

  if (role) {
    conditions.push("role = ?");
    parameters.push(role);
  }

  if (isBlocked !== null) {
    conditions.push("is_blocked = ?");
    parameters.push(isBlocked);
  }

  return {
    whereClause:
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "",
    parameters,
  };
};

/*
Returns a paginated administrator user list.

Only fields required by the management screen are selected.
Password hashes and other internal data are never returned.
*/
const findAll = async ({
  search,
  role,
  isBlocked,
  limit,
  offset,
}) => {
  const {
    whereClause,
    parameters,
  } = buildUserFilters({
    search,
    role,
    isBlocked,
  });

  /*
  limit and offset were validated in the service.

  They are inserted directly because some MySQL configurations
  do not support placeholders in LIMIT and OFFSET.
  */
  const safeLimit = Number(limit);
  const safeOffset = Number(offset);

  const [rows] = await pool.execute(
    `
      SELECT
        id,
        full_name,
        username,
        email,
        role,
        profile_image_url,
        is_blocked,
        created_at
      FROM users
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
Counts users matching the administrator filters.

The result is used only for pagination.
*/
const countAll = async ({
  search,
  role,
  isBlocked,
}) => {
  const {
    whereClause,
    parameters,
  } = buildUserFilters({
    search,
    role,
    isBlocked,
  });

  const [rows] = await pool.execute(
    `
      SELECT
        COUNT(*) AS total_items
      FROM users
      ${whereClause}
    `,
    parameters
  );

  return Number(
    rows[0]?.total_items || 0
  );
};

/*
Returns only the fields required to validate
whether an account may be blocked or unblocked.
*/
const findManagementDataById = async (
  userId
) => {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        role,
        is_blocked
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
};

/*
Blocks one non-administrator account.

The condition prevents an unnecessary UPDATE
when the account is already blocked.
*/
const block = async (userId) => {
  const [result] = await pool.execute(
    `
      UPDATE users
      SET
        is_blocked = TRUE,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND role <> 'admin'
        AND is_blocked = FALSE
    `,
    [userId]
  );

  return result.affectedRows;
};

/*
Unblocks one non-administrator account.

The condition prevents an unnecessary UPDATE
when the account is already active.
*/
const unblock = async (userId) => {
  const [result] = await pool.execute(
    `
      UPDATE users
      SET
        is_blocked = FALSE,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND role <> 'admin'
        AND is_blocked = TRUE
    `,
    [userId]
  );

  return result.affectedRows;
};

module.exports = {
  findAll,
  countAll,
  findManagementDataById,
  block,
  unblock,
};