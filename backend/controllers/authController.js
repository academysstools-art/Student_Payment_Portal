const jwt = require("jsonwebtoken");
const { getUserFeeDetails } = require("../config/bigquery");

function issueSession(student) {
  return jwt.sign(
    {
      userId: student.user_id,
      name: student.first_name,
      programme: student.program_name,
      type: "student_session",
    },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );
}

function toStudentPayload(student) {
  return {
    userId: student.user_id,
    name: student.first_name,
    programme: student.program_name,
    productCode: student.product_code,
  };
}

// Student must exist in BigQuery fee details. Otherwise SSO falls back to the
// standard "open through your NxtWave account" gate — no empty payment page.
async function findEligibleStudent(userId) {
  if (!userId || !String(userId).trim()) return null;
  const feeDetails = await getUserFeeDetails(userId);
  return feeDetails || null;
}

async function loginWithUserId(req, res) {
  try {
    if (process.env.ALLOW_DIRECT_USER_ID_LOGIN !== "true") {
      return res.status(403).json({
        error: "Direct user ID login is disabled",
        message: "Please authenticate through SSO",
      });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const student = await findEligibleStudent(userId);

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json({
      token: issueSession(student),
      student: toStudentPayload(student),
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ error: "Login failed" });
  }
}

module.exports = {
  loginWithUserId,
  findEligibleStudent,
  issueSession,
  toStudentPayload,
};
