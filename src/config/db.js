// Lumora-bk/src/config/db.js

const { Pool } = require('pg');
const pg = require('pg');

// PostgreSQL DATE (OID 1082) is a calendar day with no timezone. The default
// parser turns it into a local Date, which shifts the day. Keep the raw string.
pg.types.setTypeParser(1082, (val) => val);

// PGSSL:
//   disable    - plain TCP (local Docker/dev Postgres)
//   no-verify  - encrypted, certificate not checked (providers with self-signed certs)
//   unset/any  - encrypted and verified (Neon, Supabase, RDS - the safe default)
function sslConfig() {
  const mode = (process.env.PGSSL || '').toLowerCase();
  if (mode === 'disable' || mode === 'false' || mode === 'off') return false;
  if (mode === 'no-verify') return { rejectUnauthorized: false };
  return { rejectUnauthorized: true };
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Serverless Postgres counts connections tightly; keep the ceiling low and
  // let idle ones go so a scaled-to-zero database isn't held open.
  max: Number(process.env.PG_POOL_MAX || 8),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30000),
  // A cold start on a scale-to-zero tier can take several seconds.
  connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS || 15000),
  ssl: sslConfig(),
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  close: () => pool.end(),
};
