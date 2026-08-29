const jwt = require("jsonwebtoken");
const {
  findEligibleStudent,
  issueSession,
  toStudentPayload,
} = require("./authController");
const { saveAuthToken, consumeAuthToken, peekAuthToken } = require("../config/postgres");

const DEFAULT_FRONTEND_URL = "https://fee-details.nxtwave.academy";
const DEFAULT_SSO_LOGIN_URL = "https://meetings.ccbp.in/mid/fee-details";
const HANDOFF_TTL_SECONDS = 5 * 60;
const ALLOWED_FRONTEND_ORIGINS = new Set([
  "https://fee-details.nxtwave.academy",
  "https://payment-portal-academy.replit.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);
const ALLOWED_SSO_DESTINATIONS = new Set([
  "https://meetings.ccbp.in/mid/fee-details",
  "https://forms.ccbp.in/mid/fee-details",
]);

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
}

function frontendOrigin() {
  const destination = new URL(process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL);
  if (
    destination.username ||
    destination.password ||
    destination.search ||
    destination.hash ||
    destination.pathname !== "/" ||
    !ALLOWED_FRONTEND_ORIGINS.has(destination.origin)
  ) {
    throw new Error("FRONTEND_URL is not an allowed payment portal origin");
  }
  return destination.origin;
}

function ssoLoginUrl() {
  const destination = new URL(
    process.env.SSO_LOGIN_URL ||
      process.env.VITE_SSO_LOGIN_URL ||
      DEFAULT_SSO_LOGIN_URL
  );
  const destinationWithoutQuery = `${destination.origin}${destination.pathname.replace(/\/+$/, "")}`;
  if (
    destination.protocol !== "https:" ||
    destination.username ||
    destination.password ||
    destination.hash ||
    !ALLOWED_SSO_DESTINATIONS.has(destinationWithoutQuery)
  ) {
    throw new Error("SSO login URL is not an allowed NxtWave destination");
  }
  return destination;
}

function startLogin(req, res) {
  try {
    const destination = ssoLoginUrl();
    return res.redirect(302, destination.toString());
  } catch (error) {
    console.error("[SSO] Invalid login URL configuration:", error.message);
    return res.status(500).json({
      error: "SSO login is not configured correctly",
    });
  }
}

// Forms sends the authenticated student's user_id after phone/OTP login.
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
    nested.id
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

function signHandoffToken(userId) {
  return jwt.sign(
    { userId, type: "sso_handoff" },
    process.env.JWT_SECRET,
    { expiresIn: HANDOFF_TTL_SECONDS }
  );
}

function handoffExpiry(token) {
  const { exp } = jwt.decode(token) || {};
  const seconds = exp || Math.floor(Date.now() / 1000) + HANDOFF_TTL_SECONDS;
  return new Date(seconds * 1000).toISOString();
}

/**
 * Step 2 — Forms calls this after SSO login with { user_id }.
 * We mint a short-lived token, store token→user_id in Neon, return redirect_url.
 */
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

    // Prefer the canonical BigQuery user_id when the student exists.
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

    const redirect_url = `${frontendOrigin()}/sso?token=${encodeURIComponent(token)}`;

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

/**
 * Steps 3–5 — Frontend /sso exchanges the handoff token:
 * Neon lookup → user_id → BigQuery student → 24h session JWT.
 */
async function validateToken(req, res) {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    if (decoded.type !== "sso_handoff" || !decoded.userId) {
      return res.status(401).json({ error: "Invalid token type" });
    }

    let peeked;
    try {
      peeked = await peekAuthToken(token);
    } catch (dbError) {
      console.error("[SSO] Postgres token lookup failed:", dbError.message);
      return res.status(503).json({
        error: "Authentication service unavailable",
        message: "Unable to validate the one-time token",
      });
    }

    if (
      !peeked ||
      peeked.user_id !== decoded.userId ||
      new Date(peeked.expires_at).getTime() <= Date.now()
    ) {
      return res.status(401).json({
        error: "Invalid, expired, or already used token",
      });
    }

    // Token is valid — check fee dataset before consuming so missing students
    // can refresh and still see the "not in dataset" message.
    const student = await findEligibleStudent(peeked.user_id);
    if (!student) {
      return res.status(404).json({
        error: "Student not found",
        code: "USER_NOT_IN_DATASET",
        message:
          "The fee details portal is currently in a pilot phase, but we'll notify you as soon as it's ready for you — thank you for your patience!",
      });
    }

    let stored;
    try {
      stored = await consumeAuthToken(token);
      // Concurrent remount may race the first consume.
      // If the token was just used for the same user_id, allow this request.
      if (!stored && peeked.used === true) {
        stored = { user_id: peeked.user_id, expires_at: peeked.expires_at };
      } else if (!stored) {
        const again = await peekAuthToken(token);
        if (
          again &&
          again.used === true &&
          again.user_id === decoded.userId &&
          new Date(again.expires_at).getTime() > Date.now()
        ) {
          stored = { user_id: again.user_id, expires_at: again.expires_at };
        }
      }
    } catch (dbError) {
      console.error("[SSO] Postgres token consume failed:", dbError.message);
      return res.status(503).json({
        error: "Authentication service unavailable",
        message: "Unable to validate the one-time token",
      });
    }

    if (!stored || stored.user_id !== decoded.userId) {
      return res.status(401).json({
        error: "Invalid, expired, or already used token",
      });
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

// Compatibility: only forward an already-issued handoff token to the SPA.
async function ssoCallback(req, res) {
  try {
    const frontendUrl = frontendOrigin();
    const token = firstNonEmpty(
      req.query.token,
      req.query.auth_token,
      req.query.authToken
    );

    if (!token) {
      return res.redirect(`${frontendUrl}/sso?error=missing_token`);
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type !== "sso_handoff") {
        return res.redirect(`${frontendUrl}/sso?error=invalid_token`);
      }
    } catch {
      return res.redirect(`${frontendUrl}/sso?error=invalid_token`);
    }

    res.redirect(`${frontendUrl}/sso?token=${encodeURIComponent(token)}`);
  } catch (error) {
    console.error("SSO callback error:", error.message);
    try {
      return res.redirect(`${frontendOrigin()}/sso?error=server_error`);
    } catch {
      return res.status(500).json({ error: "SSO callback is not configured correctly" });
    }
  }
}

module.exports = { startLogin, generateToken, validateToken, ssoCallback };
