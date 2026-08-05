const authService = require("../services/authService");

/*
Handles user registration.

The controller receives the HTTP request,
calls the service and returns the HTTP response.
*/
const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/*
Handles user login.
*/
const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/*
Returns the currently authenticated user.

The authentication middleware places the user ID
inside req.user before this controller runs.
*/
const getCurrentUser = async (req, res, next) => {
  try {
    const result = await authService.getCurrentUser(
      req.user.userId
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
};