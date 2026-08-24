const jwt = require("jsonwebtoken");
const {
  findEligibleStudent,
  issueSession,
  toStudentPayload,
} = require("./authController");
const { saveAuthToken, consumeAuthToken } = require("../config/postgres");

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
}

// Forms may send user_id, nested user objects, or phone after OTP.
function resolveUserIdFromFormsBody(body = {}) {
  const nested = body.user || body.data || body.payload || {};
  return firstNonEmpty(
    body.user_id,
    body.userId,
    body.uid,
    body.UID,
    nested.user_id,
    nested.userId,
    nested.uid,
    nested.id,
    body.phone,
    body.mobile,
    body.phone_number,
    body.mobile_number,
    nested.phone,
    nested.mobile
  );
}

function readClientAuthKey(req) {
  const headers = req.headers || {};
  const authorization =
    typeof headers.authorization === "string" ? headers.authorization.trim() : "";
  const bearer = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";
  return firstNonEmpty(
    headers["x-sso-auth-key"],
    headers["x-api-key"],
    headers["x-auth-key"],
    headers["x-client-backend-auth-key"],
    headers["client-backend-auth-key"],
    bearer,
    authorization
  );
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

// Called BY Forms backend (server-to-server).
// Mint a handoff token from whatever identifier Forms already authenticated
// (usually user_id after phone OTP). Do not block token issue on BigQuery
// whitelist here — Forms treats 4xx as CLIENT_BACKEND_TOKEN_FETCH_FAILED.
async function generateToken(req, res) {
  try {
    const authKey = readClientAuthKey(req);
    const secret = process.env.SSO_AUTH_KEY || process.env.TOKEN_SECRET;
    if (!secret || authKey !== secret) {
      return res.status(401).json({
        error: "Invalid SSO authentication",
        message: "Unauthorized",
      });
    }

    const userId = resolveUserIdFromFormsBody(req.body);
    if (!userId) {
      return res.status(400).json({
        error: "User ID is required",
        message: "user_id is required",
        hint: "Send JSON with user_id or userId",
      });
    }

    console.log("[SSO] generate-auth-code body keys:", Object.keys(req.body || {}));

    const student = await findEligibleStudent(userId);
    const tokenUserId = student?.user_id || userId;
    const token = signHandoffToken(tokenUserId);
    const expiresAt = handoffExpiry(token);

    try {
      await saveAuthToken({ token, userId: tokenUserId, expiresAt });
    } catch (dbError) {
      console.error("[SSO] Failed to store auth token in Postgres:", dbError.message);
      return res.status(500).json({
        error: "Internal server error",
        message: "Failed to store authentication token",
      });
    }

    const frontendUrl = (
      process.env.FRONTEND_URL || "https://fee-details.nxtwave.academy"
    ).replace(/\/+$/, "");
    const redirect_url = `${frontendUrl}/sso?token=${encodeURIComponent(token)}`;

    return res.json({
      auth_token: token,
      token,
      expires_at: expiresAt,
      token_type: "sso_handoff_jwt",
      redirect_url,
      user_id: tokenUserId,
    });
  } catch (error) {
    console.error("SSO generate-token error:", error.message);
    res.status(500).json({ error: "Internal server error", message: "Server error" });
  }
}

// Called by our frontend to exchange short-lived token for session JWT
async function validateToken(req, res) {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    let userId = null;
    try {
      const stored = await consumeAuthToken(token);
      if (stored) userId = stored.user_id;
    } catch (dbError) {
      console.error("[SSO] Postgres token lookup failed:", dbError.message);
    }

    if (!userId) {
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }
      if (decoded.type !== "sso_handoff") {
        return res.status(401).json({ error: "Invalid token type" });
      }
      userId = decoded.userId;
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
    console.error("SSO validate-token error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Browser redirect callback — SSO system redirects here with user_id in query
async function ssoCallback(req, res) {
  const frontendUrl = (
    process.env.FRONTEND_URL || "https://fee-details.nxtwave.academy"
  ).replace(/\/+$/, "");

  try {
    const userId = firstNonEmpty(
      req.query.user_id,
      req.query.userId,
      req.query.uid
    );

    if (!userId) {
      return res.redirect(`${frontendUrl}/sso?error=missing_user_id`);
    }

    const student = await findEligibleStudent(userId);
    const tokenUserId = student?.user_id || userId;
    const token = signHandoffToken(tokenUserId);
    try {
      await saveAuthToken({
        token,
        userId: tokenUserId,
        expiresAt: handoffExpiry(token),
      });
    } catch (dbError) {
      console.error("[SSO] Failed to store callback token:", dbError.message);
    }
    res.redirect(
      `${frontendUrl}/sso?token=${encodeURIComponent(token)}`
    );
  } catch (error) {
    console.error("SSO callback error:", error.message);
    return res.redirect(`${frontendUrl}/sso?error=server_error`);
  }
}

module.exports = { generateToken, validateToken, ssoCallback };
