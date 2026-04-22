const jwt = require("jsonwebtoken");
const { getStudentByUserId } = require("../config/googleSheets");

// In-memory login tracking
const loginLogs = [];

async function loginWithUserId(req, res) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const student = await getStudentByUserId(userId);

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Check if student is from 2025+ cohort using LPOAD
    const lpoad = student["LPOAD"];
    if (lpoad) {
      const onboardingYear = new Date(lpoad).getFullYear();
      if (onboardingYear < 2025) {
        return res.status(403).json({
          error:
            "Payment portal is only available for students onboarded from 2025 onwards",
        });
      }
    }

    const token = jwt.sign(
      {
        userId: student["User ID With Hyphens"],
        name: student["Student Name"],
        programme: student["Programme"],
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Track login
    loginLogs.push({
      userId: student["User ID With Hyphens"],
      name: student["Student Name"],
      programme: student["Programme"],
      timestamp: new Date().toISOString(),
    });

    res.json({
      token,
      student: {
        userId: student["User ID With Hyphens"],
        name: student["Student Name"],
        programme: student["Programme"],
        productCode: student["Product code"],
      },
    });
  } catch (error) {
    console.error("Login error:", error.message, error.stack);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { loginWithUserId, loginLogs };
