const jwt = require("jsonwebtoken");
const { getStudentFromSheet, SHEET_NAMES } = require("../config/googleSheets");
const { loginLogs } = require("./authController");

// Called BY Forms backend (server-to-server)
async function generateToken(req, res) {
  try {
    const authKey = req.headers["x-sso-auth-key"];
    if (!authKey || authKey !== process.env.SSO_AUTH_KEY) {
      return res.status(401).json({ error: "Invalid SSO auth key" });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const student = await getStudentFromSheet(SHEET_NAMES.USER_BASIC_DETAILS, userId);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Check 2025+ cohort
    const lpoad = student["LPOAD"];
    if (lpoad) {
      const onboardingYear = new Date(lpoad).getFullYear();
      if (onboardingYear < 2025) {
        return res.status(403).json({
          error: "Payment portal is only available for students onboarded from 2025 onwards",
        });
      }
    }

    // Short-lived token (5 minutes) for SSO handoff
    const token = jwt.sign(
      { userId: student["UID"], type: "sso_handoff" },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );

    res.json({ token });
  } catch (error) {
    console.error("SSO generate-token error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Called by our frontend to exchange short-lived token for session JWT
async function validateToken(req, res) {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    if (decoded.type !== "sso_handoff") {
      return res.status(401).json({ error: "Invalid token type" });
    }

    const student = await getStudentFromSheet(SHEET_NAMES.USER_BASIC_DETAILS, decoded.userId);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Create full 24h session JWT
    const sessionToken = jwt.sign(
      {
        userId: student["UID"],
        name: student["Student Name"],
        programme: student["Programme"],
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Track login
    loginLogs.push({
      userId: student["UID"],
      name: student["Student Name"],
      programme: student["Programme"],
      timestamp: new Date().toISOString(),
    });

    res.json({
      token: sessionToken,
      student: {
        userId: student["UID"],
        name: student["Student Name"],
        programme: student["Programme"],
        productCode: student["Product code"],
      },
    });
  } catch (error) {
    console.error("SSO validate-token error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = { generateToken, validateToken };
