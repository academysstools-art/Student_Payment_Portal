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
  const client = getPool();
  await client.query(`
    CREATE TABLE IF NOT EXISTS auth_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(
    `CREATE INDEX IF NOT EXISTS auth_tokens_user_id_idx ON auth_tokens (user_id)`
  );
  schemaReady = true;
}

async function saveAuthToken({ token, userId, expiresAt }) {
  await ensureAuthTokenTable();
  await getPool().query(
    `INSERT INTO auth_tokens (token, user_id, expires_at, used)
     VALUES ($1, $2, $3, FALSE)
     ON CONFLICT (token) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       expires_at = EXCLUDED.expires_at,
       used = FALSE`,
    [token, userId, expiresAt]
  );
}

async function peekAuthToken(token) {
  await ensureAuthTokenTable();
  const { rows } = await getPool().query(
    `SELECT user_id, expires_at, used
     FROM auth_tokens
     WHERE token = $1
     LIMIT 1`,
    [token]
  );
  return rows[0] || null;
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
  peekAuthToken,
  consumeAuthToken,
};
