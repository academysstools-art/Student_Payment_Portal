import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ssoAPI } from "../services/api";
import { Loader2 } from "lucide-react";

export default function SSOCallback() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const authToken = searchParams.get("auth_token");

    if (!authToken) {
      setError("No authentication token found. Please try logging in again.");
      return;
    }

    async function validateAndLogin() {
      try {
        const response = await ssoAPI.validateToken(authToken);
        login(response.data.token, response.data.student);
        navigate("/payments", { replace: true });
      } catch (err) {
        setError(
          err.response?.data?.error ||
            "Authentication failed. The link may have expired. Please try again."
        );
      }
    }

    validateAndLogin();
  }, [searchParams, login, navigate]);

  const ssoLoginUrl = import.meta.env.VITE_SSO_LOGIN_URL;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-blue-700 px-5">
        <div className="bg-white rounded-[2rem] shadow-2xl p-10 w-full max-w-md text-center">
          <div className="bg-rose-50 text-rose-600 px-4 py-3 rounded-xl text-sm font-bold border border-rose-100 mb-4">
            {error}
          </div>
          {ssoLoginUrl && (
            <a
              href={ssoLoginUrl}
              className="inline-block mt-2 text-blue-900 font-bold text-sm hover:underline"
            >
              Go to SSO Login
            </a>
          )}
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
      </div>
    </div>
  );
}
