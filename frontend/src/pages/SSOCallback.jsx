import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ssoAPI } from "../services/api";
import { ExternalLink, Loader2 } from "lucide-react";

const SSO_LOGIN_URL = "/api/sso/login";

const SSO_ERROR_MESSAGES = {
  missing_user_id: "User ID was not provided by the SSO system. Please try again.",
  missing_token: "The SSO system did not provide an authentication token. Please try again.",
  invalid_token: "The authentication token is invalid or expired. Please try again.",
  student_not_found: "Student not found. Please check your credentials.",
  cohort_restricted: "Payment portal is only available for students onboarded from 2025 onwards.",
  server_error: "Something went wrong. Please try again.",
};

const TOKEN_PARAM_KEYS = [
  "token",
  "auth_token",
  "authToken",
  "auth_code",
  "authCode",
  "code",
];

// Keep resolved promises for the page lifetime so React StrictMode / remounts
// do not burn a one-time Neon token twice.
const pendingTokenExchanges = new Map();

function readSsoParam(location, keys) {
  const searchParams = new URLSearchParams(location.search);
  const hashParams = new URLSearchParams(location.hash.replace(/^#/, ""));

  for (const key of keys) {
    const value = searchParams.get(key) || hashParams.get(key);
    if (value) return value;
  }

  return null;
}

function cacheKeyForToken(token) {
  return `sso_exchange_v1:${token.slice(0, 24)}:${token.slice(-24)}`;
}

function readCachedExchange(token) {
  try {
    const raw = sessionStorage.getItem(cacheKeyForToken(token));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.student) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedExchange(token, data) {
  try {
    sessionStorage.setItem(cacheKeyForToken(token), JSON.stringify(data));
  } catch {
    // ignore quota / private mode
  }
}

function exchangeTokenOnce(token) {
  const cached = readCachedExchange(token);
  if (cached) {
    return Promise.resolve({ data: cached });
  }

  const pendingExchange = pendingTokenExchanges.get(token);
  if (pendingExchange) return pendingExchange;

  const exchange = ssoAPI
    .validateToken(token)
    .then((response) => {
      writeCachedExchange(token, response.data);
      return response;
    })
    .catch((error) => {
      pendingTokenExchanges.delete(token);
      throw error;
    });

  pendingTokenExchanges.set(token, exchange);
  return exchange;
}

export default function SSOCallback() {
  const location = useLocation();
  const errorParam = readSsoParam(location, ["error"]);
  const authToken = readSsoParam(location, TOKEN_PARAM_KEYS);
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
        const response = await exchangeTokenOnce(authToken);
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
