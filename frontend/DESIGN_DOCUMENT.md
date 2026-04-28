# NxtWave Student Payment Portal - Frontend Design Document

## 1. Overview

The Student Payment Portal frontend is a React 19 Single Page Application (SPA) that displays payment-related data for NxtWave students. It communicates with the Express.js backend via REST APIs, uses JWT-based authentication, and is deployed on Vercel.

**Tech Stack:** React 19, Vite 8, Tailwind CSS 4, Axios, React Router 7, Lucide React

**Production URL:** `https://student-payment-status-j6hh.vercel.app`

---

## 2. Architecture

```
User (Browser)
      |
      v
  [Vercel Static Hosting]
      |
      v
  React SPA (Vite Build)
      |
      +-- AuthContext (Global State)
      |
      +-- React Router (Client-side routing)
      |       |
      |       +-- /              --> Login.jsx
      |       +-- /admin-login   --> AdminLogin.jsx
      |       +-- /sso           --> SSOCallback.jsx
      |       +-- /payments      --> Payments.jsx (Protected)
      |       +-- /admin         --> AdminDashboard.jsx (Admin-only)
      |
      +-- API Service Layer (Axios)
              |
              v
        Backend REST API
```

---

## 3. Project Structure

```
frontend/
├── src/
│   ├── App.jsx                          # Root routing component
│   ├── main.jsx                         # React entry point
│   ├── index.css                        # Tailwind CSS import
│   ├── context/
│   │   └── AuthContext.jsx             # Auth state management
│   ├── components/
│   │   ├── ProtectedRoute.jsx          # Route protection wrapper
│   │   └── PaymentHistoryModal.jsx     # Reusable payment history modal
│   ├── pages/
│   │   ├── Login.jsx                   # Student login page
│   │   ├── AdminLogin.jsx              # Admin login page
│   │   ├── SSOCallback.jsx             # SSO authentication callback
│   │   ├── Payments.jsx                # Student payment dashboard
│   │   └── AdminDashboard.jsx          # Admin management interface
│   └── services/
│       └── api.js                      # Axios API client with interceptors
├── package.json
├── vite.config.js
└── index.html
```

---

## 4. Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.5 | UI framework |
| react-dom | ^19.2.5 | DOM rendering |
| react-router-dom | ^7.14.2 | Client-side routing |
| axios | ^1.15.2 | HTTP client |
| lucide-react | ^1.8.0 | Icon library |
| tailwindcss | ^4.2.4 | Utility-first CSS |
| vite | ^8.0.9 | Build tool & dev server |
| @tailwindcss/vite | ^4.2.4 | Tailwind Vite plugin |
| @vitejs/plugin-react | ^6.0.1 | React HMR & JSX |

---

## 5. Authentication & Authorization

### 5.1 Auth Context (AuthContext.jsx)

Global authentication state using React Context API.

**State:**
```javascript
{
  token: string | null,          // JWT token
  student: object | null,        // User data (name, role, etc.)
  isAuthenticated: boolean,      // Derived: token !== null
  isAdmin: boolean,              // Derived: student?.role === "admin"
}
```

**Methods:**
| Method | Action |
|--------|--------|
| `login(token, studentData)` | Store token + user in localStorage & state |
| `logout()` | Clear localStorage & state, redirect to `/` |

**Persistence:** Token and student data stored in `localStorage` — survives page refresh.

### 5.2 Route Protection

| Component | Protects | Redirect |
|-----------|----------|----------|
| `ProtectedRoute` | `/payments` | → `/` (login) |
| `AdminRoute` | `/admin` | → `/admin-login` |

### 5.3 Authentication Flows

**Direct UID Login:**
```
User enters UID → POST /auth/login → JWT + student data → localStorage → /payments
```

**SSO Login:**
```
User clicks SSO button → External SSO provider → Redirect to /sso?token=...
→ POST /sso/validate-token → JWT + student data → localStorage → /payments
```

**Admin Login:**
```
Admin enters email + password → POST /admin/login → JWT + admin data → localStorage → /admin
```

### 5.4 Auto-Logout

The Axios response interceptor catches `401`/`403` errors, clears auth state, and redirects to `/`.

---

## 6. API Service Layer (api.js)

### 6.1 Configuration

- Base URL: `VITE_API_URL` env var (default: `http://localhost:5000/api`)
- Content-Type: `application/json`
- Auth: Bearer token auto-attached via request interceptor

### 6.2 API Modules

**authAPI:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| `login(userId)` | POST `/auth/login` | Student login |

**ssoAPI:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| `validateToken(token)` | POST `/sso/validate-token` | Exchange SSO handoff token for session |

**paymentAPI:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| `getSummary()` | GET `/payments/summary` | Fee summary data |
| `getNBFCDetails()` | GET `/payments/nbfc` | NBFC loans grouped by name |
| `getCompanyLogs()` | GET `/payments/company-logs` | Direct payment history |
| `getFlexLogs()` | GET `/payments/flex-logs` | Jodo Flex payment history |
| `getNBFCAllRows()` | GET `/payments/nbfc-details` | All NBFC disbursed rows |
| `getNBFCContacts()` | GET `/payments/nbfc-contacts` | NBFC support emails |
| `submitFeedback(message)` | POST `/payments/feedback` | Submit user feedback |

**adminAPI:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| `login(email, password)` | POST `/admin/login` | Admin login |
| `getAnalytics()` | GET `/admin/analytics` | Login analytics |
| `searchStudents(query)` | GET `/admin/students/search?q=` | Search by UID |
| `getStudentDetails(userId)` | GET `/admin/students/:userId` | Full student details |
| `getFeedback()` | GET `/admin/feedback` | All feedback entries |
| `exportCSV()` | GET `/admin/export/csv` | CSV blob download |

---

## 7. Pages

### 7.1 Login Page (`/`)

Student-only login with two methods:
1. **SSO Button** — Visible only when `VITE_SSO_LOGIN_URL` is set. Links to external SSO provider.
2. **UID Form** — Manual entry of student User ID.

**Design:** White card centered on blue-purple gradient background. NxtWave branding with TrendingUp icon.

### 7.2 Admin Login Page (`/admin-login`)

Separate admin authentication page.

**Design:** White card centered on dark slate gradient. ShieldCheck icon + "Admin Portal" label.

### 7.3 SSO Callback (`/sso`)

Handles the redirect from the external SSO provider:
1. Reads `token` or `auth_token` from URL query params
2. Calls `POST /sso/validate-token`
3. On success: logs in and redirects to `/payments`
4. On failure: shows error with link back to login

### 7.4 Payments Dashboard (`/payments`)

The main student-facing page with a sidebar layout.

**Layout:**
```
┌──────────────────────────────────────────┐
│ ┌─────────┐ ┌──────────────────────────┐ │
│ │ Sidebar │ │ Header (Welcome + Date)  │ │
│ │         │ ├──────────────────────────┤ │
│ │ • Home  │ │                          │ │
│ │ • Feed- │ │ Payment Summary Card     │ │
│ │   back  │ │ (Hero gradient card)     │ │
│ │         │ │                          │ │
│ │         │ ├──────────────────────────┤ │
│ │         │ │ Covered Amount Details   │ │
│ │         │ │ [NxtWave] [Flex] [EMI]   │ │
│ │         │ ├──────────────────────────┤ │
│ │         │ │ Contact Section          │ │
│ │         │ │ EMI Info Banner          │ │
│ │ Logout  │ │                          │ │
│ └─────────┘ └──────────────────────────┘ │
└──────────────────────────────────────────┘
```

**Sections:**

| Section | Content |
|---------|---------|
| Payment Summary | Total fee, discount, payable, covered, remaining — gradient indigo card |
| Breakdown | Amount Paid to NxtWave, Jodo Flex amount, NBFC loan amount |
| Covered Amount Cards | 3 cards: NxtWave, Jodo Flex, EMI Loan — each with "View Payment History" button |
| Contact Section | mailto links to NBFC support emails |
| EMI Info Banner | Disclaimer about EMI payment process |
| Feedback Modal | Quick-tap tags + optional text input |

**Jodo Flex Card Logic:**
- If NBFC status ≠ Active → Simple card showing total amount + "Paid" badge
- If NBFC status = Active → Detailed card with loan amount, EMI, tenure, due date, status badge

**Data Fetch Strategy:**
- On mount: fetch summary, NBFC details, NBFC contacts in parallel
- On demand: fetch company logs, flex logs when modals opened (cached after first fetch)

### 7.5 Admin Dashboard (`/admin`)

Tabbed interface for admin operations.

**Tabs:**
| Tab | Functionality |
|-----|---------------|
| Analytics | Login stats (total, unique, recent), recent login table |
| Students | Search by UID, results table, expandable detail view |
| Feedback | List all feedback with timestamps and user info |
| Export | CSV download of merged student + fee data |

**Student Detail View:** Displays all payment metrics + NBFC details + payment logs in a comprehensive breakdown.

---

## 8. Reusable Components

### 8.1 PaymentHistoryModal

Generic modal for displaying payment transaction tables.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | boolean | Show/hide modal |
| `onClose` | function | Close handler |
| `title` | string | Modal header |
| `columns` | array | `[{ key, label, isAmount?, isStatus? }]` |
| `data` | array | Row data |
| `loading` | boolean | Loading spinner state |

**Features:**
- Backdrop overlay with blur
- Scrollable table (`max-h-[80vh]`)
- Currency formatting (₹ Indian locale) for `isAmount` columns
- Colored status badges for `isStatus` columns:
  - Green: Paid, Settled, Closed
  - Amber: Active, Ongoing
  - Red: Paused
  - Slate: Default

### 8.2 ProtectedRoute

Simple wrapper that checks `isAuthenticated` from AuthContext and redirects if not.

---

## 9. State Management

### 9.1 Global State (Context API)

Only auth state is global — token, student data, login/logout methods.

### 9.2 Local Component State (useState)

Each page manages its own data:

**Payments.jsx:**
```javascript
summary         // Payment summary object
nbfc            // NBFC grouped data
nbfcContacts    // NBFC support emails
loading/error   // Loading & error states
sidebarOpen     // Mobile sidebar toggle
companyLogs     // Cached company payment logs
flexLogs        // Cached flex payment logs
companyLogsModal, flexLogsModal  // Modal visibility
feedbackOpen, feedbackText, feedbackTags, feedbackSending, feedbackSent
```

**AdminDashboard.jsx:**
```javascript
activeTab       // Current tab selection
analytics       // Analytics data
searchQuery, searchResults  // Student search
selectedStudent // Detailed student view
feedback        // Feedback list
loading states  // Per-section loading
```

---

## 10. Styling & Design System

### 10.1 Framework

Tailwind CSS 4 via Vite plugin. No custom config file — uses defaults.

Import: `@import "tailwindcss"` in `index.css`.

### 10.2 Color Palette

| Role | Colors |
|------|--------|
| Primary | Indigo-600, Indigo-700 |
| Success | Emerald-100/700 |
| Warning | Amber-100/700 |
| Error | Rose-100/500/600 |
| Neutral | Slate-50 to Slate-900 |
| Gradients | Blue-Purple (login), Indigo-Purple (summary card), Slate (admin) |

### 10.3 Component Patterns

| Element | Style |
|---------|-------|
| Cards | `rounded-xl` or `rounded-2xl`, `border`, `shadow-sm` |
| Buttons | `rounded-xl`, `font-bold`, hover/disabled states, `cursor-pointer` |
| Inputs | `rounded-xl`, `border-slate-200`, focus ring |
| Modals | Fixed position, backdrop blur, centered, `rounded-2xl` |
| Badges | `rounded-full`, `px-2 py-0.5`, `text-xs font-bold` |

### 10.4 Responsive Design

- Mobile-first approach
- Sidebar collapses on mobile (hamburger toggle)
- Grid layouts: `grid-cols-1` → `md:grid-cols-2` → `lg:grid-cols-3`
- Text sizes adjust at breakpoints

---

## 11. Feedback System

### 11.1 Quick-Tap Tags

8 predefined feedback tags:
- Easy to use, Clear information, Helpful breakdown, Great experience
- Confusing layout, Missing information, Slow loading, Need more details

### 11.2 Submission Format

```
[tag1, tag2] — optional text message
```

Or just tags, or just text. At least one required.

### 11.3 UI Flow

```
Click Feedback button (sidebar) → Modal opens
→ Select tags (toggle on/off) + optionally type message
→ Submit → "Thank you" confirmation → Auto-close after 2s
```

---

## 12. Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `https://student-payment-status-backend.vercel.app/api` |
| `VITE_SSO_LOGIN_URL` | External SSO login page URL | `https://forms.ccbp.in/mid/...` |

---

## 13. Build & Deployment

### 13.1 Scripts

```bash
npm run dev      # Start Vite dev server (port 5173)
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
```

### 13.2 Vercel Deployment

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables configured in Vercel dashboard
- SPA fallback: All routes serve `index.html`

---

## 14. Security Considerations

| Area | Implementation |
|------|---------------|
| Token Storage | localStorage (XSS risk accepted for simplicity) |
| Auto-Logout | 401/403 response interceptor clears session |
| Input Sanitization | React's built-in JSX escaping prevents XSS |
| HTTPS | Enforced in production via Vercel |
| Sensitive Data | No passwords/secrets stored client-side |
| CORS | Backend restricts to known origins |

---

## 15. Error Handling

| Scenario | Behavior |
|----------|----------|
| Login failure | Error message displayed below form |
| API fetch failure | Error card with "Try Again" button |
| Auth expired (401/403) | Auto-logout + redirect to login |
| Network error | Axios error caught, user-friendly message shown |
| Empty data | "No records found" empty state in modals/tables |

---

## 16. Browser Support

- Chrome 90+
- Firefox 90+
- Safari 14+
- Edge 90+
- ES2020+ JavaScript required
- CSS Grid & Flexbox required
