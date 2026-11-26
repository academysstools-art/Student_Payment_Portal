# NxtWave Student Payment Portal - Backend Design Document

## 1. Overview

Node.js/Express REST API behind the student fee details portal. Students sign in
through NxtWave SSO and see their fee summary, NxtWave and Jodo Flex payment
history, and NBFC EMI loan details. Admins see portal analytics, look up and
preview any student, read feedback, and export fee data.

**Tech stack:** Node.js, Express, Google BigQuery (read only), Neon Postgres, JWT, Vercel.

Google Sheets is **not** used anywhere.

## 2. Data stores

| Store | Used for | Access |
|---|---|---|
| BigQuery `kossip-helpers.academy_payments_portal_data` | All student fee data | Read only (`config/bigquery.js`) |
| Neon Postgres (`DATABASE_URL`) | SSO one-time tokens, logins, page analytics, feedback | Read/write (`config/postgres.js`, `config/analyticsDb.js`) |

The Neon database is shared with other apps, so portal tables are prefixed `payment_portal_`.

### 2.1 BigQuery tables (input)

| Table / view | Purpose |
|---|---|
| `user_list_payment_portal_page_pilot` | Pilot list: only these `user_id`s may sign in |
| `user_fee_details_for_payment_page_pilot` | One row per student: name, programme, fee totals, `user_type` |
| `application_details_for_payment_page_pilot` | NBFC / Jodo Flex applications (one row per application) |
| `paid_to_company_logs_for_payment_page_pilot` | Payments made directly to NxtWave |
| `jodo_flex_payment_logs_for_payment_page_pilot` | Jodo Flex instalment payments |
| `nbfcs_support_mails` | NBFC name to support email |

### 2.2 Column to API mapping (`controllers/paymentController.js`)

**Fee summary** (`user_fee_details`): `first_name`→`studentName`, `program_name`→`programme`,
`product_code`→`productCode`, `user_type`→`userType`, `total_fee`→`totalProgrammeFee`,
`total_discount`→`discountApplied`, `total_fee_payble`→`totalFeePayable`,
`total_amount_paid_to_company`→`amountPaidToNxtWave`,
`amount_paid_through_monthly_installments`→`amountPaidInFlex`,
`total_loan_amount_covered`→`nbfcLoanAmountCovered`, `total_amount_covered`→`totalAmountCovered`,
`remaining_amount_to_pay`→`remainingAmountToPay`.

**NBFC rows** (`application_details`): `nbfc_name`→`nbfcName` (formatted, e.g. `BAJAJ_FINANCE_LIMITED`→`Bajaj Finance Limited`),
`application_id`→`applicationId`, `loan_amount`→`loanAmount`, `emi_amount`→`emiAmount`, `status`→`status`,
`due_month`→`dueDate`, `tenure`→`tenure` ("24 months") and `tenureMonths`,
`emi_installments_start_date`/`_end_date`→`tenureRange` ("Jun 2025 - May 2027", falls back to `start_and_end_date`).
Rows with a NULL `nbfc_name` (students with no payment plan) are skipped.

**Payment logs:** NxtWave: `paid_datetime`→`paidDate`, `payment_amount`→`paidAmount`, `Payment_status`→`paymentStatus`.
Jodo Flex: `paid_datetime`→`paidDate`, `amount_paid`→`paidAmount`, `payment_status`→`paymentStatus`,
`mode_of_payment`→`paymentMode`. Placeholder rows with no date and no amount are dropped.

**Contacts** (`nbfcs_support_mails`): `nbfc`→`nbfcName` (same formatting as above), `support_mail`→`email`.

### 2.3 Neon tables (output)

| Table | Columns |
|---|---|
| `auth_tokens` | `token`, `user_id`, `expires_at`, `used`, `used_at`, `created_at` |
| `payment_portal_logins` | `user_id`, `student_name`, `programme`, `method` (`sso`/`direct`), `login_at` |
| `payment_portal_events` | `user_id`, `student_name`, `programme`, `event_name`, `event_data` (JSONB), `event_at` |
| `payment_portal_feedback` | `user_id`, `student_name`, `programme`, `rating` (1-5), `selected_options` (TEXT[]), `comments`, `submitted_at` |

Tables are created automatically on first use. History from the old BigQuery output
dataset was copied once with `scripts/migrate-analytics-to-neon.js`.

## 3. File structure

```
backend/
  server.js                  Express app, CORS, routes, serves frontend/dist
  api/index.js               Vercel entry
  config/bigquery.js         BigQuery client + read queries
  config/postgres.js         Neon pool + SSO token store
  config/analyticsDb.js      Logins, events, feedback (Neon)
  controllers/authController.js    Eligibility, session JWT, direct login
  controllers/ssoController.js     SSO token mint / exchange
  controllers/paymentController.js Student data endpoints + row mappers
  controllers/adminController.js   Admin endpoints
  middleware/auth.js         Student session check
  middleware/adminAuth.js    Admin check
  routes/                    auth, sso, payments, admin
  scripts/migrate-analytics-to-neon.js  One-time history copy
  utils/format.js            Date formatting
```

## 4. Authentication

### 4.1 Student SSO flow

1. The student signs in on NxtWave Forms (`/api/sso/login` redirects there).
2. Forms calls `POST /api/sso/generate-token` (or `/api/auth/generate-auth-code`) with
   `{ user_id }` and the shared `SSO_AUTH_KEY` header. The backend signs a 5-minute
   handoff JWT, stores it in `auth_tokens`, and returns `redirect_url` = `FRONTEND_URL/sso?token=...`.
3. The frontend `/sso` page calls `POST /api/sso/validate-token`.
4. The backend checks the token in Neon, then checks eligibility: the student must be on
   the pilot list **and** have a fee details row. If not, it returns 404 `USER_NOT_IN_DATASET`
   and the frontend shows the pilot notice.
5. The token is marked used and a 24-hour session JWT is returned. The login is recorded once.

A used token is accepted again only within 10 seconds of first use (two requests racing
the exchange); later replays get 401. Logging out also clears the browser's cached exchange.

### 4.2 Direct user-ID login

`POST /api/auth/login` with `{ userId }` works only when `ALLOW_DIRECT_USER_ID_LOGIN=true`
(keep it off in production). Same eligibility check as SSO.

### 4.3 Tokens

| Token | Payload | Lifetime |
|---|---|---|
| SSO handoff | `{ userId, type: "sso_handoff" }` | 5 min, single use |
| Student session | `{ userId, name, programme, type: "student_session" }` | 24 h |
| Admin session | `{ role: "admin", email }` | 24 h |

## 5. API endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | none (flag gated) | Direct login |
| POST | `/api/auth/generate-auth-code` | SSO key | Mint handoff token (Forms) |
| GET | `/api/sso/login` | none | Redirect to NxtWave login |
| POST | `/api/sso/generate-token` | SSO key | Mint handoff token (Forms) |
| POST | `/api/sso/validate-token` | handoff token | Exchange for session |
| GET | `/api/sso/callback` | none | Forward a handoff token to the SPA |
| GET | `/api/payments/summary` | student | Fee summary |
| GET | `/api/payments/nbfc` | student | NBFC rows grouped by NBFC |
| GET | `/api/payments/nbfc-details` | student | NBFC rows, flat |
| GET | `/api/payments/nbfc-contacts` | student | NBFC support emails |
| GET | `/api/payments/company-logs` | student | NxtWave payment history |
| GET | `/api/payments/flex-logs` | student | Jodo Flex payment history |
| POST | `/api/payments/feedback` | student | Save feedback (Neon) |
| POST | `/api/payments/track-event` | student | Save analytics event (Neon) |
| POST | `/api/admin/login` | none | Admin login |
| GET | `/api/admin/analytics` | admin | Login totals, recent logins, event stats (Neon) |
| GET | `/api/admin/students/search?q=` | admin | Search by user ID or name (BigQuery) |
| GET | `/api/admin/students/:userId` | admin | Full student view for the preview page |
| GET | `/api/admin/feedback` | admin | Feedback list (Neon) |
| GET | `/api/admin/export/csv` | admin | All fee details as CSV (BigQuery) |
| GET | `/api/health` | none | Health check |

Allowed `track-event` names: `fee_page_viewed`, `time_spent`, `scroll_depth`,
`payment_summary_viewed`, `covered_amount_viewed`, `emi_details_viewed`,
`clicked_payment_history`, `clicked_contact_jodo`, `clicked_contact_nbfc`,
`clicked_chat_support`, `feedback_opened`, `feedback_abandoned`, `feedback_submitted`.

## 6. Environment variables

| Variable | Purpose |
|---|---|
| `PORT` | Local port (default 5000) |
| `JWT_SECRET` | Signs all JWTs |
| `BIGQUERY_PROJECT_ID`, `BIGQUERY_DATASET` | Source dataset |
| `BIGQUERY_CLIENT_EMAIL`, `BIGQUERY_PRIVATE_KEY` | BigQuery service account |
| `DATABASE_URL` | Neon Postgres connection string |
| `SSO_AUTH_KEY` (or `TOKEN_SECRET`) | Shared key Forms sends when minting tokens |
| `FRONTEND_URL` | Origin used in `redirect_url` (must be an allowed origin) |
| `SSO_LOGIN_URL` | Optional override of the NxtWave login URL |
| `ALLOW_DIRECT_USER_ID_LOGIN` | `true` enables direct login (dev only) |
| `BIGQUERY_OUTPUT_DATASET` | Only read by the one-time migration script |

## 7. Deployment

Vercel runs `api/index.js` for `/api/*`. Locally, `node server.js` also serves `frontend/dist`.

## 8. Error handling

- BigQuery/Neon failures return 500/503 with a generic message; details go to the server log.
- Analytics writes (logins, events) are fire-and-forget and never fail a user request.
- Feedback writes return 500 on failure and the page shows a retry message.

## 9. Dependencies

`@google-cloud/bigquery`, `express`, `cors`, `dotenv`, `jsonwebtoken`, `pg`; `nodemon` for development.
