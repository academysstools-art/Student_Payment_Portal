const { google } = require("googleapis");

let sheetsInstance = null;

function getGoogleSheetsClient() {
  if (sheetsInstance) return sheetsInstance;

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  sheetsInstance = google.sheets({ version: "v4", auth });
  return sheetsInstance;
}

async function getSheetData() {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEET_NAME || "Sheet1";

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}`,
  });

  const rows = response.data.values;
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
