const { BigQuery } = require("@google-cloud/bigquery");

let bqInstance = null;

// Source-of-truth views/tables the portal reads from
const TABLES = {
  USER_LIST: "user_list_payment_portal_page_pilot",
  USER_FEE_DETAILS: "user_fee_details_for_payment_page_pilot",
  APPLICATION_DETAILS: "application_details_for_payment_page_pilot",
  FLEX_PAYMENT_LOGS: "jodo_flex_payment_logs_for_payment_page_pilot",
  PAID_TO_COMPANY_LOGS: "paid_to_company_logs_for_payment_page_pilot",
  NBFC_SUPPORT_MAILS: "nbfcs_support_mails",
};

// Tables the portal writes to / reads analytics from
const OUTPUT_TABLES = {
  LOGIN_LOGS: "student_login_logs",
  EVENT_LOGS: "student_event_logs",
  FEEDBACK: "student_feedback",
};

function getBigQueryClient() {
  if (bqInstance) return bqInstance;

  const projectId = process.env.BIGQUERY_PROJECT_ID;
  const clientEmail = process.env.BIGQUERY_CLIENT_EMAIL;
  const rawKey = process.env.BIGQUERY_PRIVATE_KEY;

  if (!projectId || !clientEmail || !rawKey) {
    throw new Error(
      "BigQuery is not configured. Set BIGQUERY_PROJECT_ID, BIGQUERY_CLIENT_EMAIL and BIGQUERY_PRIVATE_KEY."
    );
  }

  // Key may be stored with literal \n (single-line env) or real newlines
  let privateKey = rawKey.replace(/^["']|["']$/g, "");
  if (privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  bqInstance = new BigQuery({
    projectId,
    credentials: { client_email: clientEmail, private_key: privateKey },
  });

  return bqInstance;
}

function inputDataset() {
  return process.env.BIGQUERY_DATASET || "academy_payments_portal_data";
}

function outputDataset() {
  return process.env.BIGQUERY_OUTPUT_DATASET || "academy_payments_portal_output_data";
}

function qualify(dataset, table) {
  return `\`${process.env.BIGQUERY_PROJECT_ID}.${dataset}.${table}\``;
}

// BigQuery returns DATE/DATETIME/TIMESTAMP as { value: "..." }
function unwrap(value) {
  if (value && typeof value === "object" && "value" in value) return value.value;
  return value;
}

function normalizeRow(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = unwrap(value);
  }
  return out;
}

async function runQuery(query, params = {}) {
  const client = getBigQueryClient();
  const [rows] = await client.query({ query, params });
  return rows.map(normalizeRow);
}

async function queryByUserId(dataset, table, userId) {
  return runQuery(
    `SELECT * FROM ${qualify(dataset, table)} WHERE LOWER(user_id) = LOWER(@userId)`,
    { userId: userId.trim() }
  );
}

// ---------- Reads ----------

// The pilot whitelist: only these users may access the portal
async function isUserAllowed(userId) {
  const rows = await runQuery(
    `SELECT user_id FROM ${qualify(inputDataset(), TABLES.USER_LIST)}
     WHERE LOWER(user_id) = LOWER(@userId) LIMIT 1`,
    { userId: userId.trim() }
  );
  return rows.length > 0;
}

async function getUserFeeDetails(userId) {
  const rows = await queryByUserId(inputDataset(), TABLES.USER_FEE_DETAILS, userId);
  return rows[0] || null;
}

async function getApplicationDetails(userId) {
  return queryByUserId(inputDataset(), TABLES.APPLICATION_DETAILS, userId);
}

async function getFlexPaymentLogs(userId) {
  return runQuery(
    `SELECT * FROM ${qualify(inputDataset(), TABLES.FLEX_PAYMENT_LOGS)}
     WHERE LOWER(user_id) = LOWER(@userId) ORDER BY paid_datetime DESC`,
    { userId: userId.trim() }
  );
}

async function getCompanyPaymentLogs(userId) {
  return runQuery(
    `SELECT * FROM ${qualify(inputDataset(), TABLES.PAID_TO_COMPANY_LOGS)}
     WHERE LOWER(user_id) = LOWER(@userId) ORDER BY paid_datetime DESC`,
    { userId: userId.trim() }
  );
}

// Support mailboxes rarely change, so keep them in memory after first read
let supportMailsCache = null;
async function getNbfcSupportMails() {
  if (supportMailsCache) return supportMailsCache;
  supportMailsCache = await runQuery(
    `SELECT nbfc, support_mail FROM ${qualify(inputDataset(), TABLES.NBFC_SUPPORT_MAILS)}`
  );
  return supportMailsCache;
}

async function searchUsers(query, limit = 20) {
  return runQuery(
    `SELECT user_id, first_name, program_name, total_fee_payble,
            total_amount_covered, remaining_amount_to_pay
     FROM ${qualify(inputDataset(), TABLES.USER_FEE_DETAILS)}
     WHERE LOWER(user_id) LIKE LOWER(@pattern)
        OR LOWER(first_name) LIKE LOWER(@pattern)
     LIMIT @limit`,
    { pattern: `%${query.trim()}%`, limit }
  );
}

async function getAllUserFeeDetails() {
  return runQuery(`SELECT * FROM ${qualify(inputDataset(), TABLES.USER_FEE_DETAILS)}`);
}

// Login history is a view over the platform's SSO access log — read only.
// Names live in the fee details view, so join to label each login.
async function getLoginTotals() {
  const rows = await runQuery(
    `SELECT COUNT(*) AS total_logins, COUNT(DISTINCT user_id) AS unique_students
     FROM ${qualify(outputDataset(), OUTPUT_TABLES.LOGIN_LOGS)}`
  );
  return rows[0] || { total_logins: 0, unique_students: 0 };
}

async function getRecentLogins(limit = 50) {
  return runQuery(
    `SELECT l.user_id, f.first_name AS name, f.program_name AS programme, l.login_datetime
     FROM ${qualify(outputDataset(), OUTPUT_TABLES.LOGIN_LOGS)} l
     LEFT JOIN ${qualify(inputDataset(), TABLES.USER_FEE_DETAILS)} f USING (user_id)
     ORDER BY l.login_datetime DESC
     LIMIT @limit`,
    { limit }
  );
}

async function getEventStats() {
  const rows = await runQuery(
    `SELECT
       COUNTIF(event_name = 'fee_page_viewed')        AS fee_page_viewed,
       COUNTIF(event_name = 'payment_summary_viewed') AS payment_summary_viewed,
       COUNTIF(event_name = 'covered_amount_viewed')  AS covered_amount_viewed,
       COUNTIF(event_name = 'emi_details_viewed')     AS emi_details_viewed,
       COUNTIF(event_name = 'clicked_payment_history') AS clicked_payment_history,
       COUNTIF(event_name = 'clicked_contact_jodo')   AS clicked_contact_jodo,
       COUNTIF(event_name = 'clicked_contact_nbfc')   AS clicked_contact_nbfc,
       COUNTIF(event_name = 'clicked_chat_support')   AS clicked_chat_support,
       COUNTIF(event_name = 'feedback_opened')        AS feedback_opened,
       COUNTIF(event_name = 'feedback_abandoned')     AS feedback_abandoned,
       COUNTIF(event_name = 'feedback_submitted')     AS feedback_submitted,
       AVG(IF(event_name = 'time_spent',
              SAFE_CAST(JSON_VALUE(event_data, '$.seconds') AS FLOAT64), NULL))    AS avg_time_spent,
       AVG(IF(event_name = 'scroll_depth',
              SAFE_CAST(JSON_VALUE(event_data, '$.maxPercent') AS FLOAT64), NULL)) AS avg_scroll_depth
     FROM ${qualify(outputDataset(), OUTPUT_TABLES.EVENT_LOGS)}`
  );
  return rows[0] || null;
}

async function getFeedbackEntries(limit = 1000) {
  return runQuery(
    `SELECT user_id, student_name, programme, rating, selected_options, comments, submitted_at
     FROM ${qualify(outputDataset(), OUTPUT_TABLES.FEEDBACK)}
     ORDER BY submitted_at DESC LIMIT @limit`,
    { limit }
  );
}

// ---------- Writes ----------

async function insertRows(table, rows) {
  const client = getBigQueryClient();
  await client.dataset(outputDataset()).table(table).insert(rows);
}

// Fire-and-forget: analytics must never break a user request
async function appendEventLog({ userId, name, programme, eventName, eventData }) {
  try {
    await insertRows(OUTPUT_TABLES.EVENT_LOGS, [
      {
        user_id: userId,
        student_name: name || "",
        programme: programme || "",
        event_name: eventName,
        event_data: eventData ? JSON.stringify(eventData) : null,
        event_at: new Date().toISOString(),
      },
    ]);
  } catch (error) {
    console.error("[BigQuery] Failed to log event:", error.message);
  }
}

async function appendFeedback({ userId, name, programme, rating, selectedOptions, comments }) {
  try {
    await insertRows(OUTPUT_TABLES.FEEDBACK, [
      {
        user_id: userId,
        student_name: name || "",
        programme: programme || "",
        rating,
        selected_options: (selectedOptions || []).join(", "),
        comments: comments || "",
        submitted_at: new Date().toISOString(),
      },
    ]);
    console.log("[BigQuery] Feedback recorded:", userId, rating);
  } catch (error) {
    console.error("[BigQuery] Failed to record feedback:", error.message);
  }
}

module.exports = {
  getBigQueryClient,
  runQuery,
  isUserAllowed,
  getUserFeeDetails,
  getApplicationDetails,
  getFlexPaymentLogs,
  getCompanyPaymentLogs,
  getNbfcSupportMails,
  searchUsers,
  getAllUserFeeDetails,
  getLoginTotals,
  getRecentLogins,
  getEventStats,
  getFeedbackEntries,
  appendEventLog,
  appendFeedback,
  TABLES,
  OUTPUT_TABLES,
};
