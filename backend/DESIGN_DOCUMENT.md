# NxtWave Student Payment Portal - Backend Design Document

## 1. Overview

The Student Payment Portal backend is a Node.js/Express REST API that serves payment-related data for NxtWave students. It reads all data from a Google Spreadsheet (6 tabs) using a service account, authenticates users via JWT, and is deployed on Vercel as a serverless function.

**Tech Stack:** Node.js, Express.js, Google Sheets API v4, JWT, Vercel

**Production URL:** `https://student-payment-status-backend.vercel.app`

---

## 2. Architecture

```
Client (React Frontend)
        |
        v
  [Vercel Serverless]
        |
        v
  Express Application (server.js)
        |
        +-- /api/auth/*        --> authController
        +-- /api/sso/*         --> ssoController
        +-- /api/payments/*    --> paymentController
        +-- /api/admin/*       --> adminController
        |
        v
  Google Sheets API (read-only)
        |
        v
  Google Spreadsheet (6 sheet tabs)
```

---

## 3. Data Source - Google Spreadsheet

All data is stored in a single Google Spreadsheet with 6 sheet tabs. The backend connects via a Google Service Account with **read-only** access.

### 3.1 Sheet Tabs

| # | Sheet Tab Name | Purpose | Row Type |
|---|----------------|---------|----------|
| 1 | **Users Basic Details** | Student profile (UID, name, programme, LPOAD) | 1 row per student |
| 2 | **User Fee Details** | Fee breakdown (total fee, discounts, amounts paid, remaining) | 1 row per student |
| 3 | **Payment to Company logs** | Direct payments made to NxtWave | Multiple rows per student |
| 4 | **Flex Payment logs** | Jodo Flex payment records | Multiple rows per student |
| 5 | **NBFC Disbursed details** | NBFC loan details (loan amount, tenure, EMI, status) | Multiple rows per student per NBFC |
| 6 | **NBFC Support Contacts** | NBFC name to support email mapping | 1 row per NBFC (not student-specific) |

### 3.2 Column Mappings

**Users Basic Details:**
| Column | Description |
|--------|-------------|
| UID | Unique student identifier (e.g., `NXW-2025-STU001`) |
| Student Name | Full name |
| LPOAD | Last Programme Onboarding Acceptance Date |
| Programme | Programme name (e.g., "CCBP 4.0") |
| Product code | Product identifier |

**User Fee Details:**
| Column | Description |
|--------|-------------|
| UID | Links to Users Basic Details |
| Total Programme Fee | Original fee amount |
| Discount Applied | Discount given |
| Total Fee Payble | Fee after discount |
| Amount Paid to NxtWave | Direct payments received |
| Amount Paid in Jodo Flex | Payments via Jodo Flex |
| Nbfc Loan Amount Covered | Loan amount from NBFC partners |
| Total Amount Covered | Sum of all payments + loans |
| Remaining Amount to Pay | Outstanding balance |

**Payment to Company logs:**
| Column | Description |
|--------|-------------|
| UID | Student identifier |
| Paid Date | Date of payment |
| Paid Amount | Amount paid |
| Payment Status | Status (e.g., "Paid") |

**Flex Payment logs:**
| Column | Description |
|--------|-------------|
| UID | Student identifier |
| Paid Date | Date of payment |
| Paid Amount | Amount paid |
| Payment Status | Status |
| Payment Mode | Mode of payment |

**NBFC Disbursed details:**
| Column | Description |
|--------|-------------|
| UID | Student identifier |
| NBFC Name | Name of NBFC partner (e.g., "Gyandhan", "Jodo Cred") |
| Loan Amount | Disbursed loan amount |
| Tenure (Start Month and End Month) | Loan tenure period |
| EMI Amount | Monthly EMI amount |
| Status | Loan status ("Active", "Closed", "Paid", etc.) |
| Due Date (Tenure end Month + 1Month) | Loan due date |

**NBFC Support Contacts:**
| Column | Description |
|--------|-------------|
| NBFC | NBFC name |
| Main ID | Support email address |

---

## 4. File Structure

```
backend/
  +-- server.js                         # Express app entry point
  +-- package.json                      # Dependencies
  +-- api/
  |   +-- index.js                      # Vercel serverless entry (re-exports server.js)
  +-- config/
  |   +-- googleSheets.js               # Google Sheets client & data access layer
  +-- controllers/
  |   +-- authController.js             # Student login (UID-based)
  |   +-- ssoController.js             # SSO token generation & validation
  |   +-- paymentController.js          # Payment data endpoints
  |   +-- adminController.js            # Admin panel endpoints
  +-- middleware/
  |   +-- auth.js                       # JWT auth middleware (student)
  |   +-- adminAuth.js                  # JWT auth middleware (admin role check)
  +-- routes/
      +-- auth.js                       # /api/auth/*
      +-- sso.js                        # /api/sso/*
      +-- payments.js                   # /api/payments/*
      +-- admin.js                      # /api/admin/*
```

---

## 5. Authentication & Authorization

### 5.1 Authentication Flow

Two authentication methods exist:

**Method A: Direct UID Login**
```
Student enters UID --> POST /api/auth/login
  --> Lookup UID in "Users Basic Details" sheet
  --> Verify 2025+ cohort (LPOAD check)
  --> Issue 24h JWT with { userId, name, programme }
  --> Return token + student profile
```

**Method B: SSO Login**
```
Student clicks SSO link --> External SSO provider
  --> SSO provider verifies phone + OTP
  --> SSO provider calls POST /api/sso/generate-token (with x-sso-auth-key header)
  --> Backend issues 5-min handoff JWT { userId, type: "sso_handoff" }
  --> SSO redirects to frontend: /sso?token={handoff_jwt}
  --> Frontend calls POST /api/sso/validate-token
  --> Backend verifies handoff JWT, issues 24h session JWT
  --> Student is logged in
```

**Admin Login:**
```
Admin enters email + password --> POST /api/admin/login
  --> Verify against hardcoded credentials
  --> Issue 24h JWT with { role: "admin", email }
```

### 5.2 JWT Token Structure

**Student Token Payload:**
```json
{
  "userId": "NXW-2025-STU001",
  "name": "Student Name",
  "programme": "CCBP 4.0",
  "iat": 1745856000,
  "exp": 1745942400
}
```

**Admin Token Payload:**
```json
{
  "role": "admin",
  "email": "admin@nxtwave.in",
  "iat": 1745856000,
  "exp": 1745942400
}
```

### 5.3 Middleware

| Middleware | File | Purpose |
|-----------|------|---------|
| `authenticateToken` | middleware/auth.js | Verifies JWT, attaches `req.user`. Used for student endpoints. |
| `authenticateAdmin` | middleware/adminAuth.js | Verifies JWT + checks `role === "admin"`. Used for admin endpoints. |

---

## 6. API Endpoints

### 6.1 Auth Routes (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | None | Login with UID, returns JWT + student profile |

**Request:** `{ "userId": "NXW-2025-STU001" }`
**Response:** `{ "token": "jwt...", "student": { userId, name, programme, productCode } }`

### 6.2 SSO Routes (`/api/sso`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/sso/generate-token` | x-sso-auth-key header | Server-to-server: generates 5-min handoff token |
| POST | `/api/sso/validate-token` | None | Frontend: exchanges handoff token for 24h session JWT |

### 6.3 Payment Routes (`/api/payments`)

All routes require `authenticateToken` middleware (student JWT).

| Method | Endpoint | Description | Source Sheet(s) |
|--------|----------|-------------|-----------------|
| GET | `/api/payments/summary` | Fee summary (total fee, discounts, amounts paid, remaining) | Users Basic Details + User Fee Details |
| GET | `/api/payments/nbfc` | NBFC loan details grouped by NBFC name | NBFC Disbursed details |
| GET | `/api/payments/company-logs` | Direct payment history to NxtWave | Payment to Company logs |
| GET | `/api/payments/flex-logs` | Jodo Flex payment history | Flex Payment logs |
| GET | `/api/payments/nbfc-details` | All NBFC disbursed rows (flat) | NBFC Disbursed details |
| GET | `/api/payments/nbfc-contacts` | NBFC support email mappings | NBFC Support Contacts |
| POST | `/api/payments/feedback` | Submit user feedback | In-memory store |

**Key Response Shapes:**

`GET /api/payments/summary`:
```json
{
  "studentName": "John Doe",
  "programme": "CCBP 4.0",
  "productCode": "CCBP4",
  "lpoad": "2025-10-15",
  "totalProgrammeFee": "150000",
  "discountApplied": "10000",
  "totalFeePayable": "140000",
  "amountPaidToNxtWave": "50000",
  "amountPaidInFlex": "30000",
  "nbfcLoanAmountCovered": "40000",
  "totalAmountCovered": "120000",
  "remainingAmountToPay": "20000"
}
```

`GET /api/payments/nbfc`:
```json
{
  "nbfcGroups": [
    {
      "nbfcName": "Gyandhan",
      "totalLoanAmount": 40000,
      "rows": [
        {
          "loanAmount": "40000",
          "tenure": "Jan 2025 - Dec 2025",
          "emiAmount": "3500",
          "status": "Active",
          "dueDate": "Jan 2026"
        }
      ]
    }
  ]
}
```

`GET /api/payments/nbfc-contacts`:
```json
{
  "contacts": [
    { "nbfcName": "GYANDHAN", "email": "contact@gyandhan.com" },
    { "nbfcName": "Jodo Cred", "email": "support@jodopay.com" }
  ]
}
```

### 6.4 Admin Routes (`/api/admin`)

All routes (except login) require `authenticateAdmin` middleware.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/admin/login` | None | Admin login with email + password |
| GET | `/api/admin/analytics` | Admin | Login analytics (total logins, unique students, recent logins) |
| GET | `/api/admin/students/search?q=` | Admin | Search students by UID |
| GET | `/api/admin/students/:userId` | Admin | Full student details (all 5 sheets) |
| GET | `/api/admin/feedback` | Admin | View all submitted feedback |
| GET | `/api/admin/export/csv` | Admin | Export merged student + fee data as CSV |

### 6.5 Health Check

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | None | Returns `{ status: "ok", timestamp }` |

---

## 7. Data Access Layer (googleSheets.js)

### 7.1 Connection

- Uses `googleapis` npm package
- Authenticates via service account (email + private key from env vars)
- Scope: `spreadsheets.readonly`
- Singleton pattern: client is cached after first initialization

### 7.2 Functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `getSheetData(sheetName)` | Sheet tab name | Array of objects | Fetches all rows, converts to objects using header row as keys |
| `getStudentFromSheet(sheetName, uid)` | Sheet name, UID | Single object or undefined | Finds first row matching UID (case-insensitive) |
| `getStudentRowsFromSheet(sheetName, uid)` | Sheet name, UID | Array of objects | Finds ALL rows matching UID (for log/detail sheets) |
| `getStudentByUserId(userId)` | UID | Single object or undefined | Wrapper: calls `getStudentFromSheet` on "Users Basic Details" |

### 7.3 Important Notes

- Sheet names with spaces require single-quote wrapping in the API range parameter: `'Sheet Name'`
- Header values are trimmed: `header.trim()`
- UID matching is case-insensitive: both values are `.toLowerCase()` before comparison
- Private key handling: Vercel may store `\n` as literal `\\n`, so the code converts them back

---

## 8. Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email | `xyz@project.iam.gserviceaccount.com` |
| `GOOGLE_PRIVATE_KEY` | Service account private key (PEM) | `-----BEGIN PRIVATE KEY-----\n...` |
| `GOOGLE_SPREADSHEET_ID` | Google Spreadsheet ID | `1aBc...xyz` |
| `JWT_SECRET` | Secret for signing/verifying JWTs | `your-secret-key` |
| `SSO_AUTH_KEY` | Shared key for SSO server-to-server calls | `sso-auth-key-value` |
| `FRONTEND_URL` | Allowed CORS origin | `https://student-payment-status-j6hh.vercel.app` |
| `PORT` | Local server port (not used on Vercel) | `5000` |

---

## 9. CORS Configuration

- Allows `localhost:5173`, `localhost:5174` (local dev)
- Allows `FRONTEND_URL` env var (production)
- Allows any `*.vercel.app` origin (preview deployments)
- Allows requests with no origin (mobile apps, curl)

---

## 10. Deployment (Vercel)

- Entry point: `api/index.js` re-exports the Express app
- Vercel routes all `/api/*` requests to the serverless function
- No persistent storage (feedback + login logs are in-memory, reset on redeploy)
- Serverless function cold starts may add latency on first request

---

## 11. Security Considerations

| Area | Current State | Notes |
|------|--------------|-------|
| Authentication | JWT with 24h expiry | Tokens stored in localStorage on frontend |
| Admin credentials | Hardcoded in source | Should be moved to env vars for production |
| Data access | Read-only Google Sheets scope | Cannot modify spreadsheet data |
| CORS | Restricted to known origins | Allows all *.vercel.app (broad for previews) |
| Rate limiting | None | Consider adding for production |
| Input validation | Basic (checks for empty fields) | UID is validated against sheet data |
| SSO | Server-to-server auth via shared key | 5-min handoff token limits exposure |
| Cohort restriction | LPOAD year >= 2025 | Students before 2025 are rejected |

---

## 12. In-Memory Stores (Non-Persistent)

These reset on every Vercel redeploy:

| Store | Location | Purpose |
|-------|----------|---------|
| `loginLogs[]` | authController.js | Tracks login events (userId, name, timestamp) |
| `feedbackList[]` | adminController.js | Stores student feedback submissions |
| `sheetsInstance` | googleSheets.js | Cached Google Sheets API client |

---

## 13. Error Handling

All controllers follow a consistent pattern:
```javascript
try {
  // business logic
  res.json(result);
} catch (error) {
  console.error("[Context] error:", error.message);
  res.status(500).json({ error: "User-friendly message" });
}
```

HTTP status codes used:
- `200` — Success
- `400` — Bad request (missing required fields)
- `401` — Unauthorized (missing/invalid token, wrong credentials)
- `403` — Forbidden (non-admin accessing admin routes, pre-2025 cohort)
- `404` — Student not found
- `500` — Internal server error

---

## 14. Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.21.2 | Web framework |
| googleapis | ^144.0.0 | Google Sheets API client |
| jsonwebtoken | ^9.0.2 | JWT creation and verification |
| cors | ^2.8.5 | Cross-origin resource sharing |
| dotenv | ^16.4.7 | Environment variable loading |
| nodemon | ^3.1.9 | Dev-only: auto-restart on changes |
