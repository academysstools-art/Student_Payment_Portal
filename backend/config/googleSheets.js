const { google } = require("googleapis");

let sheetsInstance = null;

const SHEET_NAMES = {
  USER_BASIC_DETAILS: "Users Basic Details",
  USER_FEE_DETAILS: "User Fee Details",
  PAYMENT_TO_COMPANY_LOGS: "Payment to Company logs",
  FLEX_PAYMENT_LOGS: "Flex Payment logs",
  NBFC_DISBURSED_DETAILS: "NBFC Disbursed details",
  NBFC_SUPPORT_CONTACTS: "NBFC Support Contacts",
};

function getGoogleSheetsClient() {
  if (sheetsInstance) return sheetsInstance;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;

  console.log("[Sheets] Service account email:", email);
  console.log("[Sheets] Private key starts with:", rawKey ? rawKey.substring(0, 30) + "..." : "MISSING");
  console.log("[Sheets] Private key length:", rawKey ? rawKey.length : 0);

  // Handle private key: Vercel may store \n as literal or actual newlines
  let privateKey = rawKey;
  if (privateKey) {
    if (!privateKey.includes("\n") || privateKey.includes("\\n")) {
      privateKey = privateKey.replace(/\\n/g, "\n");
    }
    privateKey = privateKey.replace(/^["']|["']$/g, "");
  }
  console.log("[Sheets] Private key has real newlines:", privateKey ? privateKey.includes("\n") : false);
  console.log("[Sheets] Private key starts correct:", privateKey ? privateKey.startsWith("-----BEGIN") : false);

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  sheetsInstance = google.sheets({ version: "v4", auth });
  return sheetsInstance;
}

async function getSheetData(sheetName) {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const targetSheet = (sheetName || process.env.GOOGLE_SHEET_NAME || "Sheet1").trim();

  console.log("[Sheets] Spreadsheet ID:", spreadsheetId);
  console.log("[Sheets] Sheet name:", JSON.stringify(targetSheet));

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${targetSheet}'`,
    });

    const rows = response.data.values;
    console.log("[Sheets] Rows fetched:", rows ? rows.length : 0);
    if (!rows || rows.length === 0) return [];

    const headers = rows[0];
    const data = rows.slice(1).map((row) => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header.trim()] = row[i] || "";
      });
      return obj;
    });

    return data;
  } catch (err) {
    console.error("[Sheets] API error:", err.message);
    console.error("[Sheets] Error code:", err.code);
    console.error("[Sheets] Error details:", JSON.stringify(err.errors || []));
    throw err;
  }
}

// Find single row by UID
async function getStudentFromSheet(sheetName, uid) {
  const data = await getSheetData(sheetName);
  return data.find(
    (row) =>
      row["UID"] &&
      row["UID"].trim().toLowerCase() === uid.trim().toLowerCase()
  );
}

// Find ALL rows matching UID (for log sheets with multiple rows per student)
async function getStudentRowsFromSheet(sheetName, uid) {
  const data = await getSheetData(sheetName);
  return data.filter(
    (row) =>
      row["UID"] &&
      row["UID"].trim().toLowerCase() === uid.trim().toLowerCase()
  );
}

// Backward-compatible wrapper
async function getStudentByUserId(userId) {
  return getStudentFromSheet(SHEET_NAMES.USER_BASIC_DETAILS, userId);
}

module.exports = {
  getSheetData,
  getStudentByUserId,
  getStudentFromSheet,
  getStudentRowsFromSheet,
  SHEET_NAMES,
};
