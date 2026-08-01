const profileService =
  require("../services/profileService");

/*
Returns the authenticated user's profile.
*/
const getMyProfile = async (
  req,
  res,
  next
) => {
  try {
    const profile =
      await profileService
        .getMyProfile(
          req.user.userId
        );

    res.status(200).json({
      success: true,
      data: {
        profile,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
Updates the authenticated user's basic profile.

A replacement profile image is optional.
*/
const updateMyProfile = async (
  req,
  res,
  next
) => {
  try {
    const profile =
      await profileService
        .updateMyProfile(
          req.user.userId,
          req.body,
          req.file
        );

    res.status(200).json({
      success: true,
      message:
        "Profile updated successfully",
      data: {
        profile,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
Updates chef-specific profile information.
*/
const updateMyChefProfile = async (
  req,
  res,
  next
) => {
  try {
    const chefProfile =
      await profileService
        .updateMyChefProfile(
          req.user.userId,
          req.body
        );

    res.status(200).json({
      success: true,
      message:
        chefProfile.changed
          ? "Chef profile updated successfully"
          : "Chef profile was not changed",
      data: {
        chef_profile: chefProfile,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  updateMyChefProfile,
};