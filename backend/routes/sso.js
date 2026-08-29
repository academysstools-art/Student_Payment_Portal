const express = require("express");
const router = express.Router();
const {
  startLogin,
  generateToken,
  validateToken,
  ssoCallback,
} = require("../controllers/ssoController");

// GET /api/sso/login — starts the external NxtWave login at runtime.
router.get("/login", startLogin);

// POST /api/sso/generate-token — called by Forms backend (server-to-server)
router.post("/generate-token", generateToken);

// POST /api/sso/validate-token — called by our frontend
router.post("/validate-token", validateToken);

// GET /api/sso/callback — browser redirect from SSO system (static redirect URL)
router.get("/callback", ssoCallback);

module.exports = router;
