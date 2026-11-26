const jwt = require("jsonwebtoken");
const {
  getUserFeeDetails,
  getApplicationDetails,
  getFlexPaymentLogs,
  getCompanyPaymentLogs,
  getNbfcSupportMails,
  searchUsers,
  getAllUserFeeDetails,
} = require("../config/bigquery");
const {
  getLoginTotals,
  getRecentLogins,
  getEventStats,
  getFeedbackEntries,
  appendFeedback,
} = require("../config/analyticsDb");
const {
  toNbfcRow,
  toCompanyLog,
  toFlexLog,
  toFeeSummary,
  toNbfcContact,
  groupNbfcApplications,
  hasPayment,
} = require("./paymentController");

// Hardcoded admin credentials
const ADMIN_EMAIL = "admin@nxtwave.in";
const ADMIN_PASSWORD = "payments@status";

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

function toEventStats(stats) {
  if (!stats) return null;
  return {
    totalPageViews: stats.fee_page_viewed || 0,
    avgTimeSpent: Math.round(stats.avg_time_spent || 0),
    avgScrollDepth: Math.round(stats.avg_scroll_depth || 0),
    sectionViews: {
      paymentSummary: stats.payment_summary_viewed || 0,
      coveredAmount: stats.covered_amount_viewed || 0,
      emiDetails: stats.emi_details_viewed || 0,
    },
    actionCounts: {
      paymentHistory: stats.clicked_payment_history || 0,
      contactJodo: stats.clicked_contact_jodo || 0,
      contactNbfc: stats.clicked_contact_nbfc || 0,
      chatSupport: stats.clicked_chat_support || 0,
    },
    feedbackFunnel: {
      opened: stats.feedback_opened || 0,
      abandoned: stats.feedback_abandoned || 0,
      submitted: stats.feedback_submitted || 0,
    },
  };
}

async function getAnalytics(req, res) {
  try {
    const [totals, recent, eventStats] = await Promise.all([
      getLoginTotals(),
      getRecentLogins(50),
      getEventStats().catch((err) => {
        console.error("Event stats unavailable:", err.message);
        return null;
      }),
    ]);

    res.json({
      totalLogins: totals.total_logins || 0,
      uniqueStudents: totals.unique_students || 0,
      recentLogins: recent.map((row) => ({
        userId: row.user_id,
        name: row.name || "",
        programme: row.programme || "",
        method: row.method || "sso",
        timestamp: row.login_datetime,
      })),
      eventStats: toEventStats(eventStats),
    });
  } catch (error) {
    console.error("Analytics error:", error.message);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
}

async function searchStudents(req, res) {
  try {
    const query = (req.query.q || "").trim();
    if (!query) {
      return res.json([]);
    }

    const rows = await searchUsers(query);

    res.json(
      rows.map((row) => ({
        userId: row.user_id,
        name: row.first_name,
        programme: row.program_name,
        totalFeePayable: row.total_fee_payble,
        totalAmountCovered: row.total_amount_covered,
        remainingAmountToPay: row.remaining_amount_to_pay,
      }))
    );
  } catch (error) {
    console.error("Search error:", error.message);
    res.status(500).json({ error: "Search failed" });
  }
}

async function getStudentDetails(req, res) {
  try {
    const { userId } = req.params;

    const [feeDetails, applications, companyLogs, flexLogs, contacts] =
      await Promise.all([
        getUserFeeDetails(userId),
        getApplicationDetails(userId),
        getCompanyPaymentLogs(userId),
        getFlexPaymentLogs(userId),
        getNbfcSupportMails().catch(() => []),
      ]);

    if (!feeDetails) {
      return res.status(404).json({ error: "Student not found" });
    }

    const summary = toFeeSummary(feeDetails);
    const nbfcRows = applications.filter((row) => row.nbfc_name).map(toNbfcRow);
    const mappedCompanyLogs = companyLogs.map(toCompanyLog).filter(hasPayment);
    const mappedFlexLogs = flexLogs.map(toFlexLog).filter(hasPayment);

    res.json({
      userId: feeDetails.user_id,
      name: summary.studentName,
      programme: summary.programme,
      productCode: summary.productCode,
      userType: summary.userType,
      totalProgrammeFee: summary.totalProgrammeFee,
      discountApplied: summary.discountApplied,
      totalFeePayable: summary.totalFeePayable,
      amountPaidInFlex: summary.amountPaidInFlex,
      amountPaidToNxtWave: summary.amountPaidToNxtWave,
      nbfcLoanAmountCovered: summary.nbfcLoanAmountCovered,
      totalAmountCovered: summary.totalAmountCovered,
      remainingAmountToPay: summary.remainingAmountToPay,
      nbfcRows,
      companyLogs: mappedCompanyLogs,
      flexLogs: mappedFlexLogs,
      // Same shapes the student /payments page uses
      portal: {
        student: {
          userId: feeDetails.user_id,
          name: summary.studentName,
          programme: summary.programme,
          productCode: summary.productCode,
        },
        summary,
        nbfcGroups: groupNbfcApplications(applications),
        contacts: contacts.map(toNbfcContact),
        companyLogs: mappedCompanyLogs,
        flexLogs: mappedFlexLogs,
      },
    });
  } catch (error) {
    console.error("Student details error:", error.message);
    res.status(500).json({ error: "Failed to fetch student details" });
  }
}

async function getFeedback(req, res) {
  try {
    const rows = await getFeedbackEntries();

    res.json(
      rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        name: row.student_name,
        programme: row.programme,
        rating: row.rating || 0,
        selectedOptions: row.selected_options || [],
        comments: row.comments || "",
        timestamp: row.submitted_at,
      }))
    );
  } catch (error) {
    console.error("Feedback error:", error.message);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
}

async function submitFeedback(req, res) {
  try {
    const { rating, selectedOptions, comments } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating (1-5) is required" });
    }

    const entry = {
      userId: req.user.userId,
      name: req.user.name,
      programme: req.user.programme || "",
      rating,
      selectedOptions: selectedOptions || [],
      comments: (comments || "").trim(),
    };

    await appendFeedback(entry);

    res.json({ success: true, feedback: { ...entry, timestamp: new Date().toISOString() } });
  } catch (error) {
    console.error("Feedback error:", error.message);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
}

async function exportCSV(req, res) {
  try {
    const rows = await getAllUserFeeDetails();

    if (rows.length === 0) {
      return res.status(404).json({ error: "No data found" });
    }

    const headers = Object.keys(rows[0]);
    const csvRows = [headers.join(",")];

    for (const row of rows) {
      csvRows.push(
        headers
          .map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`)
          .join(",")
      );
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=student_data.csv");
    res.send(csvRows.join("\n"));
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
};
