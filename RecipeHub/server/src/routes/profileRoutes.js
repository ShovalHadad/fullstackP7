const express =
  require("express");

const profileController =
  require("../controllers/profileController");

const authenticateToken =
  require("../middleware/authenticateToken");

const authorizeRoles =
  require("../middleware/authorizeRoles");

const uploadImage =
  require("../middleware/uploadImage");

const router = express.Router();

/*
Every profile route requires authentication.
*/
router.use(authenticateToken);

/*
Returns the authenticated user's profile.
*/
router.get(
  "/",
  profileController.getMyProfile
);

/*
Updates full name, username and optional profile image.

Expected multipart fields:
- fullName
- username
- image, optional
- removeImage, optional
*/
router.put(
  "/",
  uploadImage.single("image"),
  profileController.updateMyProfile
);

/*
Updates chef-specific profile information.

Only users whose current database role is chef
may access this route.
*/
router.put(
  "/chef",
  authorizeRoles("chef"),
  profileController.updateMyChefProfile
);

module.exports = router;