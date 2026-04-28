const {
  getStudentFromSheet,
  getStudentRowsFromSheet,
  appendEventLog,
  SHEET_NAMES,
} = require("../config/googleSheets");

async function getPaymentSummary(req, res) {
  try {
    const userId = req.user.userId;

    const [basicDetails, feeDetails] = await Promise.all([
      getStudentFromSheet(SHEET_NAMES.USER_BASIC_DETAILS, userId),
      getStudentFromSheet(SHEET_NAMES.USER_FEE_DETAILS, userId),
    ]);

    if (!basicDetails) {
      return res.status(404).json({ error: "Student data not found" });
    }

    const summary = {
      studentName: basicDetails["Student Name"],
      programme: basicDetails["Programme"],
      productCode: basicDetails["Product code"],
      lpoad: basicDetails["LPOAD"],
      totalProgrammeFee: feeDetails?.["Total Programme Fee"] || "",
      discountApplied: feeDetails?.["Discount Applied"] || "",
      totalFeePayable: feeDetails?.["Total Fee Payble"] || "",
      amountPaidToNxtWave: feeDetails?.["Amount Paid to NxtWave"] || "",
      amountPaidInFlex: feeDetails?.["Amount Paid in Jodo Flex"] || "",
      nbfcLoanAmountCovered: feeDetails?.["Nbfc Loan Amount Covered"] || "",
      totalAmountCovered: feeDetails?.["Total Amount Covered"] || "",
      remainingAmountToPay: feeDetails?.["Remaining Amount to Pay"] || "",
    };

    res.json(summary);
  } catch (error) {
    console.error("Payment summary error:", error.message);
    res.status(500).json({ error: "Failed to fetch payment summary" });
  }
}

async function getNBFCDetails(req, res) {
  try {
    const userId = req.user.userId;
    const rows = await getStudentRowsFromSheet(SHEET_NAMES.NBFC_DISBURSED_DETAILS, userId);

    if (!rows || rows.length === 0) {
      return res.json({ nbfcGroups: [] });
    }

    // Group by NBFC Name
    const grouped = {};
    for (const row of rows) {
      const name = (row["NBFC Name"] || "Unknown").trim();
      if (!grouped[name]) {
        grouped[name] = {
          nbfcName: name,
          totalLoanAmount: 0,
          rows: [],
        };
      }
      grouped[name].totalLoanAmount += parseFloat(row["Loan Amount"]) || 0;
      grouped[name].rows.push({
        loanAmount: row["Loan Amount"],
        tenure: row["Tenure (Start Month and End Month)"],
        emiAmount: row["EMI Amount"],
        status: row["Status"],
        dueDate: row["Due Date (Tenure end Month + 1Month)"],
      });
    }

    res.json({ nbfcGroups: Object.values(grouped) });
  } catch (error) {
    console.error("NBFC details error:", error.message);
    res.status(500).json({ error: "Failed to fetch NBFC details" });
  }
}

async function getCompanyPaymentLogs(req, res) {
  try {
    const userId = req.user.userId;
    const rows = await getStudentRowsFromSheet(SHEET_NAMES.PAYMENT_TO_COMPANY_LOGS, userId);

    const logs = (rows || []).map((row) => ({
      paidDate: row["Paid Date"],
      paidAmount: row["Paid Amount"],
      paymentStatus: row["Payment Status"],
    }));

    res.json({ logs });
  } catch (error) {
    console.error("Company payment logs error:", error.message);
    res.status(500).json({ error: "Failed to fetch company payment logs" });
  }
}

async function getFlexPaymentLogs(req, res) {
  try {
    const userId = req.user.userId;
    const rows = await getStudentRowsFromSheet(SHEET_NAMES.FLEX_PAYMENT_LOGS, userId);

    const logs = (rows || []).map((row) => ({
      paidDate: row["Paid Date"],
      paidAmount: row["Paid Amount"],
      paymentStatus: row["Payment Status"],
      paymentMode: row["Payment Mode"],
    }));

    res.json({ logs });
  } catch (error) {
    console.error("Flex payment logs error:", error.message);
    res.status(500).json({ error: "Failed to fetch flex payment logs" });
  }
}

async function getNBFCAllRows(req, res) {
  try {
    const userId = req.user.userId;
    const rows = await getStudentRowsFromSheet(SHEET_NAMES.NBFC_DISBURSED_DETAILS, userId);

    const details = (rows || []).map((row) => ({
      nbfcName: row["NBFC Name"],
      loanAmount: row["Loan Amount"],
      tenure: row["Tenure (Start Month and End Month)"],
      emiAmount: row["EMI Amount"],
      status: row["Status"],
      dueDate: row["Due Date (Tenure end Month + 1Month)"],
    }));

    res.json({ details });
  } catch (error) {
    console.error("NBFC all rows error:", error.message);
    res.status(500).json({ error: "Failed to fetch NBFC detail rows" });
  }
}

async function getNBFCContacts(req, res) {
  try {
    const { getSheetData } = require("../config/googleSheets");
    const rows = await getSheetData(SHEET_NAMES.NBFC_SUPPORT_CONTACTS);

    // Find columns dynamically (case-insensitive) to handle whitespace/case variations
    const findValue = (row, ...candidates) => {
      const keys = Object.keys(row);
      for (const candidate of candidates) {
        const match = keys.find(k => k.trim().toLowerCase() === candidate.toLowerCase());
        if (match && row[match]) return row[match].trim();
      }
      return "";
    };

    const contacts = (rows || []).map((row) => ({
      nbfcName: findValue(row, "NBFC", "NBFC Name"),
      email: findValue(row, "Main ID", "Mail ID", "Email", "Email ID"),
    }));

    console.log("[NBFC Contacts] Found:", contacts);

    res.json({ contacts });
  } catch (error) {
    console.error("NBFC contacts error:", error.message);
    res.status(500).json({ error: "Failed to fetch NBFC contacts" });
  }
}

const VALID_EVENTS = [
  "fee_page_viewed", "time_spent", "scroll_depth",
  "payment_summary_viewed", "covered_amount_viewed", "emi_details_viewed",
  "clicked_payment_history", "clicked_contact_jodo", "clicked_contact_nbfc", "clicked_chat_support",
  "feedback_opened", "feedback_abandoned", "feedback_submitted",
];

function trackEvent(req, res) {
  const { eventName, eventData } = req.body;
  if (!eventName || !VALID_EVENTS.includes(eventName)) {
    return res.status(400).json({ error: "Invalid event name" });
  }

  // Fire-and-forget — respond immediately, log async
  appendEventLog({
    userId: req.user.userId,
    name: req.user.name,
    programme: req.user.programme || "",
    eventName,
    eventData: eventData || null,
  });

  res.json({ success: true });
}

module.exports = {
  getPaymentSummary,
  getNBFCDetails,
  getCompanyPaymentLogs,
  getFlexPaymentLogs,
  getNBFCAllRows,
  getNBFCContacts,
  trackEvent,
};
