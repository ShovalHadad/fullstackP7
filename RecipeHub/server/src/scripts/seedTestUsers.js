/*
Loads environment variables before importing the database connection.
*/
require("dotenv").config();

const bcrypt = require("bcrypt");
const { pool } = require("../config/db");

const PASSWORD_SALT_ROUNDS = 12;

/*
These accounts are intended only for local development and testing.

Do not use simple passwords such as "1234" in production.
*/
const testUsers = [
  {
    fullName: "Test User",
    username: "user",
    email: "user@test.com",
    password: "1234",
    role: "user",
  },
  {
    fullName: "Test Chef",
    username: "chef",
    email: "chef@test.com",
    password: "1234",
    role: "chef",
  },
  {
    fullName: "Test Admin",
    username: "admin",
    email: "admin@test.com",
    password: "1234",
    role: "admin",
  },
];

/*
Creates or updates the development users.

If a user with the same email already exists,
the script updates the username, password and role.
*/
const seedTestUsers = async () => {
  try {
    for (const testUser of testUsers) {
      const passwordHash = await bcrypt.hash(
        testUser.password,
        PASSWORD_SALT_ROUNDS
      );

      await pool.execute(
        `
          INSERT INTO users (
            full_name,
            username,
            email,
            password_hash,
            role,
            is_blocked
          )
          VALUES (?, ?, ?, ?, ?, FALSE)

          ON DUPLICATE KEY UPDATE
            full_name = VALUES(full_name),
            username = VALUES(username),
            password_hash = VALUES(password_hash),
            role = VALUES(role),
            is_blocked = FALSE
        `,
        [
          testUser.fullName,
          testUser.username,
          testUser.email,
          passwordHash,
          testUser.role,
        ]
      );

      console.log(
        `Created or updated ${testUser.role}: ${testUser.email}`
      );
    }

    console.log("Test users were created successfully.");
  } catch (error) {
    console.error(
      "Failed to create test users:",
      error.message
    );

    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

seedTestUsers();