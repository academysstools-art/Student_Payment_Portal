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

// Read-only: logins, events and feedback are stored in Neon (config/analyticsDb.js)
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
  TABLES,
};
