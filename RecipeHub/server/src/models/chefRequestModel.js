const { pool } = require("../config/db");

/*
Finds only the information required to determine
whether a user already has a pending request.
*/
const findPendingByUserId = async (
  userId
) => {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        status
      FROM chef_requests
      WHERE user_id = ?
        AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
};

/*
Returns the latest request for the current user.

Only the fields required by the user's request-status page
are returned.
*/
const findLatestByUserId = async (
  userId
) => {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        display_name,
        bio,
        experience,
        specialties,
        status,
        rejection_reason,
        reviewed_at,
        created_at
      FROM chef_requests
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
};

/*
Creates a chef request and returns the already-known values
without executing an additional SELECT query.
*/
const create = async ({
  userId,
  displayName,
  bio,
  experience,
  specialties,
}) => {
  const [result] = await pool.execute(
    `
      INSERT INTO chef_requests (
        user_id,
        display_name,
        bio,
        experience,
        specialties,
        status
      )
      VALUES (?, ?, ?, ?, ?, 'pending')
    `,
    [
      userId,
      displayName,
      bio,
      experience,
      specialties,
    ]
  );

  return {
    id: result.insertId,
    display_name: displayName,
    bio,
    experience,
    specialties,
    status: "pending",
  };
};

/*
Returns a chef request with the user details required
by the administrator.

Sensitive and unnecessary fields are not selected.
*/
const findById = async (
  requestId
) => {
  const [rows] = await pool.execute(
    `
      SELECT
        cr.id,
        cr.user_id,
        cr.display_name,
        cr.bio,
        cr.experience,
        cr.specialties,
        cr.status,
        cr.rejection_reason,
        cr.reviewed_by,
        cr.reviewed_at,
        cr.created_at,

        u.full_name,
        u.username,
        u.email,
        u.role,
        u.is_blocked
      FROM chef_requests cr
      INNER JOIN users u
        ON u.id = cr.user_id
      WHERE cr.id = ?
      LIMIT 1
    `,
    [requestId]
  );

  return rows[0] || null;
};

/*
Returns chef requests for the administrator.

The optional status filter reduces the returned result set
when the administrator needs only pending, approved or rejected
requests.
*/
const findAll = async (
  status = null
) => {
  let query = `
    SELECT
      cr.id,
      cr.user_id,
      cr.display_name,
      cr.bio,
      cr.experience,
      cr.specialties,
      cr.status,
      cr.rejection_reason,
      cr.reviewed_at,
      cr.created_at,

      u.full_name,
      u.username,
      u.email,
      u.role,
      u.is_blocked
    FROM chef_requests cr
    INNER JOIN users u
      ON u.id = cr.user_id
  `;

  const parameters = [];

  if (status) {
    query +=
      " WHERE cr.status = ?";
    parameters.push(status);
  }

  query +=
    " ORDER BY cr.created_at DESC";

  const [rows] =
    await pool.execute(
      query,
      parameters
    );

  return rows;
};

module.exports = {
  findPendingByUserId,
  findLatestByUserId,
  create,
  findById,
  findAll,
};