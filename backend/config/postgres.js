const { Pool } = require("pg");

let pool = null;
let schemaReady = false;

function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

async function ensureAuthTokenTable() {
  if (schemaReady) return;
  const { rows } = await getPool().query(
    "SELECT to_regclass('public.auth_tokens') AS table_name"
  );
  if (!rows[0]?.table_name) {
    throw new Error("auth_tokens table is not provisioned");
  }
  schemaReady = true;
}

async function saveAuthToken({ token, userId, expiresAt }) {
  await ensureAuthTokenTable();
  await getPool().query(
    `INSERT INTO auth_tokens (token, user_id, expires_at, used)
     VALUES ($1, $2, $3, FALSE)
     ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, expires_at = EXCLUDED.expires_at, used = FALSE`,
    [token, userId, expiresAt]
  );
}

async function consumeAuthToken(token) {
  await ensureAuthTokenTable();
  const { rows } = await getPool().query(
    `UPDATE auth_tokens
     SET used = TRUE
     WHERE token = $1
       AND used = FALSE
       AND expires_at > NOW()
     RETURNING user_id, expires_at`,
    [token]
  );
  return rows[0] || null;
}

module.exports = {
  getPool,
  ensureAuthTokenTable,
  saveAuthToken,
  consumeAuthToken,
};
