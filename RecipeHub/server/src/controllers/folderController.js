const folderService =
  require("../services/folderService");

/*
Returns all folders owned by the authenticated user.
*/
const getFolders = async (
  req,
  res,
  next
) => {
  try {
    const folders =
      await folderService.getFolders(
        req.user.userId
      );

    res.status(200).json({
      success: true,
      data: {
        folders,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
Creates a personal folder.
*/
const createFolder = async (
  req,
  res,
  next
) => {
  try {
    const folder =
      await folderService.createFolder(
        req.user.userId,
        req.body
      );

    res.status(201).json({
      success: true,
      message:
        "Folder created successfully",
      data: {
        folder,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
Updates a personal folder.
*/
const updateFolder = async (
  req,
  res,
  next
) => {
  try {
    const folder =
      await folderService.updateFolder(
        Number(req.params.folderId),
        req.user.userId,
        req.body
      );

    res.status(200).json({
      success: true,
      message:
        "Folder updated successfully",
      data: {
        folder,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
Deletes a personal folder.
*/
const deleteFolder = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await folderService.deleteFolder(
        Number(req.params.folderId),
        req.user.userId
      );

    res.status(200).json({
      success: true,
      message:
        "Folder deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
};
