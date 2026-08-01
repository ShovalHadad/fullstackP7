const { pool } = require("../config/db");

/*
Finds a user by email address.

This function is used during login and registration checks.
It returns authentication-related fields because the service
needs the password hash, role and blocked status.
*/
const findByEmail = async (email) => {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        full_name,
        username,
        email,
        password_hash,
        role,
        profile_image_url,
        is_blocked
      FROM users
      WHERE email = ?
      LIMIT 1
    `,
    [email]
  );

  return rows[0] || null;
};

/*
Finds a user by username.

Only the user ID is required when checking whether
a username is already in use.
*/
const findByUsername = async (username) => {
  const [rows] = await pool.execute(
    `
      SELECT
        id
      FROM users
      WHERE username = ?
      LIMIT 1
    `,
    [username]
  );

  return rows[0] || null;
};

/*
Returns the minimum user data required for authentication
and authorization checks.

This function is called on every protected request.
*/
const findAuthDataById = async (id) => {
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
    [id]
  );

  return rows[0] || null;
};

/*
Returns only the user information required by the client.

Internal fields such as password_hash and is_blocked
are not returned to React.
*/
const findPublicById = async (id) => {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        full_name,
        username,
        email,
        role,
        profile_image_url
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
};

/*
Creates a new regular user.

The role is determined by the server and is always "user".
The client cannot choose a role during registration.
*/
const create = async ({
  fullName,
  username,
  email,
  passwordHash,
}) => {
  const [result] = await pool.execute(
    `
      INSERT INTO users (
        full_name,
        username,
        email,
        password_hash,
        role
      )
      VALUES (?, ?, ?, ?, 'user')
    `,
    [fullName, username, email, passwordHash]
  );

  /*
  Returns only the public fields needed by the client.
  */
  return {
    id: result.insertId,
    full_name: fullName,
    username,
    email,
    role: "user",
    profile_image_url: null,
  };
};

module.exports = {
  findByEmail,
  findByUsername,
  findAuthDataById,
  findPublicById,
  create,
};