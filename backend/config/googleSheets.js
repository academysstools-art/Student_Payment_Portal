const { google } = require("googleapis");

let sheetsInstance = null;

function getGoogleSheetsClient() {
  if (sheetsInstance) return sheetsInstance;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;

  console.log("[Sheets] Service account email:", email);
  console.log("[Sheets] Private key starts with:", rawKey ? rawKey.substring(0, 30) + "..." : "MISSING");
  console.log("[Sheets] Private key length:", rawKey ? rawKey.length : 0);

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: rawKey.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  sheetsInstance = google.sheets({ version: "v4", auth });
  return sheetsInstance;
}

async function getSheetData() {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const sheetName = (process.env.GOOGLE_SHEET_NAME || "Sheet1").trim();

  console.log("[Sheets] Spreadsheet ID:", spreadsheetId);
  console.log("[Sheets] Sheet name:", JSON.stringify(sheetName));

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}`,
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

async function getStudentByUserId(userId) {
  const data = await getSheetData();
  return data.find(
    (row) =>
      row["User ID With Hyphens"] &&
      row["User ID With Hyphens"].trim().toLowerCase() ===
        userId.trim().toLowerCase()
  );
}

module.exports = { getSheetData, getStudentByUserId };
