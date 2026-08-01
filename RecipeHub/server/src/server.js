/*
Loads environment variables from the .env file.

This must run before importing files that use process.env,
such as the database configuration.
*/
require("dotenv").config();

const app = require("./app");
const {
  testDatabaseConnection,
} = require("./config/db");

const PORT = process.env.PORT || 3001;

/*
Starts the application server.

The Express server starts only after a successful
connection test with the MySQL database.
*/
const startServer = async () => {
  try {
    /*
    Verifies that MySQL is available
    and that the connection details are correct.
    */
    await testDatabaseConnection();

    app.listen(PORT, () => {
      console.log(
        `RecipeHub server is running on port ${PORT}`
      );
    });
  } catch (error) {
    /*
    If the database connection fails,
    the application does not start.

    This prevents the server from appearing available
    while database operations cannot work.
    */
    console.error(
      "Failed to connect to MySQL:",
      error.message
    );

    process.exit(1);
  }
};

startServer();