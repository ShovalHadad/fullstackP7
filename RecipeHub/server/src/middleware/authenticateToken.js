const jwt = require("jsonwebtoken");

const userModel = require("../models/userModel");
const AppError = require("../services/appError");

/*
Authenticates a request using a JWT Bearer token.

Expected header:
Authorization: Bearer <token>
*/
const authenticateToken = async (req, res, next) => {
  try {
    const authorizationHeader =
      req.headers.authorization;

    if (
      !authorizationHeader ||
      !authorizationHeader.startsWith("Bearer ")
    ) {
      throw new AppError(
        "Authentication token is required",
        401
      );
    }

    const token =
      authorizationHeader.split(" ")[1];

    if (!token) {
      throw new AppError(
        "Authentication token is required",
        401
      );
    }

    let decodedToken;

    try {
      decodedToken = jwt.verify(
        token,
        process.env.JWT_SECRET
      );
    } catch (error) {
      throw new AppError(
        "Authentication token is invalid or expired",
        401
      );
    }

    /*
    Loads only the minimum data required for authorization.

    This database check is intentionally performed on every
    protected request so blocked users or changed roles
    take effect immediately.
    */
    const user =
      await userModel.findAuthDataById(
        decodedToken.userId
      );

    if (!user) {
      throw new AppError(
        "User account no longer exists",
        401
      );
    }

    if (user.is_blocked) {
      throw new AppError(
        "This account has been blocked",
        403
      );
    }

    /*
    The current role is taken from the database
    instead of relying only on the token.
    */
    req.user = {
      userId: user.id,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticateToken;