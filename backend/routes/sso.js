const express = require("express");
const router = express.Router();
const { generateToken, validateToken } = require("../controllers/ssoController");

// POST /api/sso/generate-token — called by Forms backend
router.post("/generate-token", generateToken);

// POST /api/sso/validate-token — called by our frontend
router.post("/validate-token", validateToken);

module.exports = router;
