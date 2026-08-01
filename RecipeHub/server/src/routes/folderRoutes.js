const express =
  require("express");

const folderController =
  require("../controllers/folderController");

const authenticateToken =
  require("../middleware/authenticateToken");

const router = express.Router();

/*
Every folder route requires authentication.

Folder ownership is checked in database queries
using the authenticated user's ID.
*/
router.use(authenticateToken);

/*
Returns the current user's folders.
*/
router.get(
  "/",
  folderController.getFolders
);

/*
Creates a folder for the current user.
*/
router.post(
  "/",
  folderController.createFolder
);

/*
Updates only a folder owned by the current user.
*/
router.put(
  "/:folderId",
  folderController.updateFolder
);

/*
Deletes only a folder owned by the current user.
*/
router.delete(
  "/:folderId",
  folderController.deleteFolder
);

module.exports = router;