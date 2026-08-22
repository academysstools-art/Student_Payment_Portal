const express = require("express");
const router = express.Router();
const { loginWithUserId } = require("../controllers/authController");
const { generateToken } = require("../controllers/ssoController");

// POST /api/auth/login - Login with User ID
router.post("/login", loginWithUserId);

// POST /api/auth/generate-auth-code — server-to-server SSO token (Forms backend)
router.post("/generate-auth-code", generateToken);

module.exports = router;
