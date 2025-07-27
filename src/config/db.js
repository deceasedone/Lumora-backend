// Lumora-bk/src/config/db.js

const { Pool } = require('pg');
const pg = require('pg');

// ========================================================================
// THE DEFINITIVE TIMEZONE FIX
// ========================================================================
// PostgreSQL's 'DATE' type has an OID (Object ID) of 1082.
// By default, the 'pg' driver parses this type into a local JS Date object,
// which causes all our timezone problems.
//
// This line overrides that default parser. It tells the driver:
// "When you see a column with type 1082 (DATE), do NOT convert it.
// Just give me the raw string value as it is in the database."
//
// This is the root of the fix.
pg.types.setTypeParser(1082, (val) => val);
// ========================================================================


// This creates a connection "pool" using the environment variables
// from your .env file.
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// We export an object with a 'query' function that all our controllers can use.
module.exports = {
  query: (text, params) => pool.query(text, params),
};