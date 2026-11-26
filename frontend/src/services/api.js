import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to login on 401/403 (skip for login/auth endpoints)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/generate-auth-code") ||
      url.includes("/admin/login") ||
      url.includes("/sso/");
    if (!isAuthEndpoint && (error.response?.status === 401 || error.response?.status === 403)) {
      const wasAdmin = (() => {
        try {
          return JSON.parse(localStorage.getItem("student") || "{}")?.role === "admin";
        } catch {
          return false;
        }
      })();
      localStorage.removeItem("token");
      localStorage.removeItem("student");
      window.location.href = wasAdmin ? "/admin-login" : "/";
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (userId) => api.post("/auth/login", { userId }),
};

export const ssoAPI = {
  validateToken: (token) => api.post("/sso/validate-token", { token }),
};

export const paymentAPI = {
  getSummary: () => api.get("/payments/summary"),
  getNBFCDetails: () => api.get("/payments/nbfc"),
  getCompanyLogs: () => api.get("/payments/company-logs"),
  getFlexLogs: () => api.get("/payments/flex-logs"),
  getNBFCAllRows: () => api.get("/payments/nbfc-details"),
  getNBFCContacts: () => api.get("/payments/nbfc-contacts"),
  submitFeedback: (data) => api.post("/payments/feedback", data),
  trackEvent: (eventName, eventData) => api.post("/payments/track-event", { eventName, eventData }).catch(() => {}),
  // keepalive lets the request finish while the tab is closing
  trackEventOnExit: (eventName, eventData) => {
    try {
      const token = localStorage.getItem("token");
      fetch(`${API_BASE_URL}/payments/track-event`, {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ eventName, eventData }),
      }).catch(() => {});
    } catch {
      // analytics must never break the page
    }
  },
};

export const adminAPI = {
  login: (email, password) => api.post("/admin/login", { email, password }),
  getAnalytics: () => api.get("/admin/analytics"),
  searchStudents: (query) => api.get(`/admin/students/search?q=${encodeURIComponent(query)}`),
  getStudentDetails: (userId) => api.get(`/admin/students/${encodeURIComponent(userId)}`),
  getFeedback: () => api.get("/admin/feedback"),
  exportCSV: () => api.get("/admin/export/csv", { responseType: "blob" }),
};

export default api;
