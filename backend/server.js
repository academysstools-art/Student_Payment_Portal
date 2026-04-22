require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const paymentRoutes = require("./routes/payments");
const adminRoutes = require("./routes/admin");
const ssoRoutes = require("./routes/sso");

const app = express();

// Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      const allowed = [
        "http://localhost:5173",
        "http://localhost:5174",
      ];

      // Add FRONTEND_URL (strip trailing slash)
      if (process.env.FRONTEND_URL) {
        allowed.push(process.env.FRONTEND_URL.replace(/\/+$/, ""));
      }

      if (allowed.includes(origin) || origin.endsWith(".vercel.app")) {
        return callback(null, true);
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/sso", ssoRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Temporary debug endpoint - REMOVE AFTER FIXING
app.get("/api/debug-env", (req, res) => {
  const pk = process.env.GOOGLE_PRIVATE_KEY || "";
  res.json({
    GOOGLE_SPREADSHEET_ID: process.env.GOOGLE_SPREADSHEET_ID || "MISSING",
    GOOGLE_SHEET_NAME: process.env.GOOGLE_SHEET_NAME || "MISSING",
    GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "MISSING",
    PRIVATE_KEY_LENGTH: pk.length,
    PRIVATE_KEY_STARTS: pk.substring(0, 30),
    PRIVATE_KEY_ENDS: pk.substring(pk.length - 30),
    PRIVATE_KEY_HAS_LITERAL_BACKSLASH_N: pk.includes("\\n"),
    PRIVATE_KEY_HAS_REAL_NEWLINES: pk.includes("\n"),
    JWT_SECRET_SET: !!process.env.JWT_SECRET,
    FRONTEND_URL: process.env.FRONTEND_URL || "MISSING",
  });
});

// Only listen when running locally (not on Vercel)
if (process.env.VERCEL !== "1") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
