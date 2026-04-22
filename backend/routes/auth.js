const express = require("express");
const router = express.Router();
const { loginWithUserId } = require("../controllers/authController");

// POST /api/auth/login - Login with User ID (simulates SSO)
router.post("/login", loginWithUserId);

module.exports = router;
