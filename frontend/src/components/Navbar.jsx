import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { TrendingUp, LogOut } from "lucide-react";

export default function Navbar() {
  const { student, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-2">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-blue-900 text-white p-1.5 rounded-lg">
            <TrendingUp size={16} />
          </div>
          <span className="font-black text-base tracking-tighter">NxtWave</span>
          <span className="text-slate-300 font-thin">|</span>
          <span className="text-slate-500 font-bold text-[10px] tracking-widest uppercase">
            Payments
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:block text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">
              Student
            </p>
            <p className="font-black text-slate-900 text-sm">{student?.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors font-bold text-[10px] uppercase tracking-widest border border-slate-200 cursor-pointer"
          >
            <LogOut size={12} /> Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
