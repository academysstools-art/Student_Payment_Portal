const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const {
  getPaymentSummary,
  getNBFCDetails,
  getCompanyPaymentLogs,
  getFlexPaymentLogs,
  getNBFCAllRows,
  getNBFCContacts,
} = require("../controllers/paymentController");
const { submitFeedback } = require("../controllers/adminController");

// GET /api/payments/summary
router.get("/summary", authenticateToken, getPaymentSummary);

// GET /api/payments/nbfc
router.get("/nbfc", authenticateToken, getNBFCDetails);

// GET /api/payments/company-logs
router.get("/company-logs", authenticateToken, getCompanyPaymentLogs);

// GET /api/payments/flex-logs
router.get("/flex-logs", authenticateToken, getFlexPaymentLogs);

// GET /api/payments/nbfc-details
router.get("/nbfc-details", authenticateToken, getNBFCAllRows);

// GET /api/payments/nbfc-contacts
router.get("/nbfc-contacts", authenticateToken, getNBFCContacts);

// POST /api/payments/feedback
router.post("/feedback", authenticateToken, submitFeedback);

module.exports = router;
