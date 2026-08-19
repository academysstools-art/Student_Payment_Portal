const jwt = require("jsonwebtoken");
const { isUserAllowed, getUserFeeDetails } = require("../config/bigquery");

function issueSession(student) {
  return jwt.sign(
    {
      userId: student.user_id,
      name: student.first_name,
      programme: student.program_name,
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

// A student may enter the portal only if they are on the pilot whitelist
// and have fee details available.
async function findEligibleStudent(userId) {
  const [allowed, feeDetails] = await Promise.all([
    isUserAllowed(userId),
    getUserFeeDetails(userId),
  ]);
  if (!allowed || !feeDetails) return null;
  return feeDetails;
}

async function loginWithUserId(req, res) {
  try {
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
