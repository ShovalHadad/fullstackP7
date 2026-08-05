const express = require("express");
const cors = require("cors");

const authRoutes =
  require("./routes/authRoutes");

const chefRequestRoutes =
  require("./routes/chefRequestRoutes");

const adminChefRequestRoutes =
  require("./routes/adminChefRequestRoutes");

const categoryRoutes =
  require("./routes/categoryRoutes");

const adminCategoryRoutes =
  require("./routes/adminCategoryRoutes");

const recipeRoutes =
  require("./routes/recipeRoutes");

const adminRecipeRoutes =
  require("./routes/adminRecipeRoutes");

const folderRoutes =
  require("./routes/folderRoutes");

const savedRecipeRoutes =
  require("./routes/savedRecipeRoutes");

const questionRoutes =
  require("./routes/questionRoutes");

const reviewRoutes =
  require("./routes/reviewRoutes");

const notificationRoutes =
  require("./routes/notificationRoutes");

const adminUserRoutes =
  require("./routes/adminUserRoutes");

const profileRoutes =
  require("./routes/profileRoutes");

const errorHandler =
  require("./middleware/errorHandler");

const app = express();

/*
Allows the server to read JSON request bodies.
*/
app.use(express.json());

/*
Allows the React development client
to communicate with the Express server.
*/
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

/*
Public health-check route.
*/
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message:
      "RecipeHub API is running",
  });
});

/*
Authentication routes.

Public routes:
- Register
- Login

Protected routes such as /me are protected
inside authRoutes.
*/
app.use(
  "/api/auth",
  authRoutes
);

/*
Chef-request routes for regular users.
*/
app.use(
  "/api/chef-requests",
  chefRequestRoutes
);

/*
Chef-request management routes
for administrators.
*/
app.use(
  "/api/admin/chef-requests",
  adminChefRequestRoutes
);

/*
Active categories for authenticated users.
*/
app.use(
  "/api/categories",
  categoryRoutes
);

/*
Category-management routes
for administrators.
*/
app.use(
  "/api/admin/categories",
  adminCategoryRoutes
);

/*
Recipe routes.

These include:
- Recipe list and details
- Creating recipes
- Updating owned recipes
- Soft-deleting owned recipes
*/
app.use(
  "/api/recipes",
  recipeRoutes
);

/*
Recipe-management routes
for administrators.
*/
app.use(
  "/api/admin/recipes",
  adminRecipeRoutes
);

/*
Personal folder routes.
*/
app.use(
  "/api/folders",
  folderRoutes
);

/*
Personal saved-recipe routes.
*/
app.use(
  "/api/saved-recipes",
  savedRecipeRoutes
);

/*
Question and answer routes.

This router includes complete paths beginning with:
- /recipes
- /questions
- /answers
*/
app.use(
  "/api",
  questionRoutes
);

/*
Review routes.

This router includes complete paths beginning with:
- /recipes
- /reviews
*/
app.use(
  "/api",
  reviewRoutes
);

/*
Personal notification routes.
*/
app.use(
  "/api/notifications",
  notificationRoutes
);

/*
User-management routes
for administrators.
*/
app.use(
  "/api/admin/users",
  adminUserRoutes
);

/*
Authenticated user-profile routes.
*/
app.use(
  "/api/profile",
  profileRoutes
);

/*
Handles requests to routes that do not exist.

This middleware must appear after every valid route.
*/
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/*
The central error handler must be registered last.
*/
app.use(errorHandler);

module.exports = app;