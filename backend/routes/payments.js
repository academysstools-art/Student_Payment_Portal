const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const {
  getPaymentSummary,
  getNBFCDetails,
} = require("../controllers/paymentController");
const { submitFeedback } = require("../controllers/adminController");

// GET /api/payments/summary
router.get("/summary", authenticateToken, getPaymentSummary);

// GET /api/payments/nbfc
router.get("/nbfc", authenticateToken, getNBFCDetails);

// POST /api/payments/feedback
router.post("/feedback", authenticateToken, submitFeedback);

module.exports = router;
