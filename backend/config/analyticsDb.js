// Portal analytics + feedback, stored in Neon Postgres.
// Student fee data is read from BigQuery (config/bigquery.js); everything the
// portal itself records (logins, page events, feedback) lives here.
// Tables are prefixed because this Neon database is shared with other apps.
const { getPool } = require("./postgres");

const TABLES = {
  LOGINS: "payment_portal_logins",
  EVENTS: "payment_portal_events",
  FEEDBACK: "payment_portal_feedback",
};

let schemaPromise = null;

function ensureAnalyticsTables() {
  if (!schemaPromise) {
    schemaPromise = getPool()
      .query(`
        CREATE TABLE IF NOT EXISTS ${TABLES.LOGINS} (
          id BIGSERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          student_name TEXT NOT NULL DEFAULT '',
          programme TEXT NOT NULL DEFAULT '',
          method TEXT NOT NULL DEFAULT '',
          login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ${TABLES.LOGINS}_login_at_idx ON ${TABLES.LOGINS} (login_at DESC);
        CREATE INDEX IF NOT EXISTS ${TABLES.LOGINS}_user_id_idx ON ${TABLES.LOGINS} (user_id);

        CREATE TABLE IF NOT EXISTS ${TABLES.EVENTS} (
          id BIGSERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          student_name TEXT NOT NULL DEFAULT '',
          programme TEXT NOT NULL DEFAULT '',
          event_name TEXT NOT NULL,
          event_data JSONB,
          event_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ${TABLES.EVENTS}_event_name_idx ON ${TABLES.EVENTS} (event_name);

        CREATE TABLE IF NOT EXISTS ${TABLES.FEEDBACK} (
          id BIGSERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          student_name TEXT NOT NULL DEFAULT '',
          programme TEXT NOT NULL DEFAULT '',
          rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
          selected_options TEXT[] NOT NULL DEFAULT '{}',
          comments TEXT NOT NULL DEFAULT '',
          submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ${TABLES.FEEDBACK}_submitted_at_idx ON ${TABLES.FEEDBACK} (submitted_at DESC);
      `)
      .catch((error) => {
        schemaPromise = null; // retry on next call
        throw error;
      });
  }
  return schemaPromise;
}

async function query(sql, params) {
  await ensureAnalyticsTables();
  return getPool().query(sql, params);
}

// ---------- Writes ----------

// Fire-and-forget: analytics must never break a user request
async function recordLogin({ userId, name, programme, method }) {
  try {
    await query(
      `INSERT INTO ${TABLES.LOGINS} (user_id, student_name, programme, method)
       VALUES ($1, $2, $3, $4)`,
      [userId, name || "", programme || "", method || ""]
    );
  } catch (error) {
    console.error("[Neon] Failed to record login:", error.message);
  }
}

async function appendEventLog({ userId, name, programme, eventName, eventData }) {
  try {
    await query(
      `INSERT INTO ${TABLES.EVENTS} (user_id, student_name, programme, event_name, event_data)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, name || "", programme || "", eventName, eventData ? JSON.stringify(eventData) : null]
    );
  } catch (error) {
    console.error("[Neon] Failed to log event:", error.message);
  }
}

// Feedback is user-visible, so errors propagate to the caller
async function appendFeedback({ userId, name, programme, rating, selectedOptions, comments }) {
  await query(
    `INSERT INTO ${TABLES.FEEDBACK} (user_id, student_name, programme, rating, selected_options, comments)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, name || "", programme || "", rating, selectedOptions || [], comments || ""]
  );
}

// ---------- Reads (admin) ----------

async function getLoginTotals() {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS total_logins, COUNT(DISTINCT LOWER(user_id))::int AS unique_students
     FROM ${TABLES.LOGINS}`
  );
  return rows[0] || { total_logins: 0, unique_students: 0 };
}

async function getRecentLogins(limit = 50) {
  const { rows } = await query(
    `SELECT user_id, student_name AS name, programme, method, login_at AS login_datetime
     FROM ${TABLES.LOGINS}
     ORDER BY login_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

async function getEventStats() {
  const { rows } = await query(
    `SELECT
       COUNT(*) FILTER (WHERE event_name = 'fee_page_viewed')::int         AS fee_page_viewed,
       COUNT(*) FILTER (WHERE event_name = 'payment_summary_viewed')::int  AS payment_summary_viewed,
       COUNT(*) FILTER (WHERE event_name = 'covered_amount_viewed')::int   AS covered_amount_viewed,
       COUNT(*) FILTER (WHERE event_name = 'emi_details_viewed')::int      AS emi_details_viewed,
       COUNT(*) FILTER (WHERE event_name = 'clicked_payment_history')::int AS clicked_payment_history,
       COUNT(*) FILTER (WHERE event_name = 'clicked_contact_jodo')::int    AS clicked_contact_jodo,
       COUNT(*) FILTER (WHERE event_name = 'clicked_contact_nbfc')::int    AS clicked_contact_nbfc,
       COUNT(*) FILTER (WHERE event_name = 'clicked_chat_support')::int    AS clicked_chat_support,
       COUNT(*) FILTER (WHERE event_name = 'feedback_opened')::int         AS feedback_opened,
       COUNT(*) FILTER (WHERE event_name = 'feedback_abandoned')::int      AS feedback_abandoned,
       COUNT(*) FILTER (WHERE event_name = 'feedback_submitted')::int      AS feedback_submitted,
       AVG(CASE WHEN event_name = 'time_spent' AND (event_data->>'seconds') ~ '^-?[0-9.]+$'
                THEN (event_data->>'seconds')::float END)                  AS avg_time_spent,
       AVG(CASE WHEN event_name = 'scroll_depth' AND (event_data->>'maxPercent') ~ '^-?[0-9.]+$'
                THEN (event_data->>'maxPercent')::float END)               AS avg_scroll_depth
     FROM ${TABLES.EVENTS}`
  );
  return rows[0] || null;
}

async function getFeedbackEntries(limit = 1000) {
  const { rows } = await query(
    `SELECT id, user_id, student_name, programme, rating, selected_options, comments, submitted_at
     FROM ${TABLES.FEEDBACK}
     ORDER BY submitted_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

module.exports = {
  TABLES,
  ensureAnalyticsTables,
  recordLogin,
  appendEventLog,
  appendFeedback,
  getLoginTotals,
  getRecentLogins,
  getEventStats,
  getFeedbackEntries,
};
