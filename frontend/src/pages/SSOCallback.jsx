import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ssoAPI } from "../services/api";
import { ExternalLink, Loader2 } from "lucide-react";

const SSO_LOGIN_URL =
  import.meta.env.VITE_SSO_LOGIN_URL ||
  "https://meetings.ccbp.in/mid/fee-details";

const SSO_ERROR_MESSAGES = {
  missing_user_id: "User ID was not provided by the SSO system. Please try again.",
  missing_token: "The SSO system did not provide an authentication token. Please try again.",
  invalid_token: "The authentication token is invalid or expired. Please try again.",
  student_not_found: "Student not found. Please check your credentials.",
  cohort_restricted: "Payment portal is only available for students onboarded from 2025 onwards.",
  server_error: "Something went wrong. Please try again.",
};

export default function SSOCallback() {
  const [searchParams] = useSearchParams();
  const errorParam = searchParams.get("error");
  const authToken =
    searchParams.get("token") ||
    searchParams.get("auth_token") ||
    searchParams.get("authToken");
  const [error, setError] = useState(() =>
    errorParam
      ? SSO_ERROR_MESSAGES[errorParam] || "Authentication failed. Please try again."
      : authToken
        ? ""
        : "No authentication token found. Please try logging in again."
  );
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (errorParam || !authToken) return;

    let cancelled = false;

    async function validateAndLogin() {
      try {
        const response = await ssoAPI.validateToken(authToken);
        if (cancelled) return;
        login(response.data.token, response.data.student);
        navigate("/payments", { replace: true });
      } catch (err) {
        if (cancelled) return;
        setError(
          err.response?.data?.error ||
            err.response?.data?.message ||
            "Authentication failed. The link may have expired. Please try again."
        );
      }
    }

    validateAndLogin();
    return () => {
      cancelled = true;
    };
  }, [authToken, errorParam, login, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-blue-700 px-5">
        <div className="bg-white rounded-[2rem] shadow-2xl p-10 w-full max-w-md text-center">
          <div className="bg-rose-50 text-rose-600 px-4 py-3 rounded-xl text-sm font-bold border border-rose-100 mb-4">
            {error}
          </div>
          <a
            href={SSO_LOGIN_URL}
            className="inline-flex items-center gap-1.5 text-blue-900 hover:text-blue-700 text-sm font-bold no-underline border border-blue-200 hover:border-blue-400 bg-white px-4 py-2 rounded-lg transition-colors"
          >
            <ExternalLink size={14} />
            Login with NxtWave Account
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-blue-700">
      <div className="text-center text-white">
        <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" />
        <p className="font-bold text-sm tracking-tighter uppercase">
          Verifying your identity...
        </p>
        <p className="mt-2 text-xs text-white/80 font-medium">
          Validating SSO token and loading payment details
        </p>
      </div>
    </div>
  );
}
