import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ssoAPI } from "../services/api";
import { Loader2, TrendingUp } from "lucide-react";

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
  navigate({ pathname: "/", search: "", hash: "" }, { replace: true });
}

function PortalShell({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-blue-50 to-blue-200 px-5">
      <div className="bg-white rounded-[2rem] shadow-2xl p-10 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="bg-blue-900 text-white p-3 rounded-xl inline-block mb-4">
            <TrendingUp size={28} />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 mb-1">
            NxtWave
          </h1>
          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">
            Student Payment Portal
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function SSOCallback() {
  const location = useLocation();
  const errorParam = readSsoParam(location, ["error"]);
  const authToken = readSsoParam(location, TOKEN_PARAM_KEYS);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(() => Boolean(authToken) && !errorParam);
  const [notInDataset, setNotInDataset] = useState(false);

  useEffect(() => {
    if (errorParam || !authToken) {
      goToSsoGate(navigate);
      return;
    }

    let cancelled = false;

    async function validateAndLogin() {
      try {
        const response = await exchangeTokenOnce(authToken);
        if (cancelled) return;

        if (!response?.data?.token || !response?.data?.student?.userId) {
          setNotInDataset(true);
          return;
        }

        login(response.data.token, response.data.student);
        navigate("/payments", { replace: true });
      } catch (err) {
        if (cancelled) return;
        const code = err.response?.data?.code;
        const status = err.response?.status;
        if (status === 404 || code === "USER_NOT_IN_DATASET") {
          setNotInDataset(true);
          return;
        }
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

  if (notInDataset) {
    return (
      <PortalShell>
        <div className="bg-amber-50 text-amber-950 px-4 py-4 rounded-xl text-sm font-semibold border border-amber-100 text-center leading-relaxed">
          The fee details portal is currently in a pilot phase, but we&apos;ll
          notify you as soon as it&apos;s ready for you — thank you for your
          patience!
        </div>
      </PortalShell>
    );
  }

  if (!checking) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-blue-50 to-blue-200">
      <div className="text-center text-blue-900">
        <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" />
        <p className="font-bold text-sm tracking-tighter uppercase">
          Verifying your identity...
        </p>
        <p className="mt-2 text-xs text-blue-700 font-medium">
          Validating SSO token and loading payment details
        </p>
      </div>
    </div>
  );
}
