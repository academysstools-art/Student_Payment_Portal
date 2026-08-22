import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../services/api";
import { TrendingUp, Loader2, ExternalLink } from "lucide-react";

const SSO_LOGIN_URL = import.meta.env.VITE_SSO_LOGIN_URL;

export default function Login() {
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleStudentLogin(e) {
    e.preventDefault();
    setError("");
    if (!userId.trim()) {
      setError("Please enter your User ID");
      return;
    }
    setLoading(true);
    try {
      const response = await authAPI.login(userId.trim());
      login(response.data.token, response.data.student);
      navigate("/payments");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-blue-700 px-5">
      <div className="bg-white rounded-[2rem] shadow-2xl p-10 w-full max-w-md">
        {/* Header */}
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

        {SSO_LOGIN_URL && (
          <div className="mb-4">
            <a
              href={SSO_LOGIN_URL}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white font-black text-sm uppercase tracking-widest py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 no-underline"
            >
              <ExternalLink size={16} />
              Login with NxtWave Account
            </a>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                or
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
          </div>
        )}

        <form onSubmit={handleStudentLogin} className="space-y-5">
          <div>
            <label
              htmlFor="userId"
              className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2"
            >
              User ID
            </label>
            <input
              id="userId"
              type="text"
              placeholder="e.g. NXW-2025-STU001"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={loading}
              autoFocus={!SSO_LOGIN_URL}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-300 disabled:opacity-50"
            />
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-600 px-4 py-3 rounded-xl text-sm font-bold border border-rose-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white font-black text-sm uppercase tracking-widest py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Verifying...
              </>
            ) : (
              "View Payment Status"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
