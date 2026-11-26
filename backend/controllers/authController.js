const jwt = require("jsonwebtoken");
const { getUserFeeDetails, isUserAllowed } = require("../config/bigquery");
const { recordLogin } = require("../config/analyticsDb");

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

// Fire-and-forget login record for admin analytics (Neon)
function logLogin(student, method) {
  recordLogin({
    userId: student.user_id,
    name: student.first_name,
    programme: student.program_name,
    method,
  });
}

function toStudentPayload(student) {
  return {
    userId: student.user_id,
    name: student.first_name,
    programme: student.program_name,
    productCode: student.product_code,
  };
}

// Student must be on the BigQuery pilot list AND have a fee details row.
// Otherwise SSO shows the pilot notice instead of an empty payment page.
async function findEligibleStudent(userId) {
  if (!userId || !String(userId).trim()) return null;
  const [allowed, feeDetails] = await Promise.all([
    isUserAllowed(userId),
    getUserFeeDetails(userId),
  ]);
  return allowed && feeDetails ? feeDetails : null;
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

    logLogin(student, "direct");

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
  logLogin,
};
