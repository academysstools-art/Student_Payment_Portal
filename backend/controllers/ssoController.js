const jwt = require("jsonwebtoken");
const {
  findEligibleStudent,
  issueSession,
  toStudentPayload,
} = require("./authController");

// Resolve UID from various field names the SSO system might send
function resolveUserId(body) {
  return (
    body.user_id || body.userId || body.uid || body.UID || ""
  ).trim() || null;
}

const HANDOFF_TTL_SECONDS = 5 * 60;

function signHandoffToken(userId) {
  return jwt.sign(
    { userId, type: "sso_handoff" },
    process.env.JWT_SECRET,
    { expiresIn: HANDOFF_TTL_SECONDS }
  );
}

// The caller reads expires_at to know when to stop reusing the token, so derive
// it from the signed exp claim rather than re-deriving the clock.
function handoffExpiry(token) {
  const { exp } = jwt.decode(token) || {};
  const seconds = exp || Math.floor(Date.now() / 1000) + HANDOFF_TTL_SECONDS;
  return new Date(seconds * 1000).toISOString();
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
    const secret = process.env.SSO_AUTH_KEY || process.env.TOKEN_SECRET;
    if (!secret || authKey !== secret) {
      return res.status(401).json({ error: "Invalid SSO authentication" });
    }

    const userId = resolveUserId(req.body);
    if (!userId) {
      return res.status(400).json({
        error: "User ID is required",
        hint: "Send JSON with user_id, userId, or uid",
      });
    }

    const student = await findEligibleStudent(userId);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const token = signHandoffToken(student.user_id);

    // Build redirect URL for the SSO system
    const frontendUrl = (process.env.FRONTEND_URL || "").replace(/\/+$/, "");
    const redirect_url = frontendUrl
      ? `${frontendUrl}/sso?token=${token}`
      : undefined;

    res.json({
      auth_token: token,
      token,
      expires_at: handoffExpiry(token),
      token_type: "sso_handoff_jwt",
      redirect_url,
      user_id: userId,
    });
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

    const student = await findEligibleStudent(decoded.userId);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json({
      token: issueSession(student),
      student: toStudentPayload(student),
    });
  } catch (error) {
    console.error("SSO validate-token error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Browser redirect callback — SSO system redirects here with user_id in query
async function ssoCallback(req, res) {
  const frontendUrl = (process.env.FRONTEND_URL || "").replace(/\/+$/, "");

  try {
    const userId = (
      req.query.user_id || req.query.userId || req.query.uid || ""
    ).trim();

    if (!frontendUrl) {
      return res.status(500).send("FRONTEND_URL not configured");
    }

    if (!userId) {
      return res.redirect(`${frontendUrl}/sso?error=missing_user_id`);
    }

    const student = await findEligibleStudent(userId);
    if (!student) {
      return res.redirect(`${frontendUrl}/sso?error=student_not_found`);
    }

    res.redirect(`${frontendUrl}/sso?token=${signHandoffToken(student.user_id)}`);
  } catch (error) {
    console.error("SSO callback error:", error.message);
    if (frontendUrl) {
      return res.redirect(`${frontendUrl}/sso?error=server_error`);
    }
    res.status(500).send("SSO callback failed");
  }
}

module.exports = { generateToken, validateToken, ssoCallback };
