import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import Payments from "./pages/Payments";
import AdminDashboard from "./pages/AdminDashboard";
import SSOCallback from "./pages/SSOCallback";

const SSO_RESPONSE_KEYS = [
  "token",
  "auth_token",
  "authToken",
  "auth_code",
  "authCode",
  "code",
  "error",
];

function RootRoute() {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const hashParams = new URLSearchParams(location.hash.replace(/^#/, ""));
  const hasSsoResponse = SSO_RESPONSE_KEYS.some(
    (key) => searchParams.has(key) || hashParams.has(key)
  );

  if (hasSsoResponse) {
    return <SSOCallback />;
  }

  if (isAuthenticated && !isAdmin) {
    return <Navigate to="/payments" replace />;
  }

  return <Login />;
}

function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/admin-login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/sso" element={<SSOCallback />} />
          <Route path="/sso/callback" element={<SSOCallback />} />
          <Route path="/auth/callback" element={<SSOCallback />} />
          <Route
            path="/payments"
            element={
              <ProtectedRoute>
                <Payments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
