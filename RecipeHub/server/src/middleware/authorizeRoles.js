const AppError = require("../services/appError");

/*
Creates middleware that allows access only to users
whose role appears in the allowed roles list.

Examples:
authorizeRoles("admin")
authorizeRoles("chef", "admin")
*/
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError("Authentication is required", 401)
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          "You do not have permission to perform this action",
          403
        )
      );
    }

    next();
  };
};

module.exports = authorizeRoles;