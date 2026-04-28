import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { adminAPI } from "../services/api";
import { TrendingUp, Loader2, ShieldCheck } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleAdminLogin(e) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      const response = await adminAPI.login(email.trim(), password);
      login(response.data.token, response.data.admin);
      navigate("/admin");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 px-5">
      <div className="bg-white rounded-[2rem] shadow-2xl p-10 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="bg-slate-900 text-white p-3 rounded-xl inline-block mb-4">
            <TrendingUp size={28} />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 mb-1">
            NxtWave
          </h1>
          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-1.5">
            <ShieldCheck size={14} /> Admin Portal
          </p>
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="admin@nxtwave.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all placeholder:text-slate-300 disabled:opacity-50"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all placeholder:text-slate-300 disabled:opacity-50"
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
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-sm uppercase tracking-widest py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Authenticating...
              </>
            ) : (
              "Access Admin Panel"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
