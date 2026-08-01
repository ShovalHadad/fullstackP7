/*
Represents an expected application error.

Examples:
- Invalid login credentials
- Email already exists
- User does not have permission
*/
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.name = "AppError";
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

module.exports = AppError;