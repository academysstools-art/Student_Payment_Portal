const jwt = require("jsonwebtoken");
const { getStudentFromSheet, appendLoginLog, SHEET_NAMES } = require("../config/googleSheets");

// In-memory login tracking
const loginLogs = [];

async function loginWithUserId(req, res) {
  try {
    const { userid: userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const student = await getStudentFromSheet(SHEET_NAMES.USER_BASIC_DETAILS, userId);

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const token = jwt.sign(
      {
        userId: student["UID"],
        name: student["Student Name"],
        programme: student["Programme"],
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Track login in-memory + sheet
    loginLogs.push({
      userId: student["UID"],
      name: student["Student Name"],
      programme: student["Programme"],
      method: "direct",
      timestamp: new Date().toISOString(),
    });
    appendLoginLog({
      userId: student["UID"],
      name: student["Student Name"],
      programme: student["Programme"],
      method: "direct",
    });

    res.json({
      token,
      student: {
        userId: student["UID"],
        name: student["Student Name"],
        programme: student["Programme"],
        productCode: student["Product code"],
      },
    });
  } catch (error) {
    console.error("Login error:", error.message, error.stack);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { loginWithUserId, loginLogs };
