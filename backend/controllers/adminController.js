const jwt = require("jsonwebtoken");
const { getSheetData, getStudentByUserId } = require("../config/googleSheets");
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
    const uniqueStudents = [...new Set(loginLogs.map((l) => l.userId))];
    res.json({
      totalLogins: loginLogs.length,
      uniqueStudents: uniqueStudents.length,
      recentLogins: loginLogs.slice(-50).reverse(),
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

    const allData = await getSheetData();
    const results = allData
      .filter((row) => {
        const uid = (row["User ID With Hyphens"] || "").toLowerCase();
        return uid.includes(query);
      })
      .slice(0, 20)
      .map((row) => ({
        userId: row["User ID With Hyphens"],
        name: row["Student Name"],
        programme: row["Programme"],
        productStatus: row["product_status"],
        totalFeePayable: row["Total Fee Payble"],
        totalAmountCovered: row["Total Amoubt Covered"],
        remainingAmountToPay: row["Remaining Amount to Pay"],
      }));

    res.json(results);
  } catch (error) {
    console.error("Search error:", error.message);
    res.status(500).json({ error: "Search failed" });
  }
}

async function getStudentDetails(req, res) {
  try {
    const { userId } = req.params;
    const student = await getStudentByUserId(userId);

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json({
      userId: student["User ID With Hyphens"],
      name: student["Student Name"],
      programme: student["Programme"],
      productCode: student["Product code"],
      lpoad: student["LPOAD"],
      paymentPlanType: student["Payment_Plan_Type"],
      productStatus: student["product_status"],
      totalProgrammeFee: student["Total Programme Fee"],
      discountApplied: student["Discount Applied"],
      totalFeePayable: student["Total Fee Payble"],
      amountPaidInFlex: student["Amount Paid in Jodo Flex"],
      amountPaidToNxtWave: student["Amount Paid to NxtWave"],
      nbfcLoanAmountCovered: student["Nbfc Loan Amount Covered"],
      totalAmountCovered: student["Total Amoubt Covered"],
      remainingAmountToPay: student["Remaining Amount to Pay"],
      flexCurrentStatus: student["Flex current status"],
      currentNBFC: student["Current NBFC"],
      currentNBFCStatus: student["Current NBFC Status"],
      nbfc1: {
        name: student["NBFC 1_Name"],
        status: student["NBFC 1_Status"],
        loanAmount: student["NBFC 1_Loan Amount"],
        loanTenure: student["NBFC 1_Loan Tenure"],
        emiAmount: student["NBFC 1_EMI Amount"],
      },
      nbfc2: {
        name: student["NBFC 2_Name"],
        status: student["NBFC 2_Status"],
        loanAmount: student["NBFC 2_Loan Amount"],
        loanTenure: student["NBFC 2_Loan Tenure"],
        emiAmount: student["NBFC 2_EMI Amount"],
      },
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
    const allData = await getSheetData();
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
