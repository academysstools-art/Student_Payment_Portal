const jwt = require("jsonwebtoken");
const {
  getSheetData,
  getStudentFromSheet,
  getStudentRowsFromSheet,
  SHEET_NAMES,
} = require("../config/googleSheets");
const { loginLogs } = require("./authController");

// Hardcoded admin credentials
const ADMIN_EMAIL = "admin@nxtwave.in";
const ADMIN_PASSWORD = "payments@status";

// In-memory feedback store
const feedbackList = [];

async function adminLogin(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Invalid admin credentials" });
    }

    const token = jwt.sign(
      { role: "admin", email: ADMIN_EMAIL },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      admin: { role: "admin", email: ADMIN_EMAIL },
    });
  } catch (error) {
    console.error("Admin login error:", error.message);
    res.status(500).json({ error: "Login failed" });
  }
}

async function getAnalytics(req, res) {
  try {
    // Read persistent login logs from sheet
    let logs = [];
    try {
      const sheetLogs = await getSheetData(SHEET_NAMES.LOGIN_LOGS);
      logs = (sheetLogs || []).map((row) => ({
        userId: row["UID"] || "",
        name: row["Student Name"] || "",
        programme: row["Programme"] || "",
        method: row["Login Method"] || "direct",
        timestamp: row["Timestamp"] || "",
      }));
    } catch (err) {
      // Fall back to in-memory if sheet read fails
      console.error("Failed to read login logs sheet, using in-memory:", err.message);
      logs = loginLogs;
    }

    const uniqueStudents = [...new Set(logs.map((l) => l.userId))];
    res.json({
      totalLogins: logs.length,
      uniqueStudents: uniqueStudents.length,
      recentLogins: logs.slice(-50).reverse(),
    });
  } catch (error) {
    console.error("Analytics error:", error.message);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
}

async function searchStudents(req, res) {
  try {
    const query = (req.query.q || "").trim().toLowerCase();
    if (!query) {
      return res.json([]);
    }

    const [basicData, feeData] = await Promise.all([
      getSheetData(SHEET_NAMES.USER_BASIC_DETAILS),
      getSheetData(SHEET_NAMES.USER_FEE_DETAILS),
    ]);

    // Index fee data by UID for fast lookup
    const feeByUid = {};
    for (const row of feeData) {
      if (row["UID"]) feeByUid[row["UID"].trim().toLowerCase()] = row;
    }

    const results = basicData
      .filter((row) => {
        const uid = (row["UID"] || "").toLowerCase();
        return uid.includes(query);
      })
      .slice(0, 20)
      .map((row) => {
        const fee = feeByUid[(row["UID"] || "").trim().toLowerCase()] || {};
        return {
          userId: row["UID"],
          name: row["Student Name"],
          programme: row["Programme"],
          totalFeePayable: fee["Total Fee Payble"] || "",
          totalAmountCovered: fee["Total Amount Covered"] || "",
          remainingAmountToPay: fee["Remaining Amount to Pay"] || "",
        };
      });

    res.json(results);
  } catch (error) {
    console.error("Search error:", error.message);
    res.status(500).json({ error: "Search failed" });
  }
}

async function getStudentDetails(req, res) {
  try {
    const { userId } = req.params;

    const [basicDetails, feeDetails, nbfcRows, companyLogs, flexLogs] = await Promise.all([
      getStudentFromSheet(SHEET_NAMES.USER_BASIC_DETAILS, userId),
      getStudentFromSheet(SHEET_NAMES.USER_FEE_DETAILS, userId),
      getStudentRowsFromSheet(SHEET_NAMES.NBFC_DISBURSED_DETAILS, userId),
      getStudentRowsFromSheet(SHEET_NAMES.PAYMENT_TO_COMPANY_LOGS, userId),
      getStudentRowsFromSheet(SHEET_NAMES.FLEX_PAYMENT_LOGS, userId),
    ]);

    if (!basicDetails) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json({
      userId: basicDetails["UID"],
      name: basicDetails["Student Name"],
      programme: basicDetails["Programme"],
      productCode: basicDetails["Product code"],
      lpoad: basicDetails["LPOAD"],
      totalProgrammeFee: feeDetails?.["Total Programme Fee"] || "",
      discountApplied: feeDetails?.["Discount Applied"] || "",
      totalFeePayable: feeDetails?.["Total Fee Payble"] || "",
      amountPaidInFlex: feeDetails?.["Amount Paid in Jodo Flex"] || "",
      amountPaidToNxtWave: feeDetails?.["Amount Paid to NxtWave"] || "",
      nbfcLoanAmountCovered: feeDetails?.["Nbfc Loan Amount Covered"] || "",
      totalAmountCovered: feeDetails?.["Total Amount Covered"] || "",
      remainingAmountToPay: feeDetails?.["Remaining Amount to Pay"] || "",
      nbfcRows: (nbfcRows || []).map((r) => ({
        nbfcName: r["NBFC Name"],
        loanAmount: r["Loan Amount"],
        tenure: r["Tenure (Start Month and End Month)"],
        emiAmount: r["EMI Amount"],
        status: r["Status"],
        dueDate: r["Due Date (Tenure end Month + 1Month)"],
      })),
      companyLogs: (companyLogs || []).map((r) => ({
        paidDate: r["Paid Date"],
        paidAmount: r["Paid Amount"],
        paymentStatus: r["Payment Status"],
      })),
      flexLogs: (flexLogs || []).map((r) => ({
        paidDate: r["Paid Date"],
        paidAmount: r["Paid Amount"],
        paymentStatus: r["Payment Status"],
        paymentMode: r["Payment Mode"],
      })),
    });
  } catch (error) {
    console.error("Student details error:", error.message);
    res.status(500).json({ error: "Failed to fetch student details" });
  }
}

function getFeedback(req, res) {
  res.json(feedbackList.slice().reverse());
}

function submitFeedback(req, res) {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const entry = {
      id: Date.now().toString(),
      userId: req.user.userId,
      name: req.user.name,
      message: message.trim(),
      timestamp: new Date().toISOString(),
    };

    feedbackList.push(entry);
    res.json({ success: true, feedback: entry });
  } catch (error) {
    console.error("Feedback error:", error.message);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
}

async function exportCSV(req, res) {
  try {
    const [basicData, feeData] = await Promise.all([
      getSheetData(SHEET_NAMES.USER_BASIC_DETAILS),
      getSheetData(SHEET_NAMES.USER_FEE_DETAILS),
    ]);

    // Index fee data by UID
    const feeByUid = {};
    for (const row of feeData) {
      if (row["UID"]) feeByUid[row["UID"].trim().toLowerCase()] = row;
    }

    // Merge basic + fee
    const allData = basicData.map((basic) => {
      const fee = feeByUid[(basic["UID"] || "").trim().toLowerCase()] || {};
      return { ...basic, ...fee };
    });

    if (allData.length === 0) {
      return res.status(404).json({ error: "No data found" });
    }

    const headers = Object.keys(allData[0]);
    const csvRows = [headers.join(",")];

    for (const row of allData) {
      const values = headers.map((h) => {
        const val = (row[h] || "").replace(/"/g, '""');
        return `"${val}"`;
      });
      csvRows.push(values.join(","));
    }

    const csv = csvRows.join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=student_data.csv");
    res.send(csv);
  } catch (error) {
    console.error("Export error:", error.message);
    res.status(500).json({ error: "Failed to export data" });
  }
}

module.exports = {
  adminLogin,
  getAnalytics,
  searchStudents,
  getStudentDetails,
  getFeedback,
  submitFeedback,
  exportCSV,
  feedbackList,
};
