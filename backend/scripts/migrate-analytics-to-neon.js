// One-time copy of portal analytics history from BigQuery's output dataset
// into Neon. Run from backend/:  node scripts/migrate-analytics-to-neon.js
// Refuses to run if the Neon tables already have rows (pass --force to append anyway).
require("dotenv").config();
const { runQuery } = require("../config/bigquery");
const { getPool } = require("../config/postgres");
const { TABLES, ensureAnalyticsTables } = require("../config/analyticsDb");

const project = process.env.BIGQUERY_PROJECT_ID;
const outDataset = process.env.BIGQUERY_OUTPUT_DATASET || "academy_payments_portal_output_data";
const inDataset = process.env.BIGQUERY_DATASET || "academy_payments_portal_data";
const bq = (dataset, table) => `\`${project}.${dataset}.${table}\``;
const BATCH = 1000;

function parseJson(value) {
  if (value == null || value === "") return null;
  try {
    return JSON.stringify(JSON.parse(value));
  } catch {
    return JSON.stringify({ raw: String(value) });
  }
}

async function insertBatches(client, table, columns, rows) {
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const params = [];
    const tuples = chunk.map((row) => {
      const placeholders = row.map((value) => {
        params.push(value);
        return `$${params.length}`;
      });
      return `(${placeholders.join(", ")})`;
    });
    await client.query(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${tuples.join(", ")}`,
      params
    );
  }
}

async function main() {
  const force = process.argv.includes("--force");
  await ensureAnalyticsTables();
  const pool = getPool();

  for (const table of Object.values(TABLES)) {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
    if (rows[0].n > 0 && !force) {
      throw new Error(`${table} already has ${rows[0].n} rows; refusing to copy twice (use --force).`);
    }
  }

  console.log("Reading BigQuery history...");
  const [logins, events, feedback] = await Promise.all([
    runQuery(
      `SELECT l.user_id, f.first_name, f.program_name, l.login_datetime
       FROM ${bq(outDataset, "student_login_logs")} l
       LEFT JOIN ${bq(inDataset, "user_fee_details_for_payment_page_pilot")} f USING (user_id)`
    ),
    runQuery(
      `SELECT user_id, student_name, programme, event_name, event_data, event_at
       FROM ${bq(outDataset, "student_event_logs")}`
    ),
    runQuery(
      `SELECT user_id, student_name, programme, rating, selected_options, comments, submitted_at
       FROM ${bq(outDataset, "student_feedback")}`
    ),
  ]);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await insertBatches(
      client,
      TABLES.LOGINS,
      ["user_id", "student_name", "programme", "method", "login_at"],
      logins
        .filter((r) => r.user_id && r.login_datetime)
        // BigQuery DATETIME has no zone; the source log is UTC
        .map((r) => [r.user_id, r.first_name || "", r.program_name || "", "sso", `${r.login_datetime}Z`])
    );

    await insertBatches(
      client,
      TABLES.EVENTS,
      ["user_id", "student_name", "programme", "event_name", "event_data", "event_at"],
      events
        .filter((r) => r.event_name)
        .map((r) => [
          r.user_id || "", // a few historical events were logged without a user
          r.student_name || "",
          r.programme || "",
          r.event_name,
          parseJson(r.event_data),
          r.event_at || new Date().toISOString(),
        ])
    );

    await insertBatches(
      client,
      TABLES.FEEDBACK,
      ["user_id", "student_name", "programme", "rating", "selected_options", "comments", "submitted_at"],
      feedback
        .filter((r) => r.user_id && r.rating >= 1 && r.rating <= 5)
        .map((r) => [
          r.user_id,
          r.student_name || "",
          r.programme || "",
          r.rating,
          (r.selected_options || "").split(", ").filter(Boolean),
          r.comments || "",
          r.submitted_at || new Date().toISOString(),
        ])
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  for (const [label, table, source] of [
    ["logins", TABLES.LOGINS, logins.length],
    ["events", TABLES.EVENTS, events.length],
    ["feedback", TABLES.FEEDBACK, feedback.length],
  ]) {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
    console.log(`${label}: BigQuery ${source} -> Neon ${rows[0].n}`);
  }
  await pool.end();
}

main().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exit(1);
});
