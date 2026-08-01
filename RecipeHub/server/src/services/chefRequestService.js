const { pool } = require("../config/db");

const chefRequestModel =
  require("../models/chefRequestModel");

const userModel =
  require("../models/userModel");

const AppError =
  require("./appError");

/*
Validates and normalizes chef-request data.
*/
const validateRequestData = ({
  displayName,
  bio,
  experience,
  specialties,
}) => {
  if (
    !displayName ||
    !bio ||
    !experience ||
    !specialties
  ) {
    throw new AppError(
      "Display name, bio, experience and specialties are required",
      400
    );
  }

  if (
    typeof displayName !== "string" ||
    typeof bio !== "string" ||
    typeof experience !== "string" ||
    typeof specialties !== "string"
  ) {
    throw new AppError(
      "Chef request fields must contain valid text",
      400
    );
  }

  const normalizedData = {
    displayName:
      displayName.trim(),
    bio: bio.trim(),
    experience:
      experience.trim(),
    specialties:
      specialties.trim(),
  };

  if (
    normalizedData
      .displayName.length < 2
  ) {
    throw new AppError(
      "Display name must contain at least 2 characters",
      400
    );
  }

  if (
    normalizedData.bio.length < 10
  ) {
    throw new AppError(
      "Bio must contain at least 10 characters",
      400
    );
  }

  if (
    normalizedData
      .experience.length < 5
  ) {
    throw new AppError(
      "Experience must contain at least 5 characters",
      400
    );
  }

  if (
    normalizedData
      .specialties.length < 2
  ) {
    throw new AppError(
      "Specialties must contain at least 2 characters",
      400
    );
  }

  return normalizedData;
};

/*
Submits a chef request for a regular user.
*/
const submitRequest = async (
  userId,
  requestData
) => {
  /*
  The protected route already confirms that the user exists,
  is active and currently has the "user" role.

  This additional model lookup is therefore unnecessary.
  */
  const existingPendingRequest =
    await chefRequestModel
      .findPendingByUserId(userId);

  if (existingPendingRequest) {
    throw new AppError(
      "You already have a pending chef request",
      409
    );
  }

  const validatedData =
    validateRequestData(
      requestData
    );

  return chefRequestModel.create({
    userId,
    ...validatedData,
  });
};

/*
Returns the latest chef request of the current user.
*/
const getMyRequest = async (
  userId
) => {
  const request =
    await chefRequestModel
      .findLatestByUserId(userId);

  if (!request) {
    throw new AppError(
      "No chef request was found for this user",
      404
    );
  }

  return request;
};

/*
Returns chef requests for the administrator.
*/
const getAllRequests = async (
  status
) => {
  const allowedStatuses = [
    "pending",
    "approved",
    "rejected",
  ];

  if (
    status &&
    !allowedStatuses.includes(status)
  ) {
    throw new AppError(
      "Chef request status is not valid",
      400
    );
  }

  return chefRequestModel.findAll(
    status || null
  );
};

/*
Approves a pending chef request.

A transaction ensures that all related changes
are committed together.
*/
const approveRequest = async (
  requestId,
  adminUserId
) => {
  if (
    !Number.isInteger(requestId) ||
    requestId <= 0
  ) {
    throw new AppError(
      "Chef request ID is not valid",
      400
    );
  }

  const connection =
    await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [requestRows] =
      await connection.execute(
        `
          SELECT
            id,
            user_id,
            display_name,
            bio,
            experience,
            specialties,
            status
          FROM chef_requests
          WHERE id = ?
          FOR UPDATE
        `,
        [requestId]
      );

    const request =
      requestRows[0];

    if (!request) {
      throw new AppError(
        "Chef request not found",
        404
      );
    }

    if (
      request.status !== "pending"
    ) {
      throw new AppError(
        "Only pending chef requests can be approved",
        409
      );
    }

    const [userRows] =
      await connection.execute(
        `
          SELECT
            id,
            role,
            is_blocked
          FROM users
          WHERE id = ?
          FOR UPDATE
        `,
        [request.user_id]
      );

    const user = userRows[0];

    if (!user) {
      throw new AppError(
        "User not found",
        404
      );
    }

    if (user.is_blocked) {
      throw new AppError(
        "A blocked user cannot become a chef",
        403
      );
    }

    await connection.execute(
      `
        UPDATE chef_requests
        SET
          status = 'approved',
          rejection_reason = NULL,
          reviewed_by = ?,
          reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [adminUserId, requestId]
    );

    await connection.execute(
      `
        UPDATE users
        SET role = 'chef'
        WHERE id = ?
      `,
      [request.user_id]
    );

    await connection.execute(
      `
        INSERT INTO chef_profiles (
          user_id,
          display_name,
          bio,
          experience,
          specialties
        )
        VALUES (?, ?, ?, ?, ?)

        ON DUPLICATE KEY UPDATE
          display_name =
            VALUES(display_name),
          bio = VALUES(bio),
          experience =
            VALUES(experience),
          specialties =
            VALUES(specialties),
          updated_at =
            CURRENT_TIMESTAMP
      `,
      [
        request.user_id,
        request.display_name,
        request.bio,
        request.experience,
        request.specialties,
      ]
    );

    await connection.execute(
      `
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          related_entity_type,
          related_entity_id
        )
        VALUES (
          ?,
          'chef_request_approved',
          'Chef request approved',
          'Your request to become a chef was approved',
          'chef_request',
          ?
        )
      `,
      [
        request.user_id,
        requestId,
      ]
    );

    await connection.commit();

    /*
    Returns only the fields required to update
    the administrator's local list.
    */
    return {
      id: requestId,
      user_id: request.user_id,
      status: "approved",
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/*
Rejects a pending chef request.
*/
const rejectRequest = async (
  requestId,
  adminUserId,
  rejectionReason
) => {
  if (
    !Number.isInteger(requestId) ||
    requestId <= 0
  ) {
    throw new AppError(
      "Chef request ID is not valid",
      400
    );
  }

  if (
    typeof rejectionReason !==
      "string" ||
    rejectionReason.trim().length < 3
  ) {
    throw new AppError(
      "A rejection reason is required",
      400
    );
  }

  const normalizedReason =
    rejectionReason.trim();

  const connection =
    await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [requestRows] =
      await connection.execute(
        `
          SELECT
            id,
            user_id,
            status
          FROM chef_requests
          WHERE id = ?
          FOR UPDATE
        `,
        [requestId]
      );

    const request =
      requestRows[0];

    if (!request) {
      throw new AppError(
        "Chef request not found",
        404
      );
    }

    if (
      request.status !== "pending"
    ) {
      throw new AppError(
        "Only pending chef requests can be rejected",
        409
      );
    }

    await connection.execute(
      `
        UPDATE chef_requests
        SET
          status = 'rejected',
          rejection_reason = ?,
          reviewed_by = ?,
          reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        normalizedReason,
        adminUserId,
        requestId,
      ]
    );

    await connection.execute(
      `
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          related_entity_type,
          related_entity_id
        )
        VALUES (
          ?,
          'chef_request_rejected',
          'Chef request rejected',
          ?,
          'chef_request',
          ?
        )
      `,
      [
        request.user_id,
        `Your chef request was rejected: ${normalizedReason}`,
        requestId,
      ]
    );

    await connection.commit();

    /*
    Returns only the fields required to update
    the administrator's local list.
    */
    return {
      id: requestId,
      user_id: request.user_id,
      status: "rejected",
      rejection_reason:
        normalizedReason,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  submitRequest,
  getMyRequest,
  getAllRequests,
  approveRequest,
  rejectRequest,
};