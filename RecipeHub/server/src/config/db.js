const mysql = require("mysql2/promise");

/*
Creates a connection pool for the MySQL database.

A connection pool keeps several reusable database connections.
This is more efficient than opening a new connection for every HTTP request.
*/
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  /*
  If all connections are currently in use,
  new requests will wait until a connection becomes available.
  */
  waitForConnections: true,

  /*
  Maximum number of active connections in the pool.
  */
  connectionLimit: 10,

  /*
  Zero means there is no limit on the number of requests
  waiting for an available connection.
  */
  queueLimit: 0,
});

/*
Tests whether the server can successfully connect to MySQL.

The SELECT 1 query is a simple test query.
It does not read or modify any application data.
*/
const testDatabaseConnection = async () => {
  const connection = await pool.getConnection();

  try {
    await connection.query("SELECT 1");
    console.log("Connected successfully to MySQL");
  } finally {
    /*
    Returns the connection to the pool,
    even if the query throws an error.
    */
    connection.release();
  }
};

module.exports = {
  pool,
  testDatabaseConnection,
};