const {
  getUserFeeDetails,
  getApplicationDetails,
  getFlexPaymentLogs: fetchFlexPaymentLogs,
  getCompanyPaymentLogs: fetchCompanyPaymentLogs,
  getNbfcSupportMails,
  appendEventLog,
} = require("../config/bigquery");
const { formatDate } = require("../utils/format");

// ---------- Row mappers (BigQuery columns -> API shape) ----------

function toNbfcRow(row) {
  return {
    nbfcName: row.nbfc_name,
    loanAmount: row.loan_amount,
    tenure: row.start_and_end_date,
    emiAmount: row.emi_amount,
    status: row.status,
    dueDate: row.due_month,
  };
}

function toCompanyLog(row) {
  return {
    paidDate: formatDate(row.paid_datetime),
    paidAmount: row.payment_amount,
    paymentStatus: row.Payment_status,
  };
}

function toFlexLog(row) {
  return {
    paidDate: formatDate(row.paid_datetime),
    paidAmount: row.amount_paid,
    paymentStatus: row.payment_status,
    paymentMode: row.mode_of_payment,
  };
}

function toFeeSummary(feeDetails) {
  return {
    studentName: feeDetails.first_name,
    programme: feeDetails.program_name,
    productCode: feeDetails.product_code,
    userType: feeDetails.user_type,
    totalProgrammeFee: feeDetails.total_fee,
    discountApplied: feeDetails.total_discount,
    totalFeePayable: feeDetails.total_fee_payble,
    amountPaidToNxtWave: feeDetails.total_amount_paid_to_company,
    amountPaidInFlex: feeDetails.amount_paid_through_monthly_installments,
    nbfcLoanAmountCovered: feeDetails.total_loan_amount_covered,
    totalAmountCovered: feeDetails.total_amount_covered,
    remainingAmountToPay: feeDetails.remaining_amount_to_pay,
  };
}

// ---------- Route handlers ----------

async function getPaymentSummary(req, res) {
  try {
    const feeDetails = await getUserFeeDetails(req.user.userId);

    if (!feeDetails) {
      return res.status(404).json({ error: "Student data not found" });
    }

    res.json(toFeeSummary(feeDetails));
  } catch (error) {
    console.error("Payment summary error:", error.message);
    res.status(500).json({ error: "Failed to fetch payment summary" });
  }
}

async function getNBFCDetails(req, res) {
  try {
    const rows = await getApplicationDetails(req.user.userId);

    const grouped = new Map();
    for (const row of rows) {
      const name = (row.nbfc_name || "Unknown").trim();
      if (!grouped.has(name)) {
        grouped.set(name, { nbfcName: name, totalLoanAmount: 0, rows: [] });
      }
      const group = grouped.get(name);
      group.totalLoanAmount += row.loan_amount || 0;
      group.rows.push(toNbfcRow(row));
    }

    res.json({ nbfcGroups: [...grouped.values()] });
  } catch (error) {
    console.error("NBFC details error:", error.message);
    res.status(500).json({ error: "Failed to fetch NBFC details" });
  }
}

async function getCompanyPaymentLogs(req, res) {
  try {
    const rows = await fetchCompanyPaymentLogs(req.user.userId);
    res.json({ logs: rows.map(toCompanyLog) });
  } catch (error) {
    console.error("Company payment logs error:", error.message);
    res.status(500).json({ error: "Failed to fetch company payment logs" });
  }
}

async function getFlexPaymentLogs(req, res) {
  try {
    const rows = await fetchFlexPaymentLogs(req.user.userId);
    res.json({ logs: rows.map(toFlexLog) });
  } catch (error) {
    console.error("Flex payment logs error:", error.message);
    res.status(500).json({ error: "Failed to fetch flex payment logs" });
  }
}

async function getNBFCAllRows(req, res) {
  try {
    const rows = await getApplicationDetails(req.user.userId);
    res.json({ details: rows.map(toNbfcRow) });
  } catch (error) {
    console.error("NBFC all rows error:", error.message);
    res.status(500).json({ error: "Failed to fetch NBFC detail rows" });
  }
}

async function getNBFCContacts(req, res) {
  try {
    const rows = await getNbfcSupportMails();
    res.json({
      contacts: rows.map((row) => ({
        nbfcName: row.nbfc,
        email: row.support_mail,
      })),
    });
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
  toNbfcRow,
  toCompanyLog,
  toFlexLog,
  toFeeSummary,
};
