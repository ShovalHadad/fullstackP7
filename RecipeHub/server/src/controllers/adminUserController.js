const adminUserService =
  require("../services/adminUserService");

/*
Returns a filtered and paginated user-management list.
*/
const getUsers = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await adminUserService.getUsers(
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
Blocks one user or chef account.
*/
const blockUser = async (
  req,
  res,
  next
) => {
  try {
    const user =
      await adminUserService.blockUser(
        Number(req.params.userId),
        req.user.userId
      );

    res.status(200).json({
      success: true,
      message:
        user.changed
          ? "User blocked successfully"
          : "User is already blocked",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
Unblocks one user or chef account.
*/
const unblockUser = async (
  req,
  res,
  next
) => {
  try {
    const user =
      await adminUserService.unblockUser(
        Number(req.params.userId),
        req.user.userId
      );

    res.status(200).json({
      success: true,
      message:
        user.changed
          ? "User unblocked successfully"
          : "User is already active",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  blockUser,
  unblockUser,
};