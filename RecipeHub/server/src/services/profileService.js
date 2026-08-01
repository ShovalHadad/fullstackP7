const { pool } = require("../config/db");

const profileModel =
  require("../models/profileModel");

const imageService =
  require("./imageService");

const AppError =
  require("./appError");

const MAX_FULL_NAME_LENGTH = 100;
const MAX_USERNAME_LENGTH = 50;

const MAX_DISPLAY_NAME_LENGTH = 100;
const MAX_BIO_LENGTH = 1000;
const MAX_EXPERIENCE_LENGTH = 500;
const MAX_SPECIALTIES_LENGTH = 500;

/*
Validates and normalizes a required text field.
*/
const validateRequiredText = (
  value,
  fieldName,
  minLength,
  maxLength
) => {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new AppError(
      `${fieldName} is required`,
      400
    );
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length < minLength) {
    throw new AppError(
      `${fieldName} must contain at least ${minLength} characters`,
      400
    );
  }

  if (normalizedValue.length > maxLength) {
    throw new AppError(
      `${fieldName} cannot exceed ${maxLength} characters`,
      400
    );
  }

  return normalizedValue;
};

/*
Validates and normalizes an optional text field.

An empty value is stored as null.
*/
const validateOptionalText = (
  value,
  fieldName,
  maxLength
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (typeof value !== "string") {
    throw new AppError(
      `${fieldName} must be text`,
      400
    );
  }

  const normalizedValue =
    value.trim() || null;

  if (
    normalizedValue &&
    normalizedValue.length > maxLength
  ) {
    throw new AppError(
      `${fieldName} cannot exceed ${maxLength} characters`,
      400
    );
  }

  return normalizedValue;
};

/*
Returns the authenticated user's profile.

Internal Cloudinary IDs and blocked-state data
are not returned.
*/
const getMyProfile = async (userId) => {
  const profile =
    await profileModel.findByUserId(
      userId
    );

  if (!profile) {
    throw new AppError(
      "User profile not found",
      404
    );
  }

  const result = {
    id: profile.id,
    full_name: profile.full_name,
    username: profile.username,
    email: profile.email,
    role: profile.role,
    profile_image_url:
      profile.profile_image_url,
  };

  if (profile.role === "chef") {
    result.chef_profile = {
      display_name:
        profile.display_name,
      bio: profile.bio,
      experience:
        profile.experience,
      specialties:
        profile.specialties,
    };
  }

  return result;
};

/*
Updates the user's basic profile and optional image.

Image rules:
- New image: replace the previous image.
- removeImage=true: remove the current image.
- Neither: keep the current image.
*/
const updateMyProfile = async (
  userId,
  profileData,
  imageFile
) => {
  const fullName =
    validateRequiredText(
      profileData.fullName,
      "Full name",
      2,
      MAX_FULL_NAME_LENGTH
    );

  const username =
    validateRequiredText(
      profileData.username,
      "Username",
      3,
      MAX_USERNAME_LENGTH
    );

  /*
  Usernames are limited to simple characters
  to avoid confusing URLs and display values.
  */
  if (
    !/^[a-zA-Z0-9._-]+$/.test(username)
  ) {
    throw new AppError(
      "Username may contain only letters, numbers, dots, underscores and hyphens",
      400
    );
  }

  const removeImage =
    profileData.removeImage === true ||
    profileData.removeImage === "true";

  if (
    removeImage &&
    imageFile?.buffer
  ) {
    throw new AppError(
      "A new image and removeImage cannot be used together",
      400
    );
  }

  /*
  Check username uniqueness before uploading to Cloudinary,
  so an invalid update does not perform an external upload.
  */
  const duplicateUser =
    await profileModel
      .findOtherUserByUsername(
        username,
        userId
      );

  if (duplicateUser) {
    throw new AppError(
      "Username is already in use",
      409
    );
  }

  let uploadedImage = null;
  let oldImagePublicId = null;
  let connection = null;
  let transactionCommitted = false;

  try {
    if (imageFile?.buffer) {
      uploadedImage =
        await imageService
          .uploadImageBuffer(
            imageFile.buffer,
            "recipehub/profiles"
          );
    }

    connection =
      await pool.getConnection();

    await connection.beginTransaction();

    const existingProfile =
      await profileModel
        .findByUserIdForUpdate(
          connection,
          userId
        );

    if (!existingProfile) {
      throw new AppError(
        "User profile not found",
        404
      );
    }

    oldImagePublicId =
      existingProfile
        .profile_image_public_id;

    let finalImageUrl =
      existingProfile
        .profile_image_url;

    let finalImagePublicId =
      existingProfile
        .profile_image_public_id;

    if (uploadedImage) {
      finalImageUrl =
        uploadedImage.imageUrl;

      finalImagePublicId =
        uploadedImage.imagePublicId;
    } else if (removeImage) {
      finalImageUrl = null;
      finalImagePublicId = null;
    }

    const affectedRows =
      await profileModel
        .updateUserProfile(
          connection,
          userId,
          {
            fullName,
            username,
            profileImageUrl:
              finalImageUrl,
            profileImagePublicId:
              finalImagePublicId,
          }
        );

    if (affectedRows !== 1) {
      throw new AppError(
        "Profile could not be updated",
        409
      );
    }

    await connection.commit();
    transactionCommitted = true;

    /*
    Delete the old image only after the database
    successfully references the new state.
    */
    if (
      oldImagePublicId &&
      (
        uploadedImage ||
        removeImage
      ) &&
      oldImagePublicId !==
        uploadedImage?.imagePublicId
    ) {
      try {
        await imageService.deleteImage(
          oldImagePublicId
        );
      } catch (imageDeletionError) {
        console.error(
          "Failed to delete previous profile image:",
          imageDeletionError.message
        );
      }
    }

    return {
      id: userId,
      full_name: fullName,
      username,
      profile_image_url:
        finalImageUrl,
    };
  } catch (error) {
    if (
      connection &&
      !transactionCommitted
    ) {
      await connection.rollback();
    }

    /*
    Remove a newly uploaded image when the database
    update did not complete.
    */
    if (
      uploadedImage?.imagePublicId &&
      !transactionCommitted
    ) {
      try {
        await imageService.deleteImage(
          uploadedImage.imagePublicId
        );
      } catch (imageDeletionError) {
        console.error(
          "Failed to remove unused profile image:",
          imageDeletionError.message
        );
      }
    }

    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/*
Updates chef-specific information.

The role middleware verifies that the current user
is a chef before this service is called.
*/
const updateMyChefProfile = async (
  userId,
  profileData
) => {
  const displayName =
    validateRequiredText(
      profileData.displayName,
      "Display name",
      2,
      MAX_DISPLAY_NAME_LENGTH
    );

  const bio =
    validateOptionalText(
      profileData.bio,
      "Bio",
      MAX_BIO_LENGTH
    );

  const experience =
    validateOptionalText(
      profileData.experience,
      "Experience",
      MAX_EXPERIENCE_LENGTH
    );

  const specialties =
    validateOptionalText(
      profileData.specialties,
      "Specialties",
      MAX_SPECIALTIES_LENGTH
    );

  const chefProfile =
    await profileModel
      .findChefProfileByUserId(
        userId
      );

  if (!chefProfile) {
    throw new AppError(
      "Chef profile not found",
      404
    );
  }

  if (
    chefProfile.display_name ===
      displayName &&
    chefProfile.bio === bio &&
    chefProfile.experience ===
      experience &&
    chefProfile.specialties ===
      specialties
  ) {
    return {
      display_name: displayName,
      bio,
      experience,
      specialties,
      changed: false,
    };
  }

  const affectedRows =
    await profileModel
      .updateChefProfile(
        userId,
        {
          displayName,
          bio,
          experience,
          specialties,
        }
      );

  if (affectedRows !== 1) {
    throw new AppError(
      "Chef profile could not be updated",
      409
    );
  }

  return {
    display_name: displayName,
    bio,
    experience,
    specialties,
    changed: true,
  };
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  updateMyChefProfile,
};