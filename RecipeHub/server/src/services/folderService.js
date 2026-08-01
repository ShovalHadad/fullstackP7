const { pool } = require("../config/db");

const folderModel =
  require("../models/folderModel");

const AppError =
  require("./appError");

const MAX_FOLDER_NAME_LENGTH = 100;

/*
Validates a folder ID received from the route.
*/
const validateFolderId = (folderId) => {
  if (
    !Number.isInteger(folderId) ||
    folderId <= 0
  ) {
    throw new AppError(
      "Folder ID is not valid",
      400
    );
  }
};

/*
Validates and normalizes a folder name.
*/
const validateFolderName = (name) => {
  if (
    typeof name !== "string" ||
    !name.trim()
  ) {
    throw new AppError(
      "Folder name is required",
      400
    );
  }

  const normalizedName = name.trim();

  if (normalizedName.length < 2) {
    throw new AppError(
      "Folder name must contain at least 2 characters",
      400
    );
  }

  if (
    normalizedName.length >
    MAX_FOLDER_NAME_LENGTH
  ) {
    throw new AppError(
      `Folder name cannot exceed ${MAX_FOLDER_NAME_LENGTH} characters`,
      400
    );
  }

  return normalizedName;
};

/*
Returns the authenticated user's folders.
*/
const getFolders = async (userId) => {
  const folders =
    await folderModel.findAllByUserId(
      userId
    );

  return folders.map((folder) => ({
    id: folder.id,
    name: folder.name,
    recipe_count:
      Number(folder.recipe_count || 0),
  }));
};

/*
Creates a personal folder.

Folder names must be unique for the same user.
Different users may use the same folder name.
*/
const createFolder = async (
  userId,
  folderData
) => {
  const name = validateFolderName(
    folderData.name
  );

  const existingFolder =
    await folderModel
      .findByNameAndUserId(
        name,
        userId
      );

  if (existingFolder) {
    throw new AppError(
      "You already have a folder with this name",
      409
    );
  }

  return folderModel.create(
    userId,
    name
  );
};

/*
Updates a folder owned by the authenticated user.
*/
const updateFolder = async (
  folderId,
  userId,
  folderData
) => {
  validateFolderId(folderId);

  const name = validateFolderName(
    folderData.name
  );

  const folder =
    await folderModel
      .findByIdAndUserId(
        folderId,
        userId
      );

  if (!folder) {
    throw new AppError(
      "Folder not found",
      404
    );
  }

  const folderWithSameName =
    await folderModel
      .findByNameAndUserId(
        name,
        userId
      );

  if (
    folderWithSameName &&
    Number(folderWithSameName.id) !==
      Number(folderId)
  ) {
    throw new AppError(
      "You already have a folder with this name",
      409
    );
  }

  if (folder.name === name) {
    return {
      id: folderId,
      name,
    };
  }

  const affectedRows =
    await folderModel.update(
      folderId,
      userId,
      name
    );

  if (affectedRows !== 1) {
    throw new AppError(
      "Folder could not be updated",
      409
    );
  }

  return {
    id: folderId,
    name,
  };
};

/*
Deletes a folder owned by the authenticated user.

All saved-recipe records stored in the folder are deleted
before the folder itself is deleted.

Both operations are performed in one transaction.
*/
const deleteFolder = async (
  folderId,
  userId
) => {
  validateFolderId(folderId);

  const connection =
    await pool.getConnection();

  try {
    await connection.beginTransaction();

    const folder =
      await folderModel
        .findByIdAndUserIdForUpdate(
          connection,
          folderId,
          userId
        );

    if (!folder) {
      throw new AppError(
        "Folder not found",
        404
      );
    }

    const deletedSavedRecipeCount =
      await folderModel
        .deleteSavedRecipesByFolder(
          connection,
          folderId,
          userId
        );

    const affectedRows =
      await folderModel.remove(
        connection,
        folderId,
        userId
      );

    if (affectedRows !== 1) {
      throw new AppError(
        "Folder could not be deleted",
        409
      );
    }

    await connection.commit();

    /*
    Returns only the information needed to update
    the client cache after deletion.
    */
    return {
      id: folderId,
      deleted: true,
      removed_saved_recipe_count:
        deletedSavedRecipeCount,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
};