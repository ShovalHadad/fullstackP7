const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const userModel = require("../models/userModel");
const AppError = require("./appError");

const PASSWORD_SALT_ROUNDS = 12;

/*
Creates a signed JWT for an authenticated user.

Only the minimum information required for authentication
is stored in the token.
*/
const createToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn:
        process.env.JWT_EXPIRES_IN || "2h",
    }
  );
};

/*
Validates and normalizes registration data.
*/
const validateRegistrationData = ({
  fullName,
  username,
  email,
  password,
}) => {
  if (!fullName || !username || !email || !password) {
    throw new AppError(
      "Full name, username, email and password are required",
      400
    );
  }

  if (
    typeof fullName !== "string" ||
    typeof username !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    throw new AppError(
      "Registration fields must contain valid text",
      400
    );
  }

  const normalizedFullName = fullName.trim();
  const normalizedUsername = username.trim();
  const normalizedEmail =
    email.trim().toLowerCase();

  if (normalizedFullName.length < 2) {
    throw new AppError(
      "Full name must contain at least 2 characters",
      400
    );
  }

  if (normalizedUsername.length < 3) {
    throw new AppError(
      "Username must contain at least 3 characters",
      400
    );
  }

  const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(normalizedEmail)) {
    throw new AppError(
      "Email address is not valid",
      400
    );
  }

  /*
  Real users who register through the website
  must use a stronger password.

  The simple development accounts were created separately
  and are not affected by this validation.
  */
  if (password.length < 8) {
    throw new AppError(
      "Password must contain at least 8 characters",
      400
    );
  }

  return {
    fullName: normalizedFullName,
    username: normalizedUsername,
    email: normalizedEmail,
    password,
  };
};

/*
Registers a new regular user.
*/
const register = async (registrationData) => {
  const validatedData =
    validateRegistrationData(registrationData);

  const existingEmail =
    await userModel.findByEmail(
      validatedData.email
    );

  if (existingEmail) {
    throw new AppError(
      "A user with this email already exists",
      409
    );
  }

  const existingUsername =
    await userModel.findByUsername(
      validatedData.username
    );

  if (existingUsername) {
    throw new AppError(
      "This username is already in use",
      409
    );
  }

  const passwordHash = await bcrypt.hash(
    validatedData.password,
    PASSWORD_SALT_ROUNDS
  );

  const user = await userModel.create({
    fullName: validatedData.fullName,
    username: validatedData.username,
    email: validatedData.email,
    passwordHash,
  });

  const token = createToken(user);

  return {
    user,
    token,
  };
};

/*
Authenticates a user using email and password.
*/
const login = async ({ email, password }) => {
  if (!email || !password) {
    throw new AppError(
      "Email and password are required",
      400
    );
  }

  if (
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    throw new AppError(
      "Email and password must contain valid text",
      400
    );
  }

  const normalizedEmail =
    email.trim().toLowerCase();

  const user =
    await userModel.findByEmail(
      normalizedEmail
    );

  /*
  The same error is returned for an unknown email
  and an incorrect password so account existence
  is not exposed.
  */
  if (!user) {
    throw new AppError(
      "Invalid email or password",
      401
    );
  }

  if (user.is_blocked) {
    throw new AppError(
      "This account has been blocked",
      403
    );
  }

  const passwordMatches =
    await bcrypt.compare(
      password,
      user.password_hash
    );

  if (!passwordMatches) {
    throw new AppError(
      "Invalid email or password",
      401
    );
  }

  /*
  Sends only fields that are required by the client.

  password_hash and is_blocked remain on the server.
  */
  const publicUser = {
    id: user.id,
    full_name: user.full_name,
    username: user.username,
    email: user.email,
    role: user.role,
    profile_image_url:
      user.profile_image_url,
  };

  const token = createToken(publicUser);

  return {
    user: publicUser,
    token,
  };
};

/*
Returns the public profile of the currently authenticated user.
*/
const getCurrentUser = async (userId) => {
  const user = await userModel.findPublicById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return { user };
};

module.exports = {
  register,
  login,
  getCurrentUser,
};