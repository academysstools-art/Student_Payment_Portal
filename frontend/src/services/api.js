import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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

// Redirect to login on 401/403
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem("token");
      localStorage.removeItem("student");
      window.location.href = "/";
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
