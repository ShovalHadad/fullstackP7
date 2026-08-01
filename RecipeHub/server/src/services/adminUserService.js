const adminUserModel =
  require("../models/adminUserModel");

const AppError =
  require("./appError");

const ALLOWED_ROLES = [
  "user",
  "chef",
  "admin",
];

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/*
Validates a positive user identifier.
*/
const validateUserId = (userId) => {
  if (
    !Number.isInteger(userId) ||
    userId <= 0
  ) {
    throw new AppError(
      "User ID is not valid",
      400
    );
  }
};

/*
Parses an optional blocked-state query value.

Missing value means no blocked-state filter.
*/
const parseBlockedFilter = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (
    value === true ||
    value === "true" ||
    value === "1"
  ) {
    return 1;
  }

  if (
    value === false ||
    value === "false" ||
    value === "0"
  ) {
    return 0;
  }

  throw new AppError(
    "isBlocked must be true or false",
    400
  );
};

/*
Validates and normalizes administrator user-list filters.
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

  let search = null;

  if (
    query.search !== undefined &&
    query.search !== null
  ) {
    if (typeof query.search !== "string") {
      throw new AppError(
        "Search must be text",
        400
      );
    }

    search =
      query.search.trim() || null;

    if (
      search &&
      search.length > 100
    ) {
      throw new AppError(
        "Search cannot exceed 100 characters",
        400
      );
    }
  }

  let role = null;

  if (
    query.role !== undefined &&
    query.role !== ""
  ) {
    role = query.role;

    if (!ALLOWED_ROLES.includes(role)) {
      throw new AppError(
        "User role filter is not valid",
        400
      );
    }
  }

  const isBlocked =
    parseBlockedFilter(
      query.isBlocked
    );

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    search,
    role,
    isBlocked,
  };
};

/*
Returns a filtered and paginated administrator user list.

The list and count queries run in parallel.
*/
const getUsers = async (query) => {
  const filters =
    validateListQuery(query);

  const [users, totalItems] =
    await Promise.all([
      adminUserModel.findAll(filters),
      adminUserModel.countAll(filters),
    ]);

  const totalPages =
    totalItems === 0
      ? 0
      : Math.ceil(
          totalItems / filters.limit
        );

  return {
    items: users.map((user) => ({
      id: user.id,
      full_name: user.full_name,
      username: user.username,
      email: user.email,
      role: user.role,
      profile_image_url:
        user.profile_image_url,
      is_blocked:
        Boolean(user.is_blocked),
      created_at: user.created_at,
    })),

    pagination: {
      page: filters.page,
      limit: filters.limit,
      total_items: totalItems,
      total_pages: totalPages,
    },
  };
};

/*
Returns the target account after validating
that the administrator may manage it.
*/
const getManageableUser = async (
  targetUserId,
  adminUserId
) => {
  validateUserId(targetUserId);

  if (
    Number(targetUserId) ===
    Number(adminUserId)
  ) {
    throw new AppError(
      "You cannot block or unblock your own account",
      400
    );
  }

  const targetUser =
    await adminUserModel
      .findManagementDataById(
        targetUserId
      );

  if (!targetUser) {
    throw new AppError(
      "User not found",
      404
    );
  }

  /*
  Administrators cannot block or unblock other administrators.

  This prevents one administrator from disabling
  another administrator account.
  */
  if (targetUser.role === "admin") {
    throw new AppError(
      "Administrator accounts cannot be blocked",
      403
    );
  }

  return targetUser;
};

/*
Blocks an active user or chef account.

A blocked user is immediately rejected by authenticateToken
on every protected request, even when holding an old JWT.
*/
const blockUser = async (
  targetUserId,
  adminUserId
) => {
  const targetUser =
    await getManageableUser(
      targetUserId,
      adminUserId
    );

  if (targetUser.is_blocked) {
    return {
      id: targetUserId,
      is_blocked: true,
      changed: false,
    };
  }

  const affectedRows =
    await adminUserModel.block(
      targetUserId
    );

  if (affectedRows !== 1) {
    throw new AppError(
      "User could not be blocked",
      409
    );
  }

  return {
    id: targetUserId,
    is_blocked: true,
    changed: true,
  };
};

/*
Unblocks a blocked user or chef account.
*/
const unblockUser = async (
  targetUserId,
  adminUserId
) => {
  const targetUser =
    await getManageableUser(
      targetUserId,
      adminUserId
    );

  if (!targetUser.is_blocked) {
    return {
      id: targetUserId,
      is_blocked: false,
      changed: false,
    };
  }

  const affectedRows =
    await adminUserModel.unblock(
      targetUserId
    );

  if (affectedRows !== 1) {
    throw new AppError(
      "User could not be unblocked",
      409
    );
  }

  return {
    id: targetUserId,
    is_blocked: false,
    changed: true,
  };
};

module.exports = {
  getUsers,
  blockUser,
  unblockUser,
};