const { pool } = require("../config/db");

/*
Returns the authenticated user's profile.

Chef-specific fields are included only when a matching
chef profile exists.
*/
const findByUserId = async (userId) => {
  const [rows] = await pool.execute(
    `
      SELECT
        u.id,
        u.full_name,
        u.username,
        u.email,
        u.role,
        u.profile_image_url,

        cp.display_name,
        cp.bio,
        cp.experience,
        cp.specialties

      FROM users u

      LEFT JOIN chef_profiles cp
        ON cp.user_id = u.id

      WHERE u.id = ?
      LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
};

/*
Returns profile data and locks the user row
inside the current transaction.

The Cloudinary public ID is internal information
used only for replacing or deleting the image.
*/
const findByUserIdForUpdate = async (
  connection,
  userId
) => {
  const [rows] = await connection.execute(
    `
      SELECT
        id,
        full_name,
        username,
        email,
        role,
        profile_image_url,
        profile_image_public_id
      FROM users
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
    `,
    [userId]
  );

  return rows[0] || null;
};

/*
Checks whether another user already owns
the supplied username.
*/
const findOtherUserByUsername = async (
  username,
  currentUserId
) => {
  const [rows] = await pool.execute(
    `
      SELECT id
      FROM users
      WHERE username = ?
        AND id <> ?
      LIMIT 1
    `,
    [username, currentUserId]
  );

  return rows[0] || null;
};

/*
Updates the user's basic profile information
inside the current transaction.
*/
const updateUserProfile = async (
  connection,
  userId,
  {
    fullName,
    username,
    profileImageUrl,
    profileImagePublicId,
  }
) => {
  const [result] = await connection.execute(
    `
      UPDATE users
      SET
        full_name = ?,
        username = ?,
        profile_image_url = ?,
        profile_image_public_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      fullName,
      username,
      profileImageUrl,
      profileImagePublicId,
      userId,
    ]
  );

  return result.affectedRows;
};

/*
Returns the chef profile belonging to the user.
*/
const findChefProfileByUserId = async (
  userId
) => {
  const [rows] = await pool.execute(
    `
      SELECT
        user_id,
        display_name,
        bio,
        experience,
        specialties
      FROM chef_profiles
      WHERE user_id = ?
      LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
};

/*
Updates an existing chef profile.

A chef profile is normally created when the administrator
approves a chef request.
*/
const updateChefProfile = async (
  userId,
  {
    displayName,
    bio,
    experience,
    specialties,
  }
) => {
  const [result] = await pool.execute(
    `
      UPDATE chef_profiles
      SET
        display_name = ?,
        bio = ?,
        experience = ?,
        specialties = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `,
    [
      displayName,
      bio,
      experience,
      specialties,
      userId,
    ]
  );

  return result.affectedRows;
};

module.exports = {
  findByUserId,
  findByUserIdForUpdate,
  findOtherUserByUsername,
  updateUserProfile,
  findChefProfileByUserId,
  updateChefProfile,
};