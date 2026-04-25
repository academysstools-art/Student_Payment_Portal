const {
  getStudentFromSheet,
  getStudentRowsFromSheet,
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

module.exports = {
  getPaymentSummary,
  getNBFCDetails,
  getCompanyPaymentLogs,
  getFlexPaymentLogs,
  getNBFCAllRows,
};
