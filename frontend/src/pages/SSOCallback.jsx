import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ssoAPI } from "../services/api";
import { Loader2 } from "lucide-react";

const TOKEN_PARAM_KEYS = [
  "token",
  "auth_token",
  "authToken",
  "auth_code",
  "authCode",
  "code",
];

// Keep resolved promises for the page lifetime so remounts do not burn a
// one-time Neon token twice.
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

function goToSsoGate(navigate) {
  // Clear token/error query so / shows only the standard NxtWave gate message.
  navigate({ pathname: "/", search: "", hash: "" }, { replace: true });
}

export default function SSOCallback() {
  const location = useLocation();
  const errorParam = readSsoParam(location, ["error"]);
  const authToken = readSsoParam(location, TOKEN_PARAM_KEYS);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(() => Boolean(authToken) && !errorParam);

  useEffect(() => {
    // No token, bad redirect, or SSO error → show only the defined gate on /
    if (errorParam || !authToken) {
      goToSsoGate(navigate);
      return;
    }

    let cancelled = false;

    async function validateAndLogin() {
      try {
        const response = await exchangeTokenOnce(authToken);
        if (cancelled) return;

        // User ID missing or not present in BigQuery fee data
        if (!response?.data?.token || !response?.data?.student?.userId) {
          goToSsoGate(navigate);
          return;
        }

        login(response.data.token, response.data.student);
        navigate("/payments", { replace: true });
      } catch {
        if (cancelled) return;
        // Invalid/expired token, or user_id not in BigQuery
        goToSsoGate(navigate);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    validateAndLogin();
    return () => {
      cancelled = true;
    };
  }, [authToken, errorParam, login, navigate]);

  if (!checking) {
    return null;
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
