const jwt = require("jsonwebtoken");
const { getStudentFromSheet, appendLoginLog, SHEET_NAMES } = require("../config/googleSheets");
const { loginLogs } = require("./authController");

// Resolve UID from various field names the SSO system might send
function resolveUserId(body) {
  return (
    body.user_id || body.userId || body.uid || body.UID || ""
  ).trim() || null;
}

// Called BY Forms backend (server-to-server)
async function generateToken(req, res) {
  try {
    // Accept auth key via x-sso-auth-key, x-api-key, or Authorization: Bearer
    const bearer =
      typeof req.headers.authorization === "string" &&
      req.headers.authorization.startsWith("Bearer ")
        ? req.headers.authorization.slice(7).trim()
        : "";
    const authKey =
      req.headers["x-sso-auth-key"] ||
      req.headers["x-api-key"] ||
      bearer;
    if (!authKey || authKey !== process.env.SSO_AUTH_KEY) {
      return res.status(401).json({ error: "Invalid SSO auth key" });
    }

    const userId = resolveUserId(req.body);
    if (!userId) {
      return res.status(400).json({
        error: "User ID is required",
        hint: "Send JSON with user_id, userId, or uid",
      });
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

    // Build redirect URL for the SSO system
    const frontendUrl = (process.env.FRONTEND_URL || "").replace(/\/+$/, "");
    const redirect_url = frontendUrl
      ? `${frontendUrl}/sso?token=${token}`
      : undefined;

    res.json({ auth_token: token, token, redirect_url, user_id: userId });
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

    // Track login in-memory + sheet
    loginLogs.push({
      userId: student["UID"],
      name: student["Student Name"],
      programme: student["Programme"],
      method: "sso",
      timestamp: new Date().toISOString(),
    });
    appendLoginLog({
      userId: student["UID"],
      name: student["Student Name"],
      programme: student["Programme"],
      method: "sso",
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

// Browser redirect callback — SSO system redirects here with user_id in query
async function ssoCallback(req, res) {
  try {
    const userId = (
      req.query.user_id || req.query.userId || req.query.uid || ""
    ).trim();

    const frontendUrl = (process.env.FRONTEND_URL || "").replace(/\/+$/, "");
    if (!frontendUrl) {
      return res.status(500).send("FRONTEND_URL not configured");
    }

    if (!userId) {
      return res.redirect(`${frontendUrl}/sso?error=missing_user_id`);
    }

    const student = await getStudentFromSheet(SHEET_NAMES.USER_BASIC_DETAILS, userId);
    if (!student) {
      return res.redirect(`${frontendUrl}/sso?error=student_not_found`);
    }

    // Check 2025+ cohort
    const lpoad = student["LPOAD"];
    if (lpoad) {
      const onboardingYear = new Date(lpoad).getFullYear();
      if (onboardingYear < 2025) {
        return res.redirect(`${frontendUrl}/sso?error=cohort_restricted`);
      }
    }

    // Generate 5-min handoff token and redirect to frontend
    const token = jwt.sign(
      { userId: student["UID"], type: "sso_handoff" },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );

    res.redirect(`${frontendUrl}/sso?token=${token}`);
  } catch (error) {
    console.error("SSO callback error:", error.message);
    const frontendUrl = (process.env.FRONTEND_URL || "").replace(/\/+$/, "");
    if (frontendUrl) {
      return res.redirect(`${frontendUrl}/sso?error=server_error`);
    }
    res.status(500).send("SSO callback failed");
  }
}

module.exports = { generateToken, validateToken, ssoCallback };
