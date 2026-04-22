const express = require("express");
const router = express.Router();
const { authenticateAdmin } = require("../middleware/adminAuth");
const {
  adminLogin,
  getAnalytics,
  searchStudents,
  getStudentDetails,
  getFeedback,
  exportCSV,
} = require("../controllers/adminController");

// Public
router.post("/login", adminLogin);

// Protected (admin only)
router.get("/analytics", authenticateAdmin, getAnalytics);
router.get("/students/search", authenticateAdmin, searchStudents);
router.get("/students/:userId", authenticateAdmin, getStudentDetails);
router.get("/feedback", authenticateAdmin, getFeedback);
router.get("/export/csv", authenticateAdmin, exportCSV);

module.exports = router;
